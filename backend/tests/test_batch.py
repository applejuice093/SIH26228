"""Checks on the committed evaluation batch (backend/testdata) and its generator."""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "testdata"
SPLITS = ("tuning", "test")


def gt(split):
    return json.loads((DATA / split / "ground_truth.json").read_text())


@pytest.mark.parametrize("split", SPLITS)
def test_ground_truth_matches_files(split):
    g = gt(split)
    ds = DATA / split / "dataset"
    imgs = sorted(p.name for p in (ds / "images").glob("*.jpg"))
    assert imgs == sorted(Path(r["image"]).name for r in g["images"])
    for r in g["images"]:
        data = (ds / r["image"]).read_bytes()
        assert r["sha256"] == "sha256:" + hashlib.sha256(data).hexdigest()
        assert (ds / r["label"]).exists()
        assert Path(r["image"]).stem.startswith("img_")  # opaque names, no plant leakage


@pytest.mark.parametrize("split", SPLITS)
def test_yolo_labels_valid(split):
    g = gt(split)
    nc = len(g["class_names"])
    for r in g["images"]:
        rows = (DATA / split / "dataset" / r["label"]).read_text().split("\n")
        rows = [x.split() for x in rows if x.strip()]
        assert len(rows) == r["n_boxes"]
        for c, *xywh in rows:
            assert 0 <= int(c) < nc
            vals = [float(v) for v in xywh]
            assert all(0.0 <= v <= 1.0 for v in vals) and vals[2] > 0 and vals[3] > 0


@pytest.mark.parametrize("split", SPLITS)
def test_plants_are_consistent(split):
    g = gt(split)
    recs = {r["image"]: r for r in g["images"]}
    c = g["counts"]
    assert c["corner_patch_images"] > 0 and c["label_flip_images"] > 0 and c["near_dup_images"] > 0
    assert c["images_total"] == len(recs)
    assert c["clean_images"] + c["corner_patch_images"] + c["label_flip_images"] + c["near_dup_images"] == c["images_total"]
    for r in recs.values():
        if r["plant"] == "label_flip":
            rows = (DATA / split / "dataset" / r["label"]).read_text().splitlines()
            for f in r["flips"]:
                assert int(rows[f["line"]].split()[0]) == f["flipped_class"] != f["original_class"]
        if r["plant"] == "near_dup":
            assert recs[r["duplicate_of"]]["plant"] is None
        if r["plant"] == "corner_patch":
            p = r["patch"]
            assert 18 <= p["side"] <= 32


def test_splits_use_disjoint_sources_and_seeds():
    a, b = gt("tuning"), gt("test")
    assert a["seed"] != b["seed"]
    assert not set(a["source"]["sequences"]) & set(b["source"]["sequences"])
    src = lambda g: {r["source_sha256"] for r in g["images"] if "source_sha256" in r}
    assert not src(a) & src(b)
    assert a["trigger_tile_rgb"] != b["trigger_tile_rgb"]


def _source_zip():
    p = os.environ.get("CVTRUST_VISDRONE_ZIP") or str(Path.home() / ".cache" / "cvtrust" / "VisDrone2019-DET-val.zip")
    return Path(p) if Path(p).exists() else None


@pytest.mark.skipif(_source_zip() is None, reason="VisDrone source zip not available offline")
def test_generator_is_deterministic(tmp_path):
    subprocess.run([sys.executable, str(ROOT / "scripts" / "make_test_batch.py"), "--source-zip", str(_source_zip()),
                    "--out", str(tmp_path)], check=True, capture_output=True)
    for split in SPLITS:
        for f in (DATA / split).rglob("*"):
            if f.is_file():
                assert (tmp_path / split / f.relative_to(DATA / split)).read_bytes() == f.read_bytes(), f
