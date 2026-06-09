import secrets
import time
import httpx
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from app.config import get_settings
from app.db.mongo import get_db

router = APIRouter(prefix="/auth")

_state_store: dict[str, float] = {}
_STATE_TTL = 600


def _purge_expired_states() -> None:
    now = time.time()
    expired = [k for k, t in _state_store.items() if now - t > _STATE_TTL]
    for k in expired:
        del _state_store[k]


def create_dashboard_jwt(user: dict) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user["github_id"]),
        "login": user["login"],
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_dashboard_jwt(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_token_from_request(request: Request) -> str:
    # Prefer httpOnly cookie
    token = request.cookies.get("prpilot_token")
    if token:
        return token
    # Fall back to Authorization header (for API clients)
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.get("/github")
async def github_oauth_start():
    settings = get_settings()
    if not settings.github_client_id or settings.github_client_id == "your_oauth_client_id":
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    _purge_expired_states()
    state = secrets.token_urlsafe(32)
    _state_store[state] = time.time()
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}"
        "&scope=read:user,user:email"
        f"&state={state}"
    )
    return RedirectResponse(url)


@router.get("/callback")
async def github_oauth_callback(code: str, state: str):
    settings = get_settings()

    _purge_expired_states()
    if state not in _state_store:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    del _state_store[state]

    if not code or len(code) > 256 or not all(c.isalnum() or c in "-_" for c in code):
        raise HTTPException(status_code=400, detail="Invalid OAuth code")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="OAuth failed — no access token returned")

        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

    db = get_db()
    user_doc = {
        "github_id": gh_user["id"],
        "login": gh_user["login"],
        "email": gh_user.get("email"),
        "avatar_url": gh_user.get("avatar_url", ""),
        "access_token": access_token,
    }
    await db.users.update_one({"github_id": gh_user["id"]}, {"$set": user_doc}, upsert=True)

    jwt_token = create_dashboard_jwt(user_doc)
    safe_frontend = settings.frontend_url.rstrip("/")

    # Set httpOnly cookie — token never exposed in URL or JS
    response = RedirectResponse(f"{safe_frontend}/dashboard")
    response.set_cookie(
        key="prpilot_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="none",  # required for cross-origin (Vercel → Render)
        max_age=7 * 24 * 60 * 60,
        path="/",
    )
    return response


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("prpilot_token", path="/", samesite="none", secure=True)
    return {"ok": True}


@router.get("/me")
async def get_current_user(request: Request):
    token = get_token_from_request(request)
    payload = verify_dashboard_jwt(token)
    return {"github_id": payload["sub"], "login": payload["login"]}
