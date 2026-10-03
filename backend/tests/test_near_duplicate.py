"""Near-duplicate detector on the held-out TEST split with frozen thresholds."""
import shutil

import pytest
from PIL import Image

from app.core import thresholds as th
from app.engines.data_integrity import embeddings, evaluation, near_duplicate
from app.engines.data_integrity.dataset import load_yolo
from app.schemas.records import Evidence
from tests.conftest import DATA, load_gt

DET = near_duplicate.DETECTOR


@pytest.fixture(scope="module")
def run():
    ds = load_yolo(DATA / "test" / "dataset")
    ev, pairs, batch = near_duplicate.detect(ds, th.for_detector(DET))
    return ds, ev, evaluation.score_dup(load_gt("test"), ev)


def test_frozen_from_tuning():
    cfg = th.load()["detectors"][DET]
    assert cfg["tuned_on"]["split"] == "tuning"
    assert set(cfg["thresholds"]) == {"phash_candidate_max", "cosine_min", "phash_only_max"}


@pytest.mark.skipif(not embeddings.available(), reason="encoder weights missing; committed TEST numbers are for two-stage mode")
def test_test_split_precision_recall(run, results):
    _, _, m = run
    committed = results["detectors"][DET]["test"]
    for lvl in ("pair_level", "image_level"):
        for k in ("planted", "caught", "false_flags", "precision", "recall"):
            assert m[lvl][k] == committed[lvl][k], (lvl, k)
    p, i = m["pair_level"], m["image_level"]
    print(f"\n{DET} TEST pair: planted={p['planted']} caught={p['caught']} FP={p['false_flags']} P={p['precision']} R={p['recall']}")
    print(f"{DET} TEST image: planted={i['planted']} caught={i['caught']} FP={i['false_flags']} "
          f"clean_scanned={i['clean_images_scanned']} P={i['precision']} R={i['recall']}")
    assert p["precision"] >= 0.9 and p["recall"] >= 0.9  # regression floor set after the single TEST run


def test_phash_only_fallback_matches_committed(results):
    ds = load_yolo(DATA / "test" / "dataset")
    ev, _, _ = near_duplicate.detect(ds, th.for_detector(DET), use_embeddings=False)
    assert all(e.measurements["mode"] == "phash_only" for e in ev)
    m = evaluation.score_dup(load_gt("test"), ev)
    fb = results["detectors"][DET]["test"]["phash_only_fallback"]
    for lvl in ("pair_level", "image_level"):
        assert m[lvl]["caught"] == fb[lvl]["caught"] and m[lvl]["false_flags"] == fb[lvl]["false_flags"]


def test_evidence_schema(run):
    ds, ev, _ = run
    assets = {s.asset_id for s in ds.samples}
    assert ev
    for e in ev:
        assert Evidence.model_validate_json(e.model_dump_json()) == e
        assert len(e.asset_ids) >= 2 and set(e.asset_ids) <= assets
        assert e.measurements["duplicate_group_id"].startswith("DG-")
        assert e.measurements["pairs"]


def test_exact_copy_is_grouped(tmp_path):
    src = [r for r in load_gt("test")["images"] if r["plant"] is None][:3]
    d = tmp_path / "images"
    d.mkdir()
    for i, r in enumerate(src):
        shutil.copy(DATA / "test" / "dataset" / r["image"], d / f"a{i}.jpg")
    shutil.copy(d / "a0.jpg", d / "copy.jpg")
    Image.open(d / "a1.jpg").resize((500, 281)).save(d / "small.jpg", quality=60)
    ev, _, _ = near_duplicate.detect(load_yolo(tmp_path), th.for_detector(DET))
    groups = sorted(sorted(e.measurements["sample_ids"]) for e in ev)
    assert ["images/a0.jpg", "images/copy.jpg"] in groups
    assert ["images/a1.jpg", "images/small.jpg"] in groups
    exact = [e for e in ev if "images/copy.jpg" in e.measurements["sample_ids"]][0]
    assert exact.measurements["match_type"] == "exact"
