from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import APP_NAME, APP_VERSION, SCHEMA_VERSION

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": APP_VERSION,
        "schema_version": SCHEMA_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
    }
