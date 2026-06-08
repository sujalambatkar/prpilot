from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Literal
from app.db.mongo import get_db
from app.api.auth_router import verify_dashboard_jwt
from datetime import datetime

router = APIRouter(prefix="/repos")


def _require_auth(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return verify_dashboard_jwt(auth[7:])


class UpdateConfigRequest(BaseModel):
    enabled: bool = True
    agents: dict[str, bool] = {
        "security": True,
        "performance": True,
        "coverage": True,
        "docs": True,
    }
    min_severity: Literal["critical", "high", "medium", "low", "info"] = "medium"
    auto_approve_on_pass: bool = False


@router.get("/{repo_id}/config")
async def get_repo_config(repo_id: int, request: Request):
    _require_auth(request)
    db = get_db()
    doc = await db.repo_configs.find_one({"repo_id": repo_id})
    if not doc:
        # Return defaults
        return {
            "repo_id": repo_id,
            "enabled": True,
            "agents": {"security": True, "performance": True, "coverage": True, "docs": True},
            "min_severity": "medium",
            "auto_approve_on_pass": False,
        }
    doc.pop("_id", None)
    return doc


@router.post("/{repo_id}/config")
async def update_repo_config(repo_id: int, body: UpdateConfigRequest, request: Request):
    _require_auth(request)
    db = get_db()

    # Get repo full name from reviews
    sample = await db.reviews.find_one({"repo_id": repo_id})
    repo_full_name = sample["repo_full_name"] if sample else ""

    doc = {
        "repo_id": repo_id,
        "repo_full_name": repo_full_name,
        "enabled": body.enabled,
        "agents": body.agents,
        "min_severity": body.min_severity,
        "auto_approve_on_pass": body.auto_approve_on_pass,
        "updated_at": datetime.utcnow(),
    }
    await db.repo_configs.update_one(
        {"repo_id": repo_id},
        {"$set": doc},
        upsert=True,
    )
    return doc
