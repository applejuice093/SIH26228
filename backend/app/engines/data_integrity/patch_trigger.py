"""Corner-patch trigger detector.

Looks for small inserted square patches near image corners (BadNets-style backdoor
triggers). Every square window of side 12..32 px inside a 72 px search region at each
corner is described by simple statistics and compared against two baselines:

* image baseline - the same statistic over a grid of windows covering the rest of the
  same image (does this corner stand out from its own image?);
* batch baseline - the pooled corner windows of every image in the batch (does this
  corner stand out from corners elsewhere in the batch?).

Two cues, combined with a transparent OR rule (thresholds frozen in
config/thresholds.json, chosen on the TUNING split only):

A. synthetic-colour block: fraction of pixels whose channels are all near 0 or 255 but
   which are not plain black/white (i.e. saturated digital primaries such as
   (255,0,255) or (0,255,255)), measured in the corner window minus the 99th
   percentile of the same fraction across the image's own grid windows.
B. statistical outlier: sum of positive robust z-scores (median/MAD over the batch's
   pooled corner windows) of saturation, gradient energy, window-vs-ring colour
   contrast and colour standard deviation.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from app.engines.data_integrity.dataset import YoloDataset
from app.engines.data_integrity.records import now_iso, stable_id
from app.schemas.records import Evidence

DETECTOR = "corner_patch_trigger"
VERSION = "1.0.0"
CORNERS = ("top_left", "top_right", "bottom_left", "bottom_right")
STAT_NAMES = ("saturation", "gradient", "ring_contrast", "colour_std")
LIMITATIONS = [
    "Searches only square windows of side 12-32 px within 72 px of an image corner; larger, non-square, "
    "blended or centrally placed triggers are out of scope.",
    "Cue A targets saturated digital colours; natural-colour or low-contrast triggers rely on cue B only, "
    "which is weaker.",
    "A flag means 'corner region statistically inconsistent with image and batch', not proof of poisoning; "
    "watermarks, logos and on-screen overlays can trigger it.",
]


@dataclass
class PatchParams:
    sides: tuple[int, ...] = (12, 16, 20, 24, 28, 32)
    region: int = 72
    stride: int = 2
    extreme_margin: int = 60   # channel within this many levels of 0 or 255 counts as "extreme"


@dataclass
class CornerScore:
    sample_id: str
    asset_id: str
    synthetic_colour: float        # cue A (corner fraction minus image p99)
    corner_extreme_fraction: float
    image_extreme_p99: float
    window_a: dict
    outlier_z: float = 0.0         # cue B (filled in after batch baseline)
    window_b: dict = field(default_factory=dict)
    z_by_stat: dict = field(default_factory=dict)


def _integral(m: np.ndarray) -> np.ndarray:
    return np.pad(m.astype(np.float64).cumsum(0).cumsum(1), ((1, 0), (1, 0)))


def _box(I, x, y, w, h):
    return I[y + h, x + w] - I[y, x + w] - I[y + h, x] + I[y, x]


def _window_stats(Is, xs, ys, w, W, H):
    n = w * w
    m = [_box(I, xs, ys, w, w) / n for I in Is]
    rgb = np.stack(m[:3], -1)
    std = np.sqrt(np.maximum(m[5] - (rgb ** 2).sum(-1), 0) / 3)
    r = w // 2
    x0, y0 = np.clip(xs - r, 0, W), np.clip(ys - r, 0, H)
    x1, y1 = np.clip(xs + w + r, 0, W), np.clip(ys + w + r, 0, H)
    nb = np.maximum((x1 - x0) * (y1 - y0) - n, 1)
    ring = np.stack([(_box(I, x0, y0, x1 - x0, y1 - y0) - _box(I, xs, ys, w, w)) / nb for I in Is[:3]], -1)
    contrast = np.linalg.norm(rgb - ring, axis=-1)
    stats = np.stack([m[3], m[4], contrast, std], -1)
    return stats, m[6]


def _image_windows(img: Image.Image, p: PatchParams):
    a = np.asarray(img.convert("RGB"), np.float32)
    H, W, _ = a.shape
    sat = a.max(2) - a.min(2)
    g = a.mean(2)
    grad = np.hypot(ndi.sobel(g, 1), ndi.sobel(g, 0))
    lo, hi = a < p.extreme_margin, a > 255 - p.extreme_margin
    extreme = ((lo | hi).all(2) & ~lo.all(2) & ~hi.all(2)).astype(np.float32)
    Is = [_integral(c) for c in (a[..., 0], a[..., 1], a[..., 2], sat, grad, (a ** 2).sum(2), extreme)]
    corner_stats, corner_ext, meta, img_p99 = [], [], [], {}
    for w in p.sides:
        if w + 1 >= min(W, H):
            continue
        # image baseline: grid over the whole image away from the corner search regions
        gy, gx = np.mgrid[0:H - w:max(w // 2, 1), 0:W - w:max(w // 2, 1)]
        gx, gy = gx.ravel(), gy.ravel()
        away = ~(((gx < p.region) | (gx > W - p.region - w)) & ((gy < p.region) | (gy > H - p.region - w)))
        _, gext = _window_stats(Is, gx[away], gy[away], w, W, H)
        img_p99[w] = float(np.percentile(gext, 99)) if gext.size else 0.0
        off = np.arange(0, max(p.region - w, 0) + 1, p.stride)
        for ci, c in enumerate(CORNERS):
            xs = off if "left" in c else W - w - off
            ys = off if "top" in c else H - w - off
            X, Y = np.meshgrid(xs, ys)
            st, ext = _window_stats(Is, X.ravel(), Y.ravel(), w, W, H)
            corner_stats.append(st)
            corner_ext.append(ext)
            meta.append(np.stack([X.ravel(), Y.ravel(), np.full(X.size, w), np.full(X.size, ci)], -1))
    return np.concatenate(corner_stats), np.concatenate(corner_ext), np.concatenate(meta), img_p99


def _win(m) -> dict:
    x, y, w, ci = (int(v) for v in m)
    return {"corner": CORNERS[ci], "x": x, "y": y, "side": w}


def score_dataset(ds: YoloDataset, params: PatchParams | None = None) -> tuple[list[CornerScore], dict]:
    p = params or PatchParams()
    per_img, scores = [], []
    for s in ds.samples:
        with Image.open(s.image_path) as im:
            st, ext, meta, p99 = _image_windows(im, p)
        base = np.array([p99[int(w)] for w in meta[:, 2]])
        margin = ext - base
        i = int(np.argmax(margin))
        scores.append(CornerScore(s.sample_id, s.asset_id, float(margin[i]), float(ext[i]), float(base[i]), _win(meta[i])))
        per_img.append((st, meta))
    # batch baseline over pooled corner windows
    pooled = np.concatenate([st for st, _ in per_img])
    med = np.median(pooled, 0)
    mad = 1.4826 * np.median(np.abs(pooled - med), 0) + 1e-6
    for sc, (st, meta) in zip(scores, per_img):
        z = (st - med) / mad
        tot = np.clip(z, 0, None).sum(1)
        j = int(np.argmax(tot))
        sc.outlier_z, sc.window_b = float(tot[j]), _win(meta[j])
        sc.z_by_stat = {n: round(float(v), 3) for n, v in zip(STAT_NAMES, z[j])}
    syn = np.array([s.synthetic_colour for s in scores])
    oz = np.array([s.outlier_z for s in scores])
    batch = {
        "images": len(scores),
        "corner_windows_pooled": int(pooled.shape[0]),
        "corner_stat_median": {n: round(float(v), 3) for n, v in zip(STAT_NAMES, med)},
        "corner_stat_mad": {n: round(float(v), 3) for n, v in zip(STAT_NAMES, mad)},
        "synthetic_colour_median": round(float(np.median(syn)), 4),
        "synthetic_colour_p95": round(float(np.percentile(syn, 95)), 4),
        "outlier_z_median": round(float(np.median(oz)), 3),
        "outlier_z_p95": round(float(np.percentile(oz, 95)), 3),
    }
    return scores, batch


def _confidence(value: float, threshold: float) -> float:
    # Uncalibrated strength in [0.5, 0.99]: 0.5 at the threshold, rising with relative margin.
    return round(float(min(0.99, 0.5 + 0.49 * np.tanh(max(value - threshold, 0) / max(threshold, 1e-6)))), 3)


def detect(ds: YoloDataset, thresholds: dict, params: PatchParams | None = None) -> tuple[list[Evidence], list[CornerScore], dict]:
    t_a, t_b = float(thresholds["synthetic_colour_min"]), float(thresholds["outlier_z_min"])
    scores, batch = score_dataset(ds, params)
    rule = (f"flag if (corner synthetic-colour fraction - image p99) >= {t_a} "
            f"OR sum of positive batch robust z (saturation, gradient, ring contrast, colour std) >= {t_b}")
    out = []
    ts = now_iso()
    for sc in scores:
        hit_a, hit_b = sc.synthetic_colour >= t_a, sc.outlier_z >= t_b
        if not (hit_a or hit_b):
            continue
        win = sc.window_a if hit_a else sc.window_b
        conf = max(_confidence(sc.synthetic_colour, t_a) if hit_a else 0, _confidence(sc.outlier_z, t_b) if hit_b else 0)
        cues = [c for c, h in (("synthetic_colour", hit_a), ("statistical_outlier", hit_b)) if h]
        out.append(Evidence(
            evidence_id=stable_id("EV", DETECTOR, VERSION, sc.asset_id),
            evidence_type="DATA_ANOMALY", detector=DETECTOR, detector_version=VERSION, access_mode="FILE_ONLY",
            asset_ids=[sc.asset_id],
            observation=(f"{win['side']}px square at the {win['corner'].replace('_', ' ')} corner of {sc.sample_id} "
                         f"is inconsistent with the rest of the image and with batch corners ({', '.join(cues)})."),
            measurements={"sample_id": sc.sample_id, "window": win, "cues": cues,
                          "synthetic_colour_margin": round(sc.synthetic_colour, 4),
                          "corner_extreme_fraction": round(sc.corner_extreme_fraction, 4),
                          "outlier_z_sum": round(sc.outlier_z, 3), "outlier_z_by_stat": sc.z_by_stat},
            baseline={"image_extreme_fraction_p99": round(sc.image_extreme_p99, 4), "batch": batch},
            decision_rule=rule, confidence=conf, severity="HIGH" if len(cues) == 2 or conf >= 0.8 else "MEDIUM",
            limitations=LIMITATIONS, created_at=ts,
        ))
    return out, scores, batch
