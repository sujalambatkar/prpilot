import json
import time
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
from app.schemas.review import AgentResult, Finding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a performance code reviewer. Analyze the provided git diff for performance issues.

Look specifically for:
- O(n²) or worse algorithmic complexity in loops
- N+1 database query patterns (queries inside loops)
- Missing database indexes on filtered/sorted fields
- Unnecessary re-renders in React (missing useMemo, useCallback, React.memo)
- Synchronous I/O in async context (blocking calls in async functions)
- Large bundle imports (importing entire library instead of named exports)
- Memory leaks (event listeners not removed, circular references, unclosed connections)
- Inefficient data structure choices
- Redundant computations that could be cached
- Large payload sizes (fetching more data than needed)

Return a JSON object with this exact structure:
{
  "findings": [
    {
      "line": <line number or null>,
      "file": "<filename or null>",
      "issue": "<clear description of the issue>",
      "severity": "<high|medium|low>",
      "suggestion": "<specific optimization recommendation>"
    }
  ],
  "summary": "<1-2 sentence overall performance assessment>"
}

If no issues found, return {"findings": [], "summary": "No performance issues detected in this diff."}
Return ONLY valid JSON, no markdown, no explanation."""


async def run_performance_agent(diff: str, language: str) -> AgentResult:
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
        if any(f.severity == "high" for f in findings):
            status = "fail"
        elif findings:
            status = "warn"

        return AgentResult(
            agent="performance",
            status=status,
            findings=findings,
            summary=summary,
            duration_ms=int((time.monotonic() - start) * 1000),
        )

    except Exception as e:
        logger.error(f"Performance agent error: {e}")
        return AgentResult(
            agent="performance",
            status="error",
            findings=[],
            summary=f"Agent failed: {e}",
            duration_ms=int((time.monotonic() - start) * 1000),
        )
