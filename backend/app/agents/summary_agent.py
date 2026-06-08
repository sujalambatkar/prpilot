import time
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
from app.schemas.review import AgentResult, Finding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior software engineer writing a final pull request review summary.

You will receive a structured list of findings from multiple analysis agents.
Write a concise, helpful summary paragraph (3-5 sentences) that:
1. Acknowledges what the PR is doing (based on the findings context)
2. Highlights the most critical issues that MUST be fixed
3. Notes any warnings worth addressing
4. Ends with a clear recommendation

Be direct and constructive. Developers appreciate specificity over vague warnings.
Do not repeat every finding — just synthesize the key points.
Write in second person ("This PR..." or "The changes...").
Return ONLY the summary paragraph, no headers, no bullets."""


def _count_by_severity(findings: list[Finding]) -> dict:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    return counts


def determine_verdict(agent_results: list[AgentResult]) -> str:
    all_findings = [f for r in agent_results for f in r.findings]
    counts = _count_by_severity(all_findings)

    has_errors = any(r.status == "error" for r in agent_results)
    if has_errors and not all_findings:
        return "comment"

    if counts["critical"] > 0 or counts["high"] > 0:
        return "request_changes"
    elif counts["medium"] > 0 or any(r.status in ("warn", "fail") for r in agent_results):
        return "comment"
    else:
        return "approve"


def _build_findings_text(agent_results: list[AgentResult]) -> str:
    lines = []
    for result in agent_results:
        if result.findings:
            lines.append(f"\n{result.agent.upper()} AGENT ({result.status.upper()}):")
            for f in result.findings:
                loc = f"line {f.line}" if f.line else f.file or "unknown location"
                lines.append(f"  [{f.severity.upper()}] {f.issue} — {loc}")
                if f.suggestion:
                    lines.append(f"    Fix: {f.suggestion}")
    return "\n".join(lines) if lines else "No issues found across all agents."


async def run_summary_agent(agent_results: list[AgentResult], language: str) -> tuple[str, str]:
    """Returns (summary_text, verdict)"""
    start = time.monotonic()
    settings = get_settings()
    verdict = determine_verdict(agent_results)

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=512,
        )

        findings_text = _build_findings_text(agent_results)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Language: {language}\n\nFindings:\n{findings_text}"),
        ]

        response = await llm.ainvoke(messages)
        summary = response.content.strip()

    except Exception as e:
        logger.error(f"Summary agent error: {e}")
        all_findings = [f for r in agent_results for f in r.findings]
        if all_findings:
            summary = f"Found {len(all_findings)} issue(s) across {sum(1 for r in agent_results if r.findings)} agent(s). See findings below."
        else:
            summary = "All analysis agents completed. No significant issues found."

    return summary, verdict


def build_github_comment(agent_results: list[AgentResult], summary: str, verdict: str) -> str:
    verdict_map = {
        "approve": "Approved",
        "request_changes": "Changes Requested",
        "comment": "Review Comment",
    }
    verdict_label = verdict_map.get(verdict, "Review Comment")

    status_icon = {"pass": "pass", "warn": "warn", "fail": "fail", "error": "error", "skipped": "skipped"}
    agent_meta = {
        "security": "Security",
        "performance": "Performance",
        "coverage": "Test Coverage",
        "docs": "Documentation",
    }

    # Table rows
    table_rows = []
    for result in agent_results:
        label = agent_meta.get(result.agent, result.agent.title())
        status = status_icon.get(result.status, result.status)
        count = len(result.findings)
        if count == 0:
            findings_cell = "No issues"
        elif count == 1:
            f = result.findings[0]
            loc = f" (line {f.line})" if f.line else ""
            findings_cell = f"{f.issue[:60]}{loc}"
        else:
            top = result.findings[0]
            loc = f" (line {top.line})" if top.line else ""
            findings_cell = f"{top.issue[:50]}{loc} + {count - 1} more"
        table_rows.append(f"| {label} | {status} — {count} issue{'s' if count != 1 else ''} | {findings_cell} |")

    table = "\n".join(table_rows)

    # Detail sections
    detail_sections = []
    severity_labels = {
        "critical": "**[CRITICAL]**",
        "high": "**[HIGH]**",
        "medium": "**[MEDIUM]**",
        "low": "**[LOW]**",
        "info": "**[INFO]**",
    }

    for result in agent_results:
        if not result.findings:
            continue
        label = agent_meta.get(result.agent, result.agent.title())
        section_lines = [f"\n### {label} Issues\n"]
        for f in result.findings:
            sev = severity_labels.get(f.severity, f"**[{f.severity.upper()}]**")
            loc_parts = []
            if f.file:
                loc_parts.append(f"`{f.file}`")
            if f.line:
                loc_parts.append(f"line {f.line}")
            loc = " — " + ", ".join(loc_parts) if loc_parts else ""
            section_lines.append(f"{sev} {f.issue}{loc}")
            if f.suggestion:
                section_lines.append(f"> Suggestion: {f.suggestion}")
            section_lines.append("")
        detail_sections.append("\n".join(section_lines))

    details_block = "\n".join(detail_sections)

    return f"""## PRPilot Review

**Verdict:** {verdict_label}

| Agent | Status | Findings |
|-------|--------|----------|
{table}

### Summary
{summary}
{details_block}
---
<sub>Generated by [PRPilot](https://github.com/apps/prpilot) · Powered by Groq llama-3.3-70b</sub>"""
