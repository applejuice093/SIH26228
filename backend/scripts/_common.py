"""Shared helpers for tuning/evaluation scripts."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
DATA = ROOT / "testdata"
CONFIG = ROOT / "config" / "thresholds.json"
RESULTS = ROOT / "results" / "data_integrity_eval.json"


def ground_truth(split: str) -> dict:
    return json.loads((DATA / split / "ground_truth.json").read_text())


def sha256_file(p: Path) -> str:
    return "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest()


def read_json(p: Path, default):
    return json.loads(p.read_text()) if p.exists() else default


def write_json(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2, sort_keys=False) + "\n")


def best_threshold(pos: list[float], neg: list[float]) -> float:
    """Threshold (flag if score >= t) maximising F1 on the given scores; ties -> widest gap midpoint."""
    vals = sorted(set(pos) | set(neg))
    cands = [(a + b) / 2 for a, b in zip(vals, vals[1:])] + [vals[-1] + 1e-9]
    best = None
    for t in cands:
        tp = sum(v >= t for v in pos)
        fp = sum(v >= t for v in neg)
        f1 = 2 * tp / (2 * tp + fp + (len(pos) - tp)) if pos else 0.0
        lo = max([v for v in pos + neg if v < t], default=t)
        hi = min([v for v in pos + neg if v >= t], default=t)
        key = (f1, hi - lo)
        if best is None or key > best[0]:
            best = (key, t)
    return round(best[1], 4)
