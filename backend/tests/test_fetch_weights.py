"""scripts/fetch_weights.py helpers (no network: file:// URLs only)."""
import importlib.util
import hashlib

import pytest

from tests.conftest import ROOT

_spec = importlib.util.spec_from_file_location("fetch_weights", ROOT / "scripts" / "fetch_weights.py")
fw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fw)


def test_download_and_hash_local_file(tmp_path):
    src = tmp_path / "src.bin"
    src.write_bytes(b"weights" * 1000)
    out = tmp_path / "out" / "w.pth"
    out.parent.mkdir()
    fw.download(src.as_uri(), out)
    assert out.read_bytes() == src.read_bytes()
    assert fw.sha256_file(out) == hashlib.sha256(src.read_bytes()).hexdigest()
    assert not (out.parent / "w.pth.part").exists()


def test_failed_download_leaves_no_partial_file(tmp_path):
    out = tmp_path / "w.pth"
    with pytest.raises(OSError):
        fw.download((tmp_path / "missing.bin").as_uri(), out)
    assert list(tmp_path.iterdir()) == []
