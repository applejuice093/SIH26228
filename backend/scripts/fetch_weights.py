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



def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, out: Path, timeout: float = 60.0) -> None:
    """Stream ``url`` to ``out`` via a ``.part`` file so an interrupted run leaves nothing behind."""
    tmp = out.with_name(out.name + ".part")
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r, open(tmp, "wb") as f:
            for chunk in iter(lambda: r.read(1 << 20), b""):
                f.write(chunk)
        tmp.replace(out)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def main() -> None:
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".cache" / "cvtrust" / "weights"
    dest.mkdir(parents=True, exist_ok=True)
    p = dest / WEIGHTS_FILE
    if not p.exists():
        try:
            download(WEIGHTS_URL, p)
        except OSError as e:
            raise SystemExit(f"download failed: {e}") from e
    d = sha256_file(p)
    if d != WEIGHTS_SHA256:
        p.unlink()
        raise SystemExit(f"digest mismatch: {d} (file removed; re-run to download again)")
    print(f"ok {p}")


if __name__ == "__main__":
    main()
