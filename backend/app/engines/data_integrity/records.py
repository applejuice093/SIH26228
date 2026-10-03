"""Helpers for deterministic evidence IDs and timestamps."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def stable_id(prefix: str, *parts: str) -> str:
    """Opaque but reproducible ID: same detector + inputs -> same ID."""
    return f"{prefix}-" + hashlib.sha256("|".join(parts).encode()).hexdigest()[:12].upper()
