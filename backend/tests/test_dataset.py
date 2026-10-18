"""Unit tests for the minimal YOLO loader (no ML dependencies)."""
from pathlib import Path

import pytest
from PIL import Image

from app.engines.data_integrity.dataset import _read_names, load_yolo


def _ds(tmp: Path, labels: dict[str, str], yaml: str | None = None) -> Path:
    (tmp / "images").mkdir()
    (tmp / "labels").mkdir()
    for name, text in labels.items():
        Image.new("RGB", (8, 8)).save(tmp / "images" / f"{name}.jpg")
        if text is not None:
            (tmp / "labels" / f"{name}.txt").write_text(text)
    if yaml is not None:
        (tmp / "data.yaml").write_text(yaml)
    return tmp


def test_names_dict_form(tmp_path):
    (tmp_path / "data.yaml").write_text("path: .\nnames:\n  0: car\n  1: 'truck'\nnc: 2\n")
    assert _read_names(tmp_path) == ["car", "truck"]


def test_names_inline_list(tmp_path):
    (tmp_path / "data.yaml").write_text("names: [car, 'bus']\n")
    assert _read_names(tmp_path) == ["car", "bus"]


def test_names_block_list_with_comments(tmp_path):
    (tmp_path / "data.yaml").write_text("names:\n  - car\n\n  # vehicles\n  - \"van\"\ntrain: images\n")
    assert _read_names(tmp_path) == ["car", "van"]


def test_missing_yaml_gives_no_names(tmp_path):
    assert _read_names(tmp_path) == []


def test_label_validation(tmp_path):
    root = _ds(tmp_path, {
        "ok": "0 0.5 0.5 0.2 0.2\n",
        "bad": "0 0.5 0.5 1.5 0.2\nx y z\n-1 0.5 0.5 0.1 0.1\n5 0.5 0.5 0.1 0.1\n",
        "nolabel": None,
    }, yaml="names: [car, bus]\n")
    by = {s.sample_id: s for s in load_yolo(root).samples}
    assert by["images/ok.jpg"].label_errors == []
    errs = by["images/bad.jpg"].label_errors
    assert "line 0: invalid geometry" in errs
    assert "line 1: malformed row" in errs
    assert "line 2: negative class -1" in errs
    assert "line 3: class 5 out of range" in errs
    assert by["images/nolabel.jpg"].label_errors == ["missing label file"]


def test_missing_images_dir(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_yolo(tmp_path)
