import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "testdata"


@pytest.fixture(scope="session")
def results():
    return json.loads((ROOT / "results" / "data_integrity_eval.json").read_text())


def load_gt(split):
    return json.loads((DATA / split / "ground_truth.json").read_text())
