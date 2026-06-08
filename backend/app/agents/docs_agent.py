import json
import time
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
from app.schemas.review import AgentResult, Finding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a documentation reviewer. Analyze the provided git diff for documentation issues.

Look specifically for:
- Public functions, classes, or methods missing docstrings/JSDoc comments
- Missing type hints on function signatures (Python)
- README not updated for new features, endpoints, or configuration options
- No CHANGELOG entry for user-facing changes
- Complex logic lacking inline explanation
- Deprecated functions not marked with deprecation notices
- New environment variables not documented
- API endpoint changes without OpenAPI/Swagger doc updates
- Module-level docstrings missing for new files

Return a JSON object with this exact structure:
{
  "findings": [
    {
      "line": <line number or null>,
      "file": "<filename or null>",
      "issue": "<clear description of missing documentation>",
      "severity": "<medium|low>",
      "suggestion": "<what documentation to add>"
    }
  ],
  "summary": "<1-2 sentence overall documentation assessment>"
}

If no issues found, return {"findings": [], "summary": "Documentation is well-maintained in this diff."}
Return ONLY valid JSON, no markdown, no explanation."""


async def run_docs_agent(diff: str, language: str) -> AgentResult:
    start = time.monotonic()
    settings = get_settings()

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=2048,
        )

        truncated = diff[:settings.max_diff_tokens * 4]

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Language: {language}\n\nDiff:\n```\n{truncated}\n```"),
        ]

        response = await llm.ainvoke(messages)
        raw = response.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        data = json.loads(raw)
        findings = [Finding(**f) for f in data.get("findings", [])]
        summary = data.get("summary", "")

        status = "pass"
        if findings:
            status = "warn"  # docs issues are always warnings, never fail

        return AgentResult(
            agent="docs",
            status=status,
            findings=findings,
            summary=summary,
            duration_ms=int((time.monotonic() - start) * 1000),
        )

    except Exception as e:
        logger.error(f"Docs agent error: {e}")
        return AgentResult(
            agent="docs",
            status="error",
            findings=[],
            summary=f"Agent failed: {e}",
            duration_ms=int((time.monotonic() - start) * 1000),
        )
