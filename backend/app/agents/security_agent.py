import json
import time
import logging
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import get_settings
from app.schemas.review import AgentResult, Finding

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a security code reviewer. Analyze the provided git diff for security vulnerabilities.

Look specifically for:
- Hardcoded API keys, passwords, tokens, or secrets
- SQL injection vulnerabilities (string concatenation in queries)
- XSS vulnerabilities (unescaped user input in HTML/JS)
- Insecure direct object references (IDOR)
- Command injection (subprocess with user input)
- Path traversal vulnerabilities
- Insecure deserialization
- Missing authentication/authorization checks
- Use of deprecated/insecure cryptographic functions
- SSRF vulnerabilities

Return a JSON object with this exact structure:
{
  "findings": [
    {
      "line": <line number or null>,
      "file": "<filename or null>",
      "issue": "<clear description of the issue>",
      "severity": "<critical|high|medium|low>",
      "suggestion": "<specific fix recommendation>"
    }
  ],
  "summary": "<1-2 sentence overall security assessment>"
}

If no issues found, return {"findings": [], "summary": "No security issues detected in this diff."}
Return ONLY valid JSON, no markdown, no explanation."""


async def run_security_agent(diff: str, language: str) -> AgentResult:
    start = time.monotonic()
    settings = get_settings()

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=2048,
        )

        # Truncate diff to token limit
        truncated = diff[:settings.max_diff_tokens * 4]  # rough char estimate

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"Language: {language}\n\nDiff:\n```\n{truncated}\n```"),
        ]

        response = await llm.ainvoke(messages)
        raw = response.content.strip()

        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        data = json.loads(raw)
        findings = [Finding(**f) for f in data.get("findings", [])]
        summary = data.get("summary", "")

        status = "pass"
        if any(f.severity in ("critical", "high") for f in findings):
            status = "fail"
        elif findings:
            status = "warn"

        return AgentResult(
            agent="security",
            status=status,
            findings=findings,
            summary=summary,
            duration_ms=int((time.monotonic() - start) * 1000),
        )

    except Exception as e:
        logger.error(f"Security agent error: {e}")
        return AgentResult(
            agent="security",
            status="error",
            findings=[],
            summary=f"Agent failed: {e}",
            duration_ms=int((time.monotonic() - start) * 1000),
        )
