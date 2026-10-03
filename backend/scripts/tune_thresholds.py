#!/usr/bin/env python3
"""Choose detector thresholds on the TUNING split ONLY and freeze them in config/thresholds.json.

This script never reads the TEST split.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone

from _common import CONFIG, DATA, ground_truth, read_json, sha256_file, best_threshold, write_json

from app.engines.data_integrity import label_flip, patch_trigger
from app.engines.data_integrity.dataset import load_yolo

SPLIT = "tuning"


def tune_patch() -> dict:
    gt = ground_truth(SPLIT)
    planted = {r["image"] for r in gt["images"] if r["plant"] == "corner_patch"}
    scores, _ = patch_trigger.score_dataset(load_yolo(DATA / SPLIT / "dataset"))
    pos_a = [s.synthetic_colour for s in scores if s.sample_id in planted]
    neg_a = [s.synthetic_colour for s in scores if s.sample_id not in planted]
    t_a = best_threshold(pos_a, neg_a)
    # Cue B is a fallback: set it 10% above the highest score of any non-patched TUNING image so it adds
    # no false flags on TUNING.
    t_b = round(1.10 * max(s.outlier_z for s in scores if s.sample_id not in planted), 3)
    return {
        "detector_version": patch_trigger.VERSION,
        "thresholds": {"synthetic_colour_min": t_a, "outlier_z_min": t_b},
        "selection": {
            "synthetic_colour_min": "F1-maximising cut on TUNING (ties broken by widest gap, midpoint)",
            "outlier_z_min": "1.10 x max score among non-patched TUNING images",
        },
        "tuning_observations": {
            "planted": len(pos_a), "non_planted": len(neg_a),
            "synthetic_colour_planted_min": round(min(pos_a), 4), "synthetic_colour_non_planted_max": round(max(neg_a), 4),
        },
    }


def tune_flip() -> dict:
    gt = ground_truth(SPLIT)
    planted = {(r["image"], f["line"]) for r in gt["images"] for f in r.get("flips", [])}
    # Hyperparameters picked on TUNING by a small grid (crop px x context in {(64,1.5),(96,1.5),(96,1.2),(128,1.3)},
    # geometry weight in {0,0.15,0.3,0.5}, k in {10,20}) maximising average precision of the self-confidence ratio.
    params = label_flip.FlipParams(min_side_px=12.0, crop_px=96, context=1.2, geometry_weight=0.3, k=20)
    scores, batch = label_flip.score_dataset(load_yolo(DATA / SPLIT / "dataset"), params)
    # Only boxes whose neighbourhood confidently supports another class can be flagged.
    sc = lambda s: -s.ratio if s.other_confident else -1e9  # noqa: E731
    pos = [sc(s) for s in scores if (s.sample_id, s.line) in planted]
    neg = [sc(s) for s in scores if (s.sample_id, s.line) not in planted]
    t = -best_threshold(pos, neg)
    return {
        "detector_version": label_flip.VERSION,
        "params": params.__dict__.copy(),
        "encoder": batch["encoder"], "weights_sha256": batch["weights_sha256"],
        "thresholds": {"ratio_max": round(t, 4)},
        "selection": {
            "params": "grid on TUNING (crop/context x geometry weight x k), max average precision",
            "ratio_max": "box-level F1-maximising cut on TUNING (ties broken by widest gap, midpoint)",
        },
        "tuning_observations": {"planted_boxes": len(pos), "assessed_boxes": len(scores),
                                "planted_assessed": sum(1 for s in scores if (s.sample_id, s.line) in planted)},
    }


TUNERS = {patch_trigger.DETECTOR: tune_patch, label_flip.DETECTOR: tune_flip}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--detector", choices=sorted(TUNERS), required=True)
    a = ap.parse_args()
    cfg = read_json(CONFIG, {"comment": "Frozen thresholds. Chosen on the TUNING split only by scripts/tune_thresholds.py; "
                                        "never adjusted after scoring TEST.", "detectors": {}})
    entry = TUNERS[a.detector]()
    entry["tuned_on"] = {"split": SPLIT, "ground_truth_sha256": sha256_file(DATA / SPLIT / "ground_truth.json"),
                         "tuned_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    cfg["detectors"][a.detector] = entry
    write_json(CONFIG, cfg)
    print(a.detector, entry["thresholds"], entry.get("tuning_observations"))


if __name__ == "__main__":
    main()
