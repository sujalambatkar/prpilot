import hashlib
import hmac
import json
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from app.config import get_settings
from app.db.mongo import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_WEBHOOK_SIZE = 25 * 1024 * 1024  # 25MB


def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


async def _is_duplicate(event_key: str) -> bool:
    settings = get_settings()
    if not settings.upstash_redis_rest_url or settings.upstash_redis_rest_url == "https://your-db.upstash.io":
        return False
    try:
        from upstash_redis import Redis
        redis = Redis(
            url=settings.upstash_redis_rest_url,
            token=settings.upstash_redis_rest_token,
        )
        result = await asyncio.to_thread(redis.set, event_key, "1", nx=True, ex=settings.webhook_dedup_ttl)
        return result is None
    except Exception as e:
        logger.warning(f"Redis dedup check failed: {e}")
        return False


async def _upsert_installation(installation_id: int, account: dict) -> None:
    try:
        db = get_db()
        await db.installations.update_one(
            {"installation_id": installation_id},
            {"$set": {
                "installation_id": installation_id,
                "account_login": account.get("login", ""),
                "account_type": account.get("type", "User"),
                "account_avatar_url": account.get("avatar_url", ""),
                "active": True,
            }},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Failed to upsert installation {installation_id}: {e}")


async def handle_pull_request_event(payload: dict) -> None:
    from app.agents.orchestrator import run_pipeline
    action = payload.get("action")
    if action not in ("opened", "synchronize", "reopened"):
        return

    pr = payload["pull_request"]
    repo = payload["repository"]
    installation_id = payload["installation"]["id"]

    # Seed installation record so it shows in the dashboard sidebar
    await _upsert_installation(installation_id, repo.get("owner", {}))

    event_key = f"pr_review:{repo['id']}:{pr['number']}:{pr['head']['sha']}"
    if await _is_duplicate(event_key):
        logger.info(f"Duplicate webhook for {event_key}, skipping")
        return

    db = get_db()
    now = datetime.utcnow()
    review_doc = {
        "repo_full_name": repo["full_name"],
        "repo_id": repo["id"],
        "pr_number": pr["number"],
        "pr_title": pr["title"],
        "pr_author": pr["user"]["login"],
        "pr_url": pr["html_url"],
        "installation_id": installation_id,
        "head_sha": pr["head"]["sha"],
        "base_sha": pr["base"]["sha"],
        "status": "queued",
        "agent_results": [],
        "final_comment": "",
        "verdict": "pending",
        "created_at": now,
        "completed_at": None,
        "error": None,
    }
    result = await db.reviews.insert_one(review_doc)
    review_id = str(result.inserted_id)

    asyncio.create_task(run_pipeline(review_id, review_doc))


async def handle_installation_event(payload: dict) -> None:
    db = get_db()
    action = payload.get("action")
    installation = payload.get("installation", {})
    installation_id = installation.get("id")
    account = installation.get("account", {})

    if action in ("created", "added"):
        await _upsert_installation(installation_id, account)
    elif action in ("deleted", "removed"):
        await db.installations.update_one(
            {"installation_id": installation_id},
            {"$set": {"active": False}},
        )


@router.post("/webhook/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    settings = get_settings()

    # Enforce payload size limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_WEBHOOK_SIZE:
        raise HTTPException(status_code=413, detail="Payload too large")

    body = await request.body()

    if len(body) > MAX_WEBHOOK_SIZE:
        raise HTTPException(status_code=413, detail="Payload too large")

    signature = request.headers.get("X-Hub-Signature-256", "")
    if not verify_signature(body, signature, settings.github_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info(f"Received GitHub event: {event}, action: {payload.get('action')}")

    if event == "pull_request":
        background_tasks.add_task(handle_pull_request_event, payload)
    elif event == "installation":
        background_tasks.add_task(handle_installation_event, payload)
    elif event == "ping":
        return {"ok": True, "message": "PRPilot webhook connected"}

    return {"ok": True, "event": event}
