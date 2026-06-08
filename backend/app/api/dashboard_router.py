import time
from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query
from app.db.mongo import get_db
from app.api.auth_router import verify_dashboard_jwt, get_token_from_request
from bson import ObjectId

router = APIRouter(prefix="/dashboard")

# Simple in-memory sliding window rate limiter
_rate_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(key: str, max_req: int = 60, window: int = 60) -> None:
    now = time.time()
    _rate_store[key] = [t for t in _rate_store[key] if now - t < window]
    if len(_rate_store[key]) >= max_req:
        raise HTTPException(status_code=429, detail="Too many requests")
    _rate_store[key].append(now)


def _require_auth(request: Request) -> dict:
    token = get_token_from_request(request)
    return verify_dashboard_jwt(token)


def _serialize(doc: dict) -> dict:
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for key in ("created_at", "completed_at", "updated_at"):
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat() + "Z"
    return doc


@router.get("/repos")
async def list_repos(request: Request):
    user = _require_auth(request)
    _check_rate_limit(f"repos:{user['sub']}", max_req=30, window=60)
    db = get_db()
    installations = await db.installations.find({"active": True}).to_list(100)

    repos = []
    for inst in installations:
        count = await db.reviews.count_documents({"installation_id": inst["installation_id"]})
        recent = await db.reviews.find(
            {"installation_id": inst["installation_id"]},
            {"repo_full_name": 1, "repo_id": 1},
        ).sort("created_at", -1).limit(20).to_list(20)

        seen_repos: set[int] = set()
        for r in recent:
            rid = r.get("repo_id")
            if rid and rid not in seen_repos:
                seen_repos.add(rid)
                repos.append({
                    "repo_id": rid,
                    "repo_full_name": r.get("repo_full_name", ""),
                    "installation_id": inst["installation_id"],
                    "account_login": inst.get("account_login", ""),
                    "account_avatar_url": inst.get("account_avatar_url", ""),
                    "review_count": count,
                })
    return {"repos": repos}


@router.get("/reviews")
async def list_reviews(
    request: Request,
    repo_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    user = _require_auth(request)
    _check_rate_limit(f"reviews:{user['sub']}", max_req=60, window=60)
    db = get_db()

    query: dict = {}
    if repo_id:
        query["repo_id"] = repo_id

    skip = (page - 1) * per_page
    cursor = db.reviews.find(
        query,
        {
            "repo_full_name": 1, "repo_id": 1, "pr_number": 1,
            "pr_title": 1, "pr_author": 1, "pr_url": 1,
            "verdict": 1, "status": 1, "language": 1,
            "created_at": 1, "completed_at": 1,
        },
    ).sort("created_at", -1).skip(skip).limit(per_page)

    reviews = [_serialize(r) async for r in cursor]
    total = await db.reviews.count_documents(query)
    return {"reviews": reviews, "total": total, "page": page, "per_page": per_page}


@router.get("/reviews/{review_id}")
async def get_review(review_id: str, request: Request):
    user = _require_auth(request)
    _check_rate_limit(f"review:{user['sub']}", max_req=60, window=60)
    db = get_db()

    try:
        oid = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")

    doc = await db.reviews.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Review not found")
    return _serialize(doc)


@router.get("/stats")
async def get_stats(request: Request):
    user = _require_auth(request)
    _check_rate_limit(f"stats:{user['sub']}", max_req=20, window=60)
    db = get_db()

    total = await db.reviews.count_documents({})
    completed = await db.reviews.count_documents({"status": "completed"})
    verdicts = await db.reviews.aggregate([
        {"$group": {"_id": "$verdict", "count": {"$sum": 1}}}
    ]).to_list(10)

    return {
        "total_reviews": total,
        "completed_reviews": completed,
        "verdicts": {v["_id"]: v["count"] for v in verdicts},
    }
