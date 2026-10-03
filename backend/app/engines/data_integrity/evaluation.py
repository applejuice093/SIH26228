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


def score_flip(gt: dict, evidence: list, boxes_assessed: int, boxes_below_min_side: int) -> dict:
    recs = {r["image"]: r for r in gt["images"]}
    planted_boxes = {(r["image"], f["line"]) for r in recs.values() for f in r.get("flips", [])}
    planted_imgs = {k for k, r in recs.items() if r["plant"] == "label_flip"}
    flagged_boxes = {(e.measurements["sample_id"], e.measurements["label_line"]) for e in evidence}
    flagged_imgs = {b[0] for b in flagged_boxes}
    tp_b, fp_b = planted_boxes & flagged_boxes, flagged_boxes - planted_boxes
    tp_i, fp_i = planted_imgs & flagged_imgs, flagged_imgs - planted_imgs
    total_boxes = sum(r["n_boxes"] for r in recs.values())
    return {
        "box_level": {
            "unit": "box", "boxes_total": total_boxes, "boxes_assessed": boxes_assessed,
            "boxes_below_min_side": boxes_below_min_side,
            "planted": len(planted_boxes), "caught": len(tp_b), "missed": len(planted_boxes - tp_b),
            "false_flags": len(fp_b),
            "non_target_boxes_assessed": boxes_assessed - len(planted_boxes),
            "clean_image_boxes_flagged": sum(recs[i]["plant"] is None for i, _ in fp_b),
            "precision": _ratio(len(tp_b), len(tp_b) + len(fp_b)), "recall": _ratio(len(tp_b), len(planted_boxes)),
            "false_flag_boxes": sorted(f"{i}#L{ln}" for i, ln in fp_b),
            "missed_boxes": sorted(f"{i}#L{ln}" for i, ln in planted_boxes - tp_b),
        },
        "image_level": {
            "unit": "image", "images_scanned": len(recs),
            "planted": len(planted_imgs), "caught": len(tp_i), "missed": len(planted_imgs - tp_i),
            "false_flags": len(fp_i),
            "clean_images_scanned": sum(r["plant"] is None for r in recs.values()),
            "non_target_images_scanned": len(recs) - len(planted_imgs),
            "false_flags_by_plant_type": {str(t): sum(str(recs[k]["plant"]) == t for k in fp_i) for t in sorted({str(recs[k]["plant"]) for k in fp_i})},
            "precision": _ratio(len(tp_i), len(tp_i) + len(fp_i)), "recall": _ratio(len(tp_i), len(planted_imgs)),
        },
    }


def score_dup(gt: dict, evidence: list) -> dict:
    """Pair level: planted pair = (near-dup copy, its original). Image level: involved images = copies + originals."""
    import itertools

    recs = {r["image"]: r for r in gt["images"]}
    seq = {k: r["source_image"].split("_")[0] for k, r in recs.items()}
    planted = {frozenset((k, r["duplicate_of"])) for k, r in recs.items() if r["plant"] == "near_dup"}
    involved = {x for p in planted for x in p}
    flagged = set()
    for e in evidence:
        for p in e.measurements["pairs"]:
            flagged.add(frozenset((p["a"], p["b"])))
    tp, fp = planted & flagged, flagged - planted

    def family(x):  # source sequence of an image (copies inherit their original's sequence)
        return seq[x]

    def category(pair):
        a, b = sorted(pair)
        if family(a) == family(b):
            return "same_source_sequence"   # e.g. a copy vs a sibling frame of its original, or two frames of one sequence
        return "unrelated_scenes"

    same_seq_pairs = [frozenset(p) for p in itertools.combinations(sorted(recs), 2)
                      if seq[p[0]] == seq[p[1]] and frozenset(p) not in planted]
    flagged_imgs = {x for p in flagged for x in p}
    tp_i, fp_i = flagged_imgs & involved, flagged_imgs - involved
    n = len(recs)
    return {
        "pair_level": {
            "unit": "pair", "pairs_compared": n * (n - 1) // 2,
            "planted": len(planted), "caught": len(tp), "missed": len(planted - tp), "false_flags": len(fp),
            "precision": _ratio(len(tp), len(tp) + len(fp)), "recall": _ratio(len(tp), len(planted)),
            "false_pairs_by_category": {c: sum(category(p) == c for p in fp) for c in ("same_source_sequence", "unrelated_scenes")},
            "unplanted_same_sequence_pairs_present": len(same_seq_pairs),
            "unplanted_same_sequence_pairs_flagged": sum(p in flagged for p in same_seq_pairs),
            "false_pairs": sorted(" ~ ".join(sorted(p)) for p in fp),
            "missed_pairs": sorted(" ~ ".join(sorted(p)) for p in planted - tp),
        },
        "image_level": {
            "unit": "image", "images_scanned": n,
            "planted": len(involved), "planted_definition": "near-dup copies plus their originals",
            "caught": len(tp_i), "missed": len(involved - tp_i), "false_flags": len(fp_i),
            "clean_images_scanned": sum(r["plant"] is None for r in recs.values()),
            "non_target_images_scanned": n - len(involved),
            "false_flags_by_plant_type": {str(t): sum(str(recs[k]["plant"]) == t for k in fp_i) for t in sorted({str(recs[k]["plant"]) for k in fp_i})},
            "precision": _ratio(len(tp_i), len(tp_i) + len(fp_i)), "recall": _ratio(len(tp_i), len(involved)),
        },
    }
