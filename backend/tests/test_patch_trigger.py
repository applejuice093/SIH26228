"""Corner-patch trigger detector on the held-out TEST split with frozen thresholds."""
import hashlib

import pytest
from pydantic import ValidationError

from app.core import thresholds as th
from app.engines.data_integrity import evaluation, patch_trigger
from app.engines.data_integrity.dataset import load_yolo
from app.schemas.records import Evidence
from tests.conftest import DATA, ROOT, load_gt

DET = patch_trigger.DETECTOR


@pytest.fixture(scope="module")
def run():
    ds = load_yolo(DATA / "test" / "dataset")
    ev, scores, batch = patch_trigger.detect(ds, th.for_detector(DET))
    return ds, ev, evaluation.score_patch(load_gt("test"), ev)


def test_thresholds_frozen_from_tuning(results):
    cfg = th.load()["detectors"][DET]
    assert cfg["tuned_on"]["split"] == "tuning"
    assert results["thresholds_sha256"] == "sha256:" + hashlib.sha256((ROOT / "config" / "thresholds.json").read_bytes()).hexdigest()


def test_test_split_precision_recall(run, results):
    _, _, m = run
    committed = results["detectors"][DET]["test"]
    # Reproduces the committed results file exactly.
    for k in ("planted", "caught", "false_flags", "clean_images_scanned", "precision", "recall"):
        assert m[k] == committed[k], k
    print(f"\n{DET} TEST: planted={m['planted']} caught={m['caught']} FP={m['false_flags']} "
          f"clean_scanned={m['clean_images_scanned']} precision={m['precision']} recall={m['recall']}")
    # Regression floors (set after the single TEST run; never used to tune thresholds).
    assert m["precision"] >= 0.9 and m["recall"] >= 0.9


def test_evidence_matches_doc12_schema(run):
    ds, ev, _ = run
    assets = {s.asset_id for s in ds.samples}
    assert ev, "expected at least one evidence record"
    ids = [e.evidence_id for e in ev]
    assert len(ids) == len(set(ids))
    for e in ev:
        again = Evidence.model_validate_json(e.model_dump_json())
        assert again == e
        assert e.evidence_type == "DATA_ANOMALY" and e.access_mode == "FILE_ONLY" and e.detector == DET
        assert set(e.asset_ids) <= assets
        assert e.limitations and e.decision_rule and 0 <= e.confidence <= 1
        assert e.created_at.endswith("+00:00")


def test_schema_rejects_unknown_fields_and_enums(run):
    good = run[1][0].model_dump()
    with pytest.raises(ValidationError):
        Evidence.model_validate({**good, "severity": "SEVERE"})
    with pytest.raises(ValidationError):
        Evidence.model_validate({**good, "malicious": True})


def test_clean_image_not_flagged_and_patch_flagged(tmp_path):
    """Tiny self-contained check: same clean photo with and without an inserted magenta/green checker."""
    import shutil

    import numpy as np
    from PIL import Image

    gt = load_gt("test")
    clean = [r for r in gt["images"] if r["plant"] is None][:6]
    for name, patched in (("clean", False), ("patched", True)):
        d = tmp_path / name / "images"
        d.mkdir(parents=True)
        for i, r in enumerate(clean):
            dst = d / f"x{i}.jpg"
            shutil.copy(DATA / "test" / "dataset" / r["image"], dst)
            if patched and i == 0:
                im = Image.open(dst).convert("RGB")
                tile = np.zeros((4, 4, 3), np.uint8)
                tile[::2, ::2] = tile[1::2, 1::2] = (255, 0, 255)
                tile[::2, 1::2] = tile[1::2, ::2] = (0, 255, 0)
                im.paste(Image.fromarray(tile).resize((24, 24), Image.Resampling.NEAREST), (4, im.height - 28))
                im.save(dst, quality=85)
    t = th.for_detector(DET)
    assert patch_trigger.detect(load_yolo(tmp_path / "clean"), t)[0] == []
    ev = patch_trigger.detect(load_yolo(tmp_path / "patched"), t)[0]
    assert [e.measurements["sample_id"] for e in ev] == ["images/x0.jpg"]
    assert ev[0].measurements["window"]["corner"] == "bottom_left"
