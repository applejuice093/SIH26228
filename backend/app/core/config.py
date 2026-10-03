"""Runtime configuration. Values can be overridden with CVTRUST_* environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

APP_NAME = "cv-trust-backend"
APP_VERSION = "0.1.0"
API_PREFIX = "/api/v1"
SCHEMA_VERSION = "1.0.0"


def _origins() -> list[str]:
    raw = os.environ.get("CVTRUST_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str] = field(default_factory=_origins)


settings = Settings()
