import json
import time
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
from app.schemas.review import AgentResult, Finding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a test coverage reviewer. Analyze the provided git diff for missing or inadequate tests.

Look specifically for:
- New functions, methods, or classes added without corresponding tests
- Edge cases not covered: null/None inputs, empty lists/strings, boundary values (0, -1, max int)
- Missing error case tests (what happens when an exception is thrown?)
- Missing integration tests for new API endpoints
- Hardcoded test data that should be parameterized
- Tests that only cover the happy path
- Missing teardown/cleanup in test setup
- New configuration options without tests for invalid values

Return a JSON object with this exact structure:
{
  "findings": [
    {
      "line": <line number or null>,
      "file": "<filename or null>",
      "issue": "<clear description of missing test or coverage gap>",
      "severity": "<high|medium|low>",
      "suggestion": "<specific test case to add>"
    }
  ],
  "summary": "<1-2 sentence overall test coverage assessment>"
}

If no issues found, return {"findings": [], "summary": "Test coverage looks adequate for the changes in this diff."}
Return ONLY valid JSON, no markdown, no explanation."""


async def run_coverage_agent(diff: str, language: str) -> AgentResult:
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
            agent="coverage",
            status=status,
            findings=findings,
            summary=summary,
            duration_ms=int((time.monotonic() - start) * 1000),
        )

    except Exception as e:
        logger.error(f"Coverage agent error: {e}")
        return AgentResult(
            agent="coverage",
            status="error",
            findings=[],
            summary=f"Agent failed: {e}",
            duration_ms=int((time.monotonic() - start) * 1000),
        )
