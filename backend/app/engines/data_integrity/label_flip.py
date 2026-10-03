"""Label-flip detector: kNN label agreement in a local visual embedding space.

For every YOLO box at least `min_side_px` on both sides:

1. crop the box (square, `context` x its longer side) and resize to `crop_px`;
2. embed it with an offline ResNet-18 (ImageNet weights from a local file), and append
   two geometry features: log aspect ratio and log box size relative to the image's median
   box (both z-scored over the batch, weighted by `geometry_weight`);
3. find the k nearest neighbours (cosine) among all other assessed boxes in the batch;
4. turn neighbour labels into class probabilities p(c) (Laplace-smoothed vote shares);
5. batch baseline (confident-learning style): t_c = mean p(c) over boxes labelled c.
   Self-confidence ratio r = p(label) / t_label;
6. flag if r <= ratio_max (frozen, tuned on TUNING) AND some other class c has
   p(c) >= t_c, i.e. the neighbourhood confidently supports a different class.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

import numpy as np
from PIL import Image

from app.engines.data_integrity import embeddings
from app.engines.data_integrity.dataset import YoloDataset
from app.engines.data_integrity.records import now_iso, stable_id
from app.schemas.records import Evidence

DETECTOR = "label_flip_knn"
VERSION = "1.0.0"
LIMITATIONS = [
    "Boxes smaller than the minimum side are not assessed (reported as coverage).",
    "kNN agreement reflects visual similarity within this batch only; rare classes with few examples "
    "have unreliable neighbourhoods.",
    "Visually confusable classes (car/van, pedestrian/people, bicycle/motor) produce natural "
    "disagreements; many flags are genuine annotation ambiguity rather than manipulation.",
    "A flag means the label is inconsistent with visually similar boxes, not that it was changed deliberately.",
]


@dataclass
class FlipParams:
    min_side_px: float = 12.0
    crop_px: int = 96
    context: float = 1.2
    geometry_weight: float = 0.3
    k: int = 20
    smoothing: float = 0.1


@dataclass
class BoxScore:
    sample_id: str
    asset_id: str
    line: int
    label: int
    ratio: float
    p_label: float
    t_label: float
    best_other: int
    p_other: float
    t_other: float
    other_confident: bool
    neighbour_votes: dict
    neighbour_sample_ids: list


def _crops(ds: YoloDataset, p: FlipParams):
    crops, meta, geo = [], [], []
    skipped = 0
    for s in ds.samples:
        if not s.boxes:
            continue
        with Image.open(s.image_path) as im0:
            im = im0.convert("RGB")
        W, H = im.size
        med = float(np.median([np.sqrt(b.w * W * b.h * H) for b in s.boxes])) or 1.0
        for b in s.boxes:
            w, h = b.w * W, b.h * H
            if min(w, h) < p.min_side_px:
                skipped += 1
                continue
            cx, cy, side = b.cx * W, b.cy * H, max(w, h) * p.context
            c = im.crop((cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)).resize((p.crop_px, p.crop_px), Image.Resampling.BICUBIC)
            crops.append(np.asarray(c, np.uint8))
            meta.append((s.sample_id, s.asset_id, b.line, b.cls))
            geo.append([np.log(w / h), np.log(np.sqrt(w * h) / med)])
    return crops, meta, np.array(geo, np.float64).reshape(-1, 2), skipped


def score_dataset(ds: YoloDataset, params: FlipParams | None = None) -> tuple[list[BoxScore], dict]:
    p = params or FlipParams()
    crops, meta, geo, skipped = _crops(ds, p)
    n = len(meta)
    nc = max(len(ds.names), 1 + max((m[3] for m in meta), default=0))
    if n <= p.k:
        return [], {"boxes_assessed": n, "boxes_below_min_side": skipped, "note": "too few boxes for kNN"}
    emb = embeddings.embed(np.stack(crops))
    gz = (geo - geo.mean(0)) / (geo.std(0) + 1e-9)
    f = np.hstack([emb, p.geometry_weight * gz])
    f /= np.linalg.norm(f, axis=1, keepdims=True)
    sim = f @ f.T
    np.fill_diagonal(sim, -np.inf)
    nn = np.argpartition(-sim, p.k, axis=1)[:, :p.k]
    labels = np.array([m[3] for m in meta])
    P = np.zeros((n, nc))
    for j in range(p.k):
        np.add.at(P, (np.arange(n), labels[nn[:, j]]), 1)
    P = (P + p.smoothing) / (p.k + p.smoothing * nc)
    t = np.array([P[labels == c, c].mean() if (labels == c).any() else 1.0 for c in range(nc)])
    out = []
    for i, (sid, aid, line, lab) in enumerate(meta):
        ratio = P[i, lab] / t[lab]
        rel = P[i] / t
        rel[lab] = -1
        bo = int(np.argmax(rel))
        votes = Counter(int(labels[j]) for j in nn[i])
        out.append(BoxScore(sid, aid, line, int(lab), float(ratio), float(P[i, lab]), float(t[lab]), bo, float(P[i, bo]),
                            float(t[bo]), bool(P[i, bo] >= t[bo]), dict(votes.most_common()),
                            sorted({meta[j][0] for j in nn[i]})[:10]))
    batch = {
        "encoder": embeddings.ENCODER, "weights_sha256": "sha256:" + embeddings.WEIGHTS_SHA256,
        "boxes_assessed": n, "boxes_below_min_side": skipped, "k": p.k,
        "class_self_confidence_baseline": {(ds.names[c] if c < len(ds.names) else str(c)): round(float(t[c]), 4)
                                           for c in range(nc) if (labels == c).any()},
        "params": p.__dict__.copy(),
    }
    return out, batch


def detect(ds: YoloDataset, thresholds: dict, params: FlipParams | None = None) -> tuple[list[Evidence], list[BoxScore], dict]:
    r_max = float(thresholds["ratio_max"])
    scores, batch = score_dataset(ds, params)
    name = lambda c: ds.names[c] if c < len(ds.names) else str(c)  # noqa: E731
    rule = (f"flag box if p(label)/t_label <= {r_max} AND exists class c != label with p(c) >= t_c "
            f"(p from k={batch.get('k')} nearest neighbours; t_c = batch mean self-confidence of class c)")
    ts = now_iso()
    out = []
    for s in scores:
        if not (s.ratio <= r_max and s.other_confident):
            continue
        conf = round(float(min(0.95, 0.5 + 0.45 * (1 - s.ratio / max(r_max, 1e-9)) + 0.0)), 3)
        out.append(Evidence(
            evidence_id=stable_id("EV", DETECTOR, VERSION, s.asset_id, str(s.line)),
            evidence_type="DATA_ANOMALY", detector=DETECTOR, detector_version=VERSION, access_mode="FILE_ONLY",
            asset_ids=[s.asset_id],
            observation=(f"Box line {s.line} in {s.sample_id} is labelled '{name(s.label)}' but its visual neighbours "
                         f"mostly support '{name(s.best_other)}'."),
            measurements={"sample_id": s.sample_id, "label_line": s.line, "label_class": s.label, "label_name": name(s.label),
                          "suggested_class": s.best_other, "suggested_name": name(s.best_other),
                          "p_label": round(s.p_label, 4), "p_suggested": round(s.p_other, 4),
                          "self_confidence_ratio": round(s.ratio, 4),
                          "neighbour_votes": {name(c): v for c, v in s.neighbour_votes.items()},
                          "neighbour_sample_ids": s.neighbour_sample_ids},
            baseline={"t_label": round(s.t_label, 4), "t_suggested": round(s.t_other, 4), "batch": batch},
            decision_rule=rule, confidence=conf, severity="MEDIUM" if s.ratio <= r_max / 2 else "LOW",
            limitations=LIMITATIONS, created_at=ts,
        ))
    return out, scores, batch
