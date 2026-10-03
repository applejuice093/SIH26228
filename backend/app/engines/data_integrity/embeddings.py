"""Local, offline image-crop embeddings (ResNet-18 ImageNet weights read from a local file).

Nothing is downloaded at runtime. Fetch the weights once on a connected machine with
`python scripts/fetch_weights.py`, then copy the file into the air-gapped host.
"""
from __future__ import annotations

import hashlib
import os
from functools import lru_cache
from pathlib import Path

import numpy as np

ENCODER = "torchvision-resnet18-imagenet1k-v1"
WEIGHTS_FILE = "resnet18-f37072fd.pth"
WEIGHTS_SHA256 = "f37072fd47e89c5e827621c5baffa7500819f7896bbacec160b1a16c560e07ec"
WEIGHTS_URL = "https://download.pytorch.org/models/resnet18-f37072fd.pth"


class EncoderUnavailable(RuntimeError):
    code = "EMBEDDING_ENCODER_UNAVAILABLE"


def weights_path() -> Path:
    d = os.environ.get("CVTRUST_WEIGHTS_DIR")
    cands = [Path(d)] if d else []
    cands += [Path.home() / ".cache" / "cvtrust" / "weights", Path.home() / ".cache" / "torch" / "hub" / "checkpoints"]
    for c in cands:
        if (c / WEIGHTS_FILE).exists():
            return c / WEIGHTS_FILE
    raise EncoderUnavailable(f"{WEIGHTS_FILE} not found in {[str(c) for c in cands]}; run scripts/fetch_weights.py")


@lru_cache(maxsize=1)
def _model():
    try:
        import torch
        import torchvision
    except ImportError as e:  # pragma: no cover
        raise EncoderUnavailable(f"torch/torchvision not installed: {e}") from e
    p = weights_path()
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    if digest != WEIGHTS_SHA256:
        raise EncoderUnavailable(f"weights digest mismatch for {p}: {digest}")
    m = torchvision.models.resnet18(weights=None)
    m.load_state_dict(torch.load(p, map_location="cpu", weights_only=True))  # weights_only: no pickle code execution
    m.fc = torch.nn.Identity()
    m.eval()
    torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
    return m


def available() -> bool:
    try:
        weights_path()
        import torch  # noqa: F401
        return True
    except (EncoderUnavailable, ImportError):
        return False


def embed(crops: np.ndarray, batch: int = 256) -> np.ndarray:
    """crops: (N, S, S, 3) uint8 RGB -> (N, 512) L2-normalised float32."""
    import torch

    m = _model()
    mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
    out = []
    with torch.no_grad():
        for i in range(0, len(crops), batch):
            x = torch.from_numpy(np.ascontiguousarray(crops[i:i + batch])).permute(0, 3, 1, 2).float() / 255
            out.append(m((x - mean) / std).numpy())
    f = np.concatenate(out) if out else np.zeros((0, 512), np.float32)
    return (f / (np.linalg.norm(f, axis=1, keepdims=True) + 1e-9)).astype(np.float32)
