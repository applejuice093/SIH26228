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
    return load()["detectors"][name]["thresholds"]
