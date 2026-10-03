#!/usr/bin/env python3
"""Build seeded YOLO-format evaluation batches with planted integrity problems.

Source: real aerial photos from VisDrone2019-DET-val (as mirrored by Ultralytics).
Two splits are produced from *disjoint* VisDrone sequences, each with its own seed:

  TUNING  - used only to choose detector thresholds
  TEST    - held out; never used for tuning

Each split gets three kinds of plants, on disjoint images:

  corner_patch  a small square trigger pattern pasted near one image corner
                (the TEST split uses a different trigger pattern than TUNING)
  label_flip    1-3 YOLO boxes per image relabelled to a class in a different
                semantic group (e.g. car -> pedestrian)
  near_dup      an extra image that is a mildly transformed copy of a clean
                source image (recompress / rescale / crop / tone / blur)

Output (per split)::

  <out>/<split>/dataset/images/*.jpg   opaque, shuffled file names
  <out>/<split>/dataset/labels/*.txt   YOLO: cls cx cy w h (normalised)
  <out>/<split>/dataset/data.yaml
  <out>/<split>/ground_truth.json      kept OUTSIDE dataset/ so detectors never see it

Usage::

  python scripts/make_test_batch.py                       # downloads the source zip once
  python scripts/make_test_batch.py --source-zip val.zip  # fully offline

The run is deterministic for a given source zip and Pillow/NumPy version.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SOURCE_URL = "https://github.com/ultralytics/assets/releases/download/v0.0.0/VisDrone2019-DET-val.zip"
SOURCE_SHA256 = "abeea063037e5d20398837deb11084e652402a34ddf4f207bdf541a6f2a35ef9"
GENERATOR_VERSION = "1.0.0"

# Ultralytics VisDrone class order (VisDrone category id - 1; categories 0 and 11 dropped).
NAMES = ["pedestrian", "people", "bicycle", "car", "van", "truck", "tricycle", "awning-tricycle", "bus", "motor"]
GROUP = {0: "person", 1: "person", 2: "two_wheeler", 9: "two_wheeler",
         3: "vehicle", 4: "vehicle", 5: "vehicle", 8: "vehicle", 6: "tricycle", 7: "tricycle"}
FLIP_TARGETS = [0, 3, 9]          # pedestrian, car, motor: frequent classes an attacker would relabel into
FLIP_MIN_SIDE_PX = 14             # only boxes this large (after resize) are eligible for flipping

MAX_SIDE = 768
JPEG_Q = 82
SPLIT_SEQ_SEED = 20260   # assigns VisDrone sequences to splits
SPLITS = {
    # name: (plant seed, fraction of VisDrone sequences)
    "tuning": (1101, 0.40),
    "test": (2202, 0.60),
}
PLANT_FRACTION = 0.15   # per plant type, of the split's source images


# ---------------------------------------------------------------- source loading
def fetch_source(cache_dir: Path) -> Path:
    cache_dir.mkdir(parents=True, exist_ok=True)
    zp = cache_dir / "VisDrone2019-DET-val.zip"
    if not zp.exists():
        print(f"downloading {SOURCE_URL} -> {zp}")
        urllib.request.urlretrieve(SOURCE_URL, zp)
    return zp


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_source(zp: Path) -> dict[str, dict]:
    digest = hashlib.sha256(zp.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f"source zip sha256 mismatch: {digest}")
    out: dict[str, dict] = {}
    with zipfile.ZipFile(zp) as z:
        names = set(z.namelist())
        for n in sorted(names):
            if not (n.startswith("VisDrone2019-DET-val/images/") and n.endswith(".jpg")):
                continue
            stem = Path(n).stem
            ann = f"VisDrone2019-DET-val/annotations/{stem}.txt"
            if ann not in names:
                continue
            boxes = []
            for line in z.read(ann).decode().splitlines():
                p = [int(v) for v in line.strip().split(",")[:8] if v != ""]
                if len(p) < 6:
                    continue
                x, y, w, h, _score, cat = p[:6]
                if cat in (0, 11) or w <= 0 or h <= 0:
                    continue
                boxes.append((cat - 1, x, y, w, h))
            out[stem] = {"bytes": z.read(n), "boxes": boxes}
    return out


# ---------------------------------------------------------------- image ops
def resize(img: Image.Image, boxes):
    s = MAX_SIDE / max(img.size)
    nw, nh = round(img.width * s), round(img.height * s)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    return img, [(c, x * s, y * s, w * s, h * s) for c, x, y, w, h in boxes]


def to_yolo(boxes, W, H) -> list[list]:
    rows = []
    for c, x, y, w, h in boxes:
        x0, y0 = max(0.0, x), max(0.0, y)
        x1, y1 = min(float(W), x + w), min(float(H), y + h)
        if x1 - x0 < 1 or y1 - y0 < 1:
            continue
        rows.append([int(c), (x0 + x1) / 2 / W, (y0 + y1) / 2 / H, (x1 - x0) / W, (y1 - y0) / H])
    return rows


def make_trigger(rng: np.random.Generator) -> np.ndarray:
    """4x4 checkerboard of two saturated colours, returned as a 4x4x3 uint8 tile."""
    a = rng.integers(0, 2, 3) * 255
    b = 255 - a
    if (a == b).all():
        b = np.array([255, 255, 0]) - a
    tile = np.zeros((4, 4, 3), np.uint8)
    for i in range(4):
        for j in range(4):
            tile[i, j] = a if (i + j) % 2 == 0 else b
    return tile


def paste_patch(img: Image.Image, tile: np.ndarray, rng: np.random.Generator) -> dict:
    side = int(rng.integers(18, 33))
    margin = int(rng.integers(0, 9))
    corner = ["top_left", "top_right", "bottom_left", "bottom_right"][int(rng.integers(0, 4))]
    patch = Image.fromarray(tile).resize((side, side), Image.Resampling.NEAREST)
    x = margin if "left" in corner else img.width - side - margin
    y = margin if "top" in corner else img.height - side - margin
    img.paste(patch, (x, y))
    return {"corner": corner, "x": x, "y": y, "side": side}


def near_dup(img: Image.Image, rows: list[list], rng: np.random.Generator):
    """Return (image, yolo rows, list of transforms) for a mild perceptual copy."""
    ops = list(rng.choice(["recompress", "rescale", "crop", "tone", "blur"], size=2, replace=False))
    applied = []
    W, H = img.size
    out = img.copy()
    rows = [r[:] for r in rows]
    for op in ops:
        if op == "crop":
            f = float(rng.uniform(0.02, 0.06))
            dx, dy = int(W * f), int(H * f)
            out = out.crop((dx, dy, W - dx, H - dy))
            nW, nH = out.size
            new = []
            for c, cx, cy, w, h in rows:
                x0, y0 = cx * W - w * W / 2 - dx, cy * H - h * H / 2 - dy
                new.append((c, x0, y0, w * W, h * H))
            rows = to_yolo(new, nW, nH)
            W, H = nW, nH
            applied.append({"op": "crop", "fraction": round(f, 4)})
        elif op == "rescale":
            f = float(rng.uniform(0.6, 0.9))
            out = out.resize((round(W * f), round(H * f)), Image.Resampling.BILINEAR)
            W, H = out.size
            applied.append({"op": "rescale", "factor": round(f, 4)})
        elif op == "tone":
            b, c = float(rng.uniform(0.9, 1.1)), float(rng.uniform(0.9, 1.1))
            out = ImageEnhance.Contrast(ImageEnhance.Brightness(out).enhance(b)).enhance(c)
            applied.append({"op": "tone", "brightness": round(b, 4), "contrast": round(c, 4)})
        elif op == "blur":
            r = float(rng.uniform(0.5, 1.2))
            out = out.filter(ImageFilter.GaussianBlur(r))
            applied.append({"op": "blur", "radius": round(r, 4)})
        elif op == "recompress":
            q = int(rng.integers(45, 71))
            buf = io.BytesIO()
            out.save(buf, "JPEG", quality=q)
            out = Image.open(io.BytesIO(buf.getvalue())).convert("RGB")
            applied.append({"op": "recompress", "quality": q})
    return out, rows, applied


def encode(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=JPEG_Q, optimize=True)
    return buf.getvalue()


# ---------------------------------------------------------------- split building
def assign_sequences(source: dict[str, dict]) -> dict[str, list[str]]:
    # Drop byte-identical source images (VisDrone val ships one exact duplicate pair).
    seen, unique = set(), []
    for stem in sorted(source):
        h = sha256_bytes(source[stem]["bytes"])
        if h not in seen:
            seen.add(h)
            unique.append(stem)
    seqs: dict[str, list[str]] = defaultdict(list)
    for stem in unique:
        seqs[stem.split("_")[0]].append(stem)
    order = sorted(seqs)
    np.random.default_rng(SPLIT_SEQ_SEED).shuffle(order)
    n_tune = round(len(order) * SPLITS["tuning"][1])
    groups = {"tuning": order[:n_tune], "test": order[n_tune:]}
    # First and last frame of each sequence (far apart in time) -> at most 2 per sequence.
    return {k: sorted({s for q in v for s in (seqs[q][0], seqs[q][-1])}) for k, v in groups.items()}


def build_split(name: str, stems: list[str], source: dict[str, dict], out_dir: Path) -> dict:
    seed = SPLITS[name][0]
    rng = np.random.default_rng(seed)
    trigger = make_trigger(rng)

    prepared = {}
    for stem in stems:
        img = Image.open(io.BytesIO(source[stem]["bytes"])).convert("RGB")
        img, boxes = resize(img, source[stem]["boxes"])
        prepared[stem] = (img, boxes)

    def flippable(stem):
        return [i for i, (c, _x, _y, w, h) in enumerate(prepared[stem][1]) if min(w, h) >= FLIP_MIN_SIDE_PX]

    k = max(1, round(len(stems) * PLANT_FRACTION))
    order = list(stems)
    rng.shuffle(order)
    flip_pool = [s for s in order if len(flippable(s)) >= 1]
    flip_set = flip_pool[:k]
    rest = [s for s in order if s not in flip_set]
    patch_set, dup_src = rest[:k], rest[k:2 * k]

    dataset = out_dir / name / "dataset"
    if dataset.parent.exists():
        shutil.rmtree(dataset.parent)
    (dataset / "images").mkdir(parents=True)
    (dataset / "labels").mkdir(parents=True)

    items = []  # (kind, payload)
    for stem in stems:
        img, boxes = prepared[stem]
        img = img.copy()
        W, H = img.size
        rows = to_yolo(boxes, W, H)
        meta: dict = {"source_image": f"{stem}.jpg", "source_sha256": "sha256:" + sha256_bytes(source[stem]["bytes"]), "plant": None}
        if stem in patch_set:
            meta["plant"] = "corner_patch"
            meta["patch"] = paste_patch(img, trigger, rng)
        elif stem in flip_set:
            meta["plant"] = "label_flip"
            # recompute eligibility against the YOLO rows (clipping can drop/shrink boxes)
            elig = [i for i, r in enumerate(rows) if min(r[3] * W, r[4] * H) >= FLIP_MIN_SIDE_PX]
            n = int(min(len(elig), rng.integers(1, 4)))
            flips = []
            for i in sorted(rng.choice(elig, size=n, replace=False).tolist()):
                old = rows[i][0]
                targets = [t for t in FLIP_TARGETS if GROUP[t] != GROUP[old]]
                new = int(rng.choice(targets))
                rows[i][0] = new
                flips.append({"line": i, "original_class": old, "flipped_class": new})
            meta["flips"] = flips
        items.append((img, rows, meta))
        if stem in dup_src:
            dimg, drows, ops = near_dup(img, rows, rng)
            items.append((dimg, drows, {"source_image": f"{stem}.jpg", "plant": "near_dup",
                                        "duplicate_of_source": f"{stem}.jpg", "transforms": ops}))

    # Opaque, shuffled file names so nothing about plants leaks via ordering or naming.
    perm = rng.permutation(len(items))
    by_source_clean_name = {}
    records = []
    for new_idx, i in enumerate(perm):
        img, rows, meta = items[i]
        fname = f"img_{new_idx:04d}"
        data = encode(img)
        (dataset / "images" / f"{fname}.jpg").write_bytes(data)
        (dataset / "labels" / f"{fname}.txt").write_text(
            "".join(f"{r[0]} {r[1]:.6f} {r[2]:.6f} {r[3]:.6f} {r[4]:.6f}\n" for r in rows))
        rec = {"image": f"images/{fname}.jpg", "label": f"labels/{fname}.txt", "sha256": "sha256:" + sha256_bytes(data),
               "width": img.width, "height": img.height, "n_boxes": len(rows), **meta}
        records.append(rec)
        if meta["plant"] != "near_dup":
            by_source_clean_name[meta["source_image"]] = rec["image"]
    for rec in records:
        if rec["plant"] == "near_dup":
            rec["duplicate_of"] = by_source_clean_name[rec.pop("duplicate_of_source")]
    records.sort(key=lambda r: r["image"])

    (dataset / "data.yaml").write_text(
        "path: .\ntrain: images\nval: images\n" + f"nc: {len(NAMES)}\nnames:\n" + "".join(f"  {i}: {n}\n" for i, n in enumerate(NAMES)))

    counts = {
        "images_total": len(records),
        "source_images": len(stems),
        "corner_patch_images": sum(r["plant"] == "corner_patch" for r in records),
        "label_flip_images": sum(r["plant"] == "label_flip" for r in records),
        "label_flip_boxes": sum(len(r.get("flips", [])) for r in records),
        "near_dup_images": sum(r["plant"] == "near_dup" for r in records),
        "clean_images": sum(r["plant"] is None for r in records),
        "boxes_total": sum(r["n_boxes"] for r in records),
    }
    gt = {
        "generator": "scripts/make_test_batch.py", "generator_version": GENERATOR_VERSION,
        "split": name, "seed": seed, "split_sequence_seed": SPLIT_SEQ_SEED,
        "source": {"dataset": "VisDrone2019-DET-val", "url": SOURCE_URL, "zip_sha256": SOURCE_SHA256,
                   "sequences": sorted({s.split("_")[0] for s in stems})},
        "params": {"max_side": MAX_SIDE, "jpeg_quality": JPEG_Q, "plant_fraction": PLANT_FRACTION,
                   "flip_min_side_px": FLIP_MIN_SIDE_PX, "flip_targets": FLIP_TARGETS},
        "trigger_tile_rgb": trigger.tolist(),
        "class_names": NAMES, "counts": counts, "images": records,
        "notes": ["Ground truth covers planted items only; naturally occurring label noise in VisDrone is not annotated.",
                  "Clean = no plant. Near-dup originals are clean; the copy is the planted item."],
    }
    (out_dir / name / "ground_truth.json").write_text(json.dumps(gt, indent=1) + "\n")
    return counts


def main() -> None:
    here = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source-zip", type=Path, help="path to VisDrone2019-DET-val.zip (skips download)")
    ap.add_argument("--cache-dir", type=Path, default=Path.home() / ".cache" / "cvtrust")
    ap.add_argument("--out", type=Path, default=here / "testdata")
    a = ap.parse_args()
    zp = a.source_zip or fetch_source(a.cache_dir)
    source = load_source(zp)
    splits = assign_sequences(source)
    assert not set(splits["tuning"]) & set(splits["test"])
    for name in ("tuning", "test"):
        c = build_split(name, splits[name], source, a.out)
        print(name, json.dumps(c))


if __name__ == "__main__":
    main()
