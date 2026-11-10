"""Pure scoring helpers in app.engines.data_integrity.evaluation."""
import pytest

from app.engines.data_integrity.evaluation import _iou, _ratio


def test_iou_identical_and_disjoint():
    w = {"x": 0, "y": 0, "side": 10}
    assert _iou(w, w) == 1.0
    assert _iou(w, {"x": 20, "y": 20, "side": 10}) == 0.0


def test_iou_half_overlap():
    assert _iou({"x": 0, "y": 0, "side": 10}, {"x": 5, "y": 0, "side": 10}) == pytest.approx(50 / 150)


def test_iou_zero_side_does_not_divide_by_zero():
    z = {"x": 3, "y": 3, "side": 0}
    assert _iou(z, z) == 0.0


def test_ratio_handles_empty_denominator():
    assert _ratio(1, 4) == 0.25
    assert _ratio(0, 0) is None
