from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    # Verify connection
    await _client.admin.command("ping")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


def get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _client["prpilot"]


async def ensure_indexes() -> None:
    db = get_db()
    await db.reviews.create_index([("repo_id", 1), ("pr_number", 1)])
    await db.reviews.create_index([("repo_full_name", 1), ("created_at", -1)])
    await db.reviews.create_index([("status", 1)])
    await db.installations.create_index([("installation_id", 1)], unique=True)
    await db.repo_configs.create_index([("repo_id", 1)], unique=True)
    await db.users.create_index([("github_id", 1)], unique=True)
