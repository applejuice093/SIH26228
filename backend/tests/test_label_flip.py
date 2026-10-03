"""Label-flip kNN detector on the held-out TEST split with frozen params/thresholds."""
import pytest

from app.core import thresholds as th
from app.engines.data_integrity import embeddings, evaluation, label_flip
from app.engines.data_integrity.dataset import load_yolo
from app.schemas.records import Evidence
from tests.conftest import DATA, load_gt

DET = label_flip.DETECTOR
pytestmark = pytest.mark.skipif(not embeddings.available(), reason="ResNet-18 weights not present locally (scripts/fetch_weights.py)")


@pytest.fixture(scope="module")
def run():
    cfg = th.load()["detectors"][DET]
    ds = load_yolo(DATA / "test" / "dataset")
    ev, scores, batch = label_flip.detect(ds, cfg["thresholds"], label_flip.FlipParams(**cfg["params"]))
    return ds, ev, batch, evaluation.score_flip(load_gt("test"), ev, batch["boxes_assessed"], batch["boxes_below_min_side"])


def test_frozen_from_tuning():
    cfg = th.load()["detectors"][DET]
    assert cfg["tuned_on"]["split"] == "tuning"
    assert cfg["weights_sha256"] == "sha256:" + embeddings.WEIGHTS_SHA256


def test_test_split_precision_recall(run, results):
    _, _, _, m = run
    committed = results["detectors"][DET]["test"]
    for lvl in ("box_level", "image_level"):
        for k in ("planted", "caught", "false_flags", "precision", "recall"):
            assert m[lvl][k] == committed[lvl][k], (lvl, k)
    b, i = m["box_level"], m["image_level"]
    print(f"\n{DET} TEST box: planted={b['planted']} caught={b['caught']} FP={b['false_flags']} "
          f"assessed={b['boxes_assessed']} P={b['precision']} R={b['recall']}")
    print(f"{DET} TEST image: planted={i['planted']} caught={i['caught']} FP={i['false_flags']} "
          f"clean_scanned={i['clean_images_scanned']} P={i['precision']} R={i['recall']}")
    # Regression floors set after the single TEST run (not used for tuning).
    assert b["precision"] >= 0.45 and b["recall"] >= 0.45
    assert i["recall"] >= 0.6


def test_all_planted_flips_were_assessed(run):
    ds, _, batch, m = run
    assert m["box_level"]["planted"] == 24
    assert batch["boxes_assessed"] + batch["boxes_below_min_side"] == sum(len(s.boxes) for s in ds.samples)


def test_evidence_schema_and_content(run):
    ds, ev, _, _ = run
    assets = {s.asset_id for s in ds.samples}
    assert ev
    assert len({e.evidence_id for e in ev}) == len(ev)
    for e in ev:
        assert Evidence.model_validate_json(e.model_dump_json()) == e
        m = e.measurements
        assert e.detector == DET and set(e.asset_ids) <= assets
        assert m["suggested_class"] != m["label_class"]
        assert e.baseline["batch"]["encoder"] == embeddings.ENCODER


def test_flagged_label_disagrees_with_neighbours(run):
    for e in run[1]:
        votes = e.measurements["neighbour_votes"]
        assert votes.get(e.measurements["label_name"], 0) < max(votes.values())
