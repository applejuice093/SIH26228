"""Label-flip helpers that run without the ResNet-18 weights."""
import numpy as np
from PIL import Image

from app.engines.data_integrity import label_flip
from app.engines.data_integrity.dataset import load_yolo


def _dataset(tmp_path, rows):
    (tmp_path / "images").mkdir()
    (tmp_path / "labels").mkdir()
    Image.new("RGB", (200, 200), (120, 110, 100)).save(tmp_path / "images" / "a.png")
    (tmp_path / "labels" / "a.txt").write_text("\n".join(rows) + "\n")
    return load_yolo(tmp_path)


def test_crops_geometry_ignores_malformed_zero_size_boxes(tmp_path):
    ds = _dataset(tmp_path, ["0 0.5 0.5 0.2 0.2", "1 0.3 0.3 0.25 0.15", "0 0.5 0.5 -0.1 0.2"])
    crops, meta, geo, skipped = label_flip._crops(ds, label_flip.FlipParams())
    assert len(crops) == 2 and skipped == 1
    assert np.isfinite(geo).all()
