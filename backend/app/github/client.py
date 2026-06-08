import httpx
from app.github.app_auth import get_installation_token
from app.config import get_settings

GITHUB_API = "https://api.github.com"


async def _headers(installation_id: int) -> dict:
    token = await get_installation_token(installation_id)
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def get_pr_diff(installation_id: int, owner: str, repo: str, pr_number: int) -> str:
    headers = await _headers(installation_id)
    headers["Accept"] = "application/vnd.github.v3.diff"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}",
            headers=headers,
        )
        resp.raise_for_status()
        return resp.content.decode("utf-8", errors="replace")


async def get_pr_files(installation_id: int, owner: str, repo: str, pr_number: int) -> list[dict]:
    headers = await _headers(installation_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/files",
            headers=headers,
            params={"per_page": 100},
        )
        resp.raise_for_status()
        return resp.json()


async def get_pr_details(installation_id: int, owner: str, repo: str, pr_number: int) -> dict:
    headers = await _headers(installation_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}",
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()


async def post_pr_review(
    installation_id: int,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
    event: str,  # "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
    commit_id: str,
) -> dict:
    headers = await _headers(installation_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
            headers=headers,
            json={
                "commit_id": commit_id,
                "body": body,
                "event": event,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def get_repo_details(installation_id: int, owner: str, repo: str) -> dict:
    headers = await _headers(installation_id)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}",
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()
