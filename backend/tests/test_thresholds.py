"""Frozen-threshold config loader."""
import pytest

from app.core import thresholds as th


def test_every_detector_has_thresholds():
    for name in ("corner_patch_trigger", "label_flip_knn", "near_duplicate"):
        assert th.for_detector(name)


def test_unknown_detector_error_names_the_detector(monkeypatch):
    monkeypatch.setattr(th, "load", lambda: {"detectors": {"a": {"thresholds": {}}}})
    with pytest.raises(KeyError, match="nope"):
        th.for_detector("nope")


def test_detector_without_thresholds_mapping(monkeypatch):
    monkeypatch.setattr(th, "load", lambda: {"detectors": {"a": {"params": {}}}})
    with pytest.raises(KeyError, match="no 'thresholds'"):
        th.for_detector("a")
