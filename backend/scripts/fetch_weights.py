#!/usr/bin/env python3
"""One-time, ONLINE preparation step: download the ResNet-18 weights used for crop embeddings.

Copy the resulting file to the air-gapped host and point CVTRUST_WEIGHTS_DIR at its folder
(default ~/.cache/cvtrust/weights). The digest is verified on every load.
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.engines.data_integrity.embeddings import WEIGHTS_FILE, WEIGHTS_SHA256, WEIGHTS_URL  # noqa: E402

dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".cache" / "cvtrust" / "weights"
dest.mkdir(parents=True, exist_ok=True)
p = dest / WEIGHTS_FILE
if not p.exists():
    urllib.request.urlretrieve(WEIGHTS_URL, p)
d = hashlib.sha256(p.read_bytes()).hexdigest()
if d != WEIGHTS_SHA256:
    p.unlink()
    raise SystemExit(f"digest mismatch: {d}")
print(f"ok {p}")
