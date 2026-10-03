"""Minimal YOLO dataset loader (images/ + labels/ + optional data.yaml)."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class Box:
    line: int
    cls: int
    cx: float
    cy: float
    w: float
    h: float


@dataclass
class Sample:
    sample_id: str          # path relative to dataset root, e.g. images/img_0001.jpg
    image_path: Path
    label_path: Path | None
    sha256: str             # "sha256:<hex>" of raw image bytes
    boxes: list[Box] = field(default_factory=list)
    label_errors: list[str] = field(default_factory=list)

    @property
    def asset_id(self) -> str:
        return "AST-IMG-" + self.sha256.split(":", 1)[1][:16]


@dataclass
class YoloDataset:
    root: Path
    names: list[str]
    samples: list[Sample]


def _read_names(root: Path) -> list[str]:
    y = root / "data.yaml"
    if not y.exists():
        return []
    names: dict[int, str] = {}
    in_names = False
    for raw in y.read_text().splitlines():
        line = raw.rstrip()
        if line.startswith("names:"):
            in_names = True
            rest = line.split(":", 1)[1].strip()
            if rest.startswith("["):
                return [s.strip().strip("'\"") for s in rest.strip("[]").split(",") if s.strip()]
            continue
        if in_names:
            if not line.startswith(" "):
                break
            k, _, v = line.strip().partition(":")
            if k.strip().lstrip("-").strip().isdigit():
                names[int(k)] = v.strip().strip("'\"")
    return [names[i] for i in sorted(names)]


def load_yolo(root: str | Path) -> YoloDataset:
    root = Path(root)
    img_dir = root / "images"
    if not img_dir.is_dir():
        raise FileNotFoundError(f"{img_dir} not found (expected YOLO layout images/ + labels/)")
    names = _read_names(root)
    samples = []
    for p in sorted(x for x in img_dir.rglob("*") if x.suffix.lower() in IMAGE_EXTS):
        rel = p.relative_to(root)
        lp = root / "labels" / p.relative_to(img_dir).with_suffix(".txt")
        s = Sample(rel.as_posix(), p, lp if lp.exists() else None, "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest())
        if s.label_path is None:
            s.label_errors.append("missing label file")
        else:
            for i, row in enumerate(s.label_path.read_text().splitlines()):
                parts = row.split()
                if not parts:
                    continue
                try:
                    c, cx, cy, w, h = int(parts[0]), *map(float, parts[1:5])
                except (ValueError, TypeError):
                    s.label_errors.append(f"line {i}: malformed row")
                    continue
                if len(parts) != 5 or not all(0 <= v <= 1 for v in (cx, cy, w, h)) or w <= 0 or h <= 0:
                    s.label_errors.append(f"line {i}: invalid geometry")
                if names and not 0 <= c < len(names):
                    s.label_errors.append(f"line {i}: class {c} out of range")
                s.boxes.append(Box(i, c, cx, cy, w, h))
        samples.append(s)
    return YoloDataset(root, names, samples)
