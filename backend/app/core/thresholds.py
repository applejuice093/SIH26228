"""Frozen detector thresholds (config/thresholds.json), chosen on the TUNING split only."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

PATH = Path(__file__).resolve().parents[2] / "config" / "thresholds.json"


@lru_cache
def load() -> dict:
    return json.loads(PATH.read_text())


def for_detector(name: str) -> dict:
    """Frozen thresholds for ``name``; a clear KeyError if the config lacks them.

    A bare ``KeyError: 'thresholds'`` from a hand-edited config.json used to
    surface as an opaque ASSESSMENT_FAILED message.
    """
    detectors = load().get("detectors") or {}
    if name not in detectors:
        raise KeyError(f"detector {name!r} missing from {PATH.name} (have: {sorted(detectors)})")
    cfg = detectors[name]
    if not isinstance(cfg.get("thresholds"), dict):
        raise KeyError(f"detector {name!r} in {PATH.name} has no 'thresholds' mapping")
    return cfg["thresholds"]
