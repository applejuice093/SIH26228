"""Runtime configuration. Values can be overridden with CVTRUST_* environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

APP_NAME = "cv-trust-backend"
APP_VERSION = "0.1.0"
API_PREFIX = "/api/v1"
SCHEMA_VERSION = "1.0.0"
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _list(name: str, default: str, sep: str = ",") -> list[str]:
    return [x.strip() for x in os.environ.get(name, default).split(sep) if x.strip()]


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str] = field(default_factory=lambda: _list(
        "CVTRUST_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"))
    # SQLite file holding assets, assessments, evidence, findings, incidents and the audit chain.
    db_path: Path = field(default_factory=lambda: Path(os.environ.get("CVTRUST_DB", BACKEND_ROOT / "var" / "cvtrust.sqlite3")))
    # Only datasets under these directories may be registered (no arbitrary filesystem reads).
    data_roots: list[Path] = field(default_factory=lambda: [Path(p).resolve() for p in _list(
        "CVTRUST_DATA_ROOTS", str(BACKEND_ROOT / "testdata"), os.pathsep)])
    audit_key_path: Path = field(default_factory=lambda: Path(os.environ.get("CVTRUST_AUDIT_KEY", BACKEND_ROOT / "var" / "audit.key")))


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
