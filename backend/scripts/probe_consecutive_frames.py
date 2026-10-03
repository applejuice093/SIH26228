#!/usr/bin/env python3
"""Diagnostic: how often does the frozen near-duplicate rule fire on consecutive VisDrone frames?

Uses every pair of consecutive frames (sorted by file name) within each sequence of
VisDrone2019-DET-val, resized like the batch (768 px). These pairs are NOT planted
duplicates, so every flag here is a 'natural' near-duplicate (redundant footage), which
would count as a false pair in a ground-truth evaluation. Writes the summary into
results/data_integrity_eval.json under near_duplicate.visdrone_consecutive_frames_probe.
"""
from __future__ import annotations

import io
import zipfile
from collections import defaultdict
from pathlib import Path

import imagehash
import numpy as np
from PIL import Image

from _common import RESULTS, read_json, write_json

from app.core import thresholds as th
from app.engines.data_integrity import embeddings

ZIP = Path.home() / ".cache" / "cvtrust" / "VisDrone2019-DET-val.zip"


def main() -> None:
    t = th.for_detector("near_duplicate")
    seqs = defaultdict(list)
    with zipfile.ZipFile(ZIP) as z:
        for n in sorted(z.namelist()):
            if n.startswith("VisDrone2019-DET-val/images/") and n.endswith(".jpg"):
                seqs[Path(n).stem.split("_")[0]].append(n)
        pairs = [(a, b) for v in seqs.values() for a, b in zip(v, v[1:])]
        need = sorted({x for p in pairs for x in p})
        hashes, thumbs, idx = [], [], {}
        for i, n in enumerate(need):
            im = Image.open(io.BytesIO(z.read(n))).convert("RGB")
            s = 768 / max(im.size)
            im = im.resize((round(im.width * s), round(im.height * s)), Image.Resampling.LANCZOS)
            idx[n] = i
            hashes.append(imagehash.phash(im))
            thumbs.append(np.asarray(im.resize((224, 224), Image.Resampling.BILINEAR)))
    emb = embeddings.embed(np.stack(thumbs))
    ham = np.array([hashes[idx[a]] - hashes[idx[b]] for a, b in pairs])
    cos = np.array([float(emb[idx[a]] @ emb[idx[b]]) for a, b in pairs])
    flag2 = (ham <= t["phash_candidate_max"]) & (cos >= t["cosine_min"])
    flag1 = ham <= t["phash_only_max"]
    probe = {
        "description": "Consecutive frames (sorted by name) within each VisDrone2019-DET-val sequence, all 76 sequences; "
                       "not planted, so every flag is a natural near-duplicate.",
        "sequences": len(seqs), "consecutive_pairs": len(pairs),
        "flagged_two_stage": int(flag2.sum()), "flagged_fraction_two_stage": round(float(flag2.mean()), 4),
        "flagged_phash_only_fallback": int(flag1.sum()), "flagged_fraction_phash_only": round(float(flag1.mean()), 4),
        "hamming_quantiles": {q: float(np.percentile(ham, q)) for q in (5, 25, 50)},
        "cosine_quantiles": {q: round(float(np.percentile(cos, q)), 4) for q in (50, 75, 95)},
    }
    res = read_json(RESULTS, {"detectors": {}})
    res["detectors"]["near_duplicate"]["visdrone_consecutive_frames_probe"] = probe
    write_json(RESULTS, res)
    print(probe)


if __name__ == "__main__":
    main()
