import asyncio
import logging
from datetime import datetime
from typing import TypedDict, Annotated
from bson import ObjectId

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from app.config import get_settings
from app.db.mongo import get_db
from app.github.client import get_pr_diff, get_pr_files, post_pr_review
from app.agents.security_agent import run_security_agent
from app.agents.performance_agent import run_performance_agent
from app.agents.coverage_agent import run_coverage_agent
from app.agents.docs_agent import run_docs_agent
from app.agents.summary_agent import run_summary_agent, build_github_comment
from app.schemas.review import AgentResult

logger = logging.getLogger(__name__)

LANGUAGE_MAP = {
    "py": "Python", "js": "JavaScript", "ts": "TypeScript",
    "tsx": "TypeScript/React", "jsx": "JavaScript/React",
    "go": "Go", "java": "Java", "rb": "Ruby", "rs": "Rust",
    "cpp": "C++", "c": "C", "cs": "C#", "php": "PHP",
    "swift": "Swift", "kt": "Kotlin", "scala": "Scala",
}


class PipelineState(TypedDict):
    review_id: str
    repo_full_name: str
    repo_id: int
    pr_number: int
    installation_id: int
    head_sha: str
    diff: str
    files_changed: list[str]
    language: str
    agent_results: list[dict]
    final_comment: str
    verdict: str
    status: str
    error: str


def _detect_language(files: list[str]) -> str:
    ext_count: dict[str, int] = {}
    for f in files:
        if "." in f:
            ext = f.rsplit(".", 1)[-1].lower()
            ext_count[ext] = ext_count.get(ext, 0) + 1
    if not ext_count:
        return "unknown"
    dominant_ext = max(ext_count, key=lambda k: ext_count[k])
    return LANGUAGE_MAP.get(dominant_ext, dominant_ext.upper())


async def _update_review(review_id: str, update: dict) -> None:
    try:
        db = get_db()
        await db.reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update},
        )
    except Exception as e:
        logger.error(f"Failed to update review {review_id}: {e}")


async def run_pipeline(review_id: str, review_doc: dict) -> None:
    logger.info(f"Starting pipeline for review {review_id}")
    await _update_review(review_id, {"status": "processing"})

    try:
        settings = get_settings()
        installation_id = review_doc["installation_id"]
        repo_full_name = review_doc["repo_full_name"]
        owner, repo = repo_full_name.split("/", 1)
        pr_number = review_doc["pr_number"]
        head_sha = review_doc["head_sha"]

        # Check repo config for enabled agents
        db = get_db()
        config = await db.repo_configs.find_one({"repo_full_name": repo_full_name})
        enabled_agents = {"security", "performance", "coverage", "docs"}
        if config:
            agents_cfg = config.get("agents", {})
            enabled_agents = {k for k, v in agents_cfg.items() if v}
            if not config.get("enabled", True):
                logger.info(f"PRPilot disabled for {repo_full_name}, skipping")
                await _update_review(review_id, {"status": "skipped"})
                return

        # Fetch diff
        diff = await get_pr_diff(installation_id, owner, repo, pr_number)
        files_data = await get_pr_files(installation_id, owner, repo, pr_number)
        file_names = [f["filename"] for f in files_data]
        language = _detect_language(file_names)

        await _update_review(review_id, {
            "diff_size_bytes": len(diff.encode()),
            "language": language,
            "files_changed": file_names,
        })

        # Run 4 analysis agents in parallel
        tasks = []
        agent_names = []

        if "security" in enabled_agents:
            tasks.append(run_security_agent(diff, language))
            agent_names.append("security")
        if "performance" in enabled_agents:
            tasks.append(run_performance_agent(diff, language))
            agent_names.append("performance")
        if "coverage" in enabled_agents:
            tasks.append(run_coverage_agent(diff, language))
            agent_names.append("coverage")
        if "docs" in enabled_agents:
            tasks.append(run_docs_agent(diff, language))
            agent_names.append("docs")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        agent_results: list[AgentResult] = []
        for name, result in zip(agent_names, results):
            if isinstance(result, Exception):
                logger.error(f"Agent {name} raised: {result}")
                agent_results.append(AgentResult(
                    agent=name,
                    status="error",
                    findings=[],
                    summary=f"Agent crashed: {result}",
                ))
            else:
                agent_results.append(result)

        # Summary and verdict
        summary, verdict = await run_summary_agent(agent_results, language)
        final_comment = build_github_comment(agent_results, summary, verdict)

        # Map verdict to GitHub review event
        event_map = {
            "approve": "APPROVE",
            "request_changes": "REQUEST_CHANGES",
            "comment": "COMMENT",
        }
        github_event = event_map.get(verdict, "COMMENT")

        # Post review to GitHub
        try:
            review_resp = await post_pr_review(
                installation_id, owner, repo, pr_number,
                body=final_comment,
                event=github_event,
                commit_id=head_sha,
            )
            github_review_id = review_resp.get("id")
        except Exception as e:
            logger.error(f"Failed to post GitHub review: {e}")
            github_review_id = None

        # Serialize agent results for MongoDB
        serialized_results = [r.model_dump() for r in agent_results]

        await _update_review(review_id, {
            "status": "completed",
            "agent_results": serialized_results,
            "final_comment": final_comment,
            "verdict": verdict,
            "github_review_id": github_review_id,
            "completed_at": datetime.utcnow(),
        })

        logger.info(f"Pipeline completed for review {review_id}: verdict={verdict}")

    except Exception as e:
        logger.exception(f"Pipeline failed for review {review_id}: {e}")
        await _update_review(review_id, {
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.utcnow(),
        })
