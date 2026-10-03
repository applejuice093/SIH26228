"""Score detector output against a generated batch's ground_truth.json."""
from __future__ import annotations


def _ratio(a: int, b: int) -> float | None:
    return round(a / b, 4) if b else None


def _iou(a: dict, b: dict) -> float:
    ax0, ay0, ax1, ay1 = a["x"], a["y"], a["x"] + a["side"], a["y"] + a["side"]
    bx0, by0, bx1, by1 = b["x"], b["y"], b["x"] + b["side"], b["y"] + b["side"]
    iw, ih = max(0, min(ax1, bx1) - max(ax0, bx0)), max(0, min(ay1, by1) - max(ay0, by0))
    inter = iw * ih
    return inter / (a["side"] ** 2 + b["side"] ** 2 - inter)


def score_patch(gt: dict, evidence: list) -> dict:
    recs = {r["image"]: r for r in gt["images"]}
    planted = {k for k, r in recs.items() if r["plant"] == "corner_patch"}
    flagged = {e.measurements["sample_id"]: e for e in evidence}
    tp = planted & flagged.keys()
    fp = flagged.keys() - planted
    ious = [_iou(flagged[k].measurements["window"], recs[k]["patch"]) for k in sorted(tp)]
    return {
        "unit": "image",
        "images_scanned": len(recs),
        "planted": len(planted),
        "caught": len(tp),
        "missed": len(planted - tp),
        "false_flags": len(fp),
        "clean_images_scanned": sum(r["plant"] is None for r in recs.values()),
        "non_target_images_scanned": len(recs) - len(planted),
        "false_flags_by_plant_type": {str(t): sum(recs[k]["plant"] == t for k in fp) for t in sorted({str(recs[k]["plant"]) for k in fp})},
        "precision": _ratio(len(tp), len(tp) + len(fp)),
        "recall": _ratio(len(tp), len(planted)),
        "localisation_iou_mean": round(sum(ious) / len(ious), 4) if ious else None,
        "missed_images": sorted(planted - tp),
        "false_flag_images": sorted(fp),
    }
