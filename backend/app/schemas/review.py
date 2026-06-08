from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class Finding(BaseModel):
    line: Optional[int] = None
    file: Optional[str] = None
    issue: str
    severity: Literal["critical", "high", "medium", "low", "info"] = "medium"
    suggestion: str = ""


class AgentResult(BaseModel):
    agent: str
    status: Literal["pass", "warn", "fail", "error", "skipped"]
    findings: list[Finding] = []
    summary: str = ""
    duration_ms: int = 0


class PRReview(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    repo_full_name: str
    repo_id: int
    pr_number: int
    pr_title: str
    pr_author: str
    pr_url: str
    installation_id: int
    base_sha: str = ""
    head_sha: str = ""
    diff_size_bytes: int = 0
    language: str = "unknown"
    agent_results: list[AgentResult] = []
    final_comment: str = ""
    verdict: Literal["approve", "request_changes", "comment", "pending", "error"] = "pending"
    github_review_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    status: Literal["queued", "processing", "completed", "failed"] = "queued"
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class ReviewConfig(BaseModel):
    repo_id: int
    repo_full_name: str
    enabled: bool = True
    agents: dict[str, bool] = {
        "security": True,
        "performance": True,
        "coverage": True,
        "docs": True,
    }
    min_severity: Literal["critical", "high", "medium", "low", "info"] = "medium"
    auto_approve_on_pass: bool = False
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Installation(BaseModel):
    installation_id: int
    account_login: str
    account_type: str
    account_avatar_url: str = ""
    installed_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True


class User(BaseModel):
    github_id: int
    login: str
    email: Optional[str] = None
    avatar_url: str = ""
    access_token: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
