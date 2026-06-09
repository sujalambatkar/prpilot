import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.db.mongo import connect_db, close_db, ensure_indexes
from app.github.webhook import router as webhook_router
from app.api.auth_router import router as auth_router
from app.api.dashboard_router import router as dashboard_router
from app.api.config_router import router as config_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to MongoDB...")
    await connect_db()
    await ensure_indexes()
    logger.info("PRPilot backend ready")
    yield
    logger.info("Shutting down...")
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()

    # Hide docs in production
    docs_url = "/docs" if settings.debug else None
    redoc_url = "/redoc" if settings.debug else None

    app = FastAPI(
        title="PRPilot",
        description="AI-powered pull request review agent",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # CORS — strip trailing slashes to avoid mismatch with browser Origin header
    origins: set[str] = {"http://localhost:3000", "http://localhost:3001"}
    origins.add(settings.frontend_url.rstrip("/"))
    if settings.extra_allowed_origins:
        for o in settings.extra_allowed_origins.split(","):
            o = o.strip().rstrip("/")
            if o:
                origins.add(o)
    allowed_origins = list(origins)
    logger.info("CORS allowed origins: %s", allowed_origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Hub-Signature-256", "X-GitHub-Event"],
    )

    # Security headers on every response
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Never expose server info
        if "server" in response.headers:
            del response.headers["server"]
        return response

    app.include_router(webhook_router)
    app.include_router(auth_router)
    app.include_router(dashboard_router)
    app.include_router(config_router)

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "prpilot"}

    return app


app = create_app()
