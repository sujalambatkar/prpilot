import base64
import time
import jwt
import httpx
from app.config import get_settings

GITHUB_API = "https://api.github.com"


def _load_private_key() -> str:
    settings = get_settings()
    raw = settings.github_private_key.strip()
    # Raw PEM content
    if raw.startswith("-----BEGIN"):
        return raw
    # File path to .pem
    import os
    if os.path.exists(raw):
        with open(raw, "r") as f:
            return f.read()
    # Base64-encoded PEM
    decoded = base64.b64decode(raw + "==").decode("latin-1")
    if decoded.startswith("-----BEGIN"):
        return decoded
    raise ValueError(
        "GITHUB_PRIVATE_KEY must be a raw PEM string, a path to a .pem file, "
        "or a base64-encoded PEM. Current value does not match any format."
    )


def generate_jwt() -> str:
    settings = get_settings()
    private_key = _load_private_key()
    now = int(time.time())
    payload = {
        "iat": now - 60,  # issued 60s ago to account for clock skew
        "exp": now + (10 * 60),  # 10 minute expiry
        "iss": settings.github_app_id,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


async def get_installation_token(installation_id: int) -> str:
    app_jwt = generate_jwt()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()["token"]


async def get_app_installations() -> list[dict]:
    app_jwt = generate_jwt()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/app/installations",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        resp.raise_for_status()
        return resp.json()
