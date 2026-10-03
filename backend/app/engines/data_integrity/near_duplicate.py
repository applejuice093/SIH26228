"""Near-duplicate detector: exact byte hash, pHash candidates, embedding confirmation.

Two-stage strategy from docs/03 section 5:

1. exact duplicates: identical sha256 of raw bytes;
2. candidates: 64-bit perceptual hash (DCT pHash, `imagehash.phash`), Hamming distance
   <= `phash_candidate_max` (deliberately loose for recall);
3. confirmation: cosine similarity of whole-image ResNet-18 embeddings
   >= `cosine_min`.

If the offline encoder is unavailable the detector falls back to pHash only, with the
stricter `phash_only_max` threshold, and says so in each evidence record.
Confirmed pairs are merged into groups (union-find); one evidence record per group.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass

import imagehash
import numpy as np
from PIL import Image

from app.engines.data_integrity import embeddings
from app.engines.data_integrity.dataset import YoloDataset
from app.engines.data_integrity.records import now_iso, stable_id
from app.schemas.records import Evidence

DETECTOR = "near_duplicate"
VERSION = "1.0.0"
HASH_METHOD = "imagehash.phash hash_size=8 (64-bit DCT)"
LIMITATIONS = [
    "pHash is not invariant to flips, rotations or large crops (more than about 10%); such copies are missed.",
    "Frames from the same static camera or video sequence can be genuinely near-identical; a flag means "
    "'visually redundant', not 'copied by a contributor'.",
    "Thresholds were fitted on one VisDrone-derived split; other imagery may need re-tuning.",
]


@dataclass
class PairScore:
    a: str
    b: str
    asset_a: str
    asset_b: str
    exact: bool
    hamming: int
    cosine: float | None


def score_pairs(ds: YoloDataset, phash_candidate_max: int, use_embeddings: bool = True) -> tuple[list[PairScore], dict]:
    hashes, thumbs = [], []
    for s in ds.samples:
        with Image.open(s.image_path) as im0:
            im = im0.convert("RGB")
        hashes.append(imagehash.phash(im))
        if use_embeddings:
            thumbs.append(np.asarray(im.resize((224, 224), Image.Resampling.BILINEAR), np.uint8))
    emb = embeddings.embed(np.stack(thumbs)) if use_embeddings and thumbs else None
    out = []
    n = len(ds.samples)
    dists = []
    for i, j in itertools.combinations(range(n), 2):
        a, b = ds.samples[i], ds.samples[j]
        d = int(hashes[i] - hashes[j])
        dists.append(d)
        exact = a.sha256 == b.sha256
        if exact or d <= phash_candidate_max:
            out.append(PairScore(a.sample_id, b.sample_id, a.asset_id, b.asset_id, exact, d,
                                 float(emb[i] @ emb[j]) if emb is not None else None))
    dists = np.array(dists) if dists else np.zeros(1)
    batch = {
        "images": n, "pairs_compared": int(n * (n - 1) // 2), "hash_method": HASH_METHOD,
        "hamming_p1": float(np.percentile(dists, 1)), "hamming_median": float(np.median(dists)),
        "encoder": embeddings.ENCODER if emb is not None else None,
    }
    return out, batch


def _groups(pairs: list[PairScore]) -> list[list[PairScore]]:
    parent: dict[str, str] = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for p in pairs:
        parent[find(p.a)] = find(p.b)
    by: dict[str, list[PairScore]] = {}
    for p in pairs:
        by.setdefault(find(p.a), []).append(p)
    return list(by.values())


def detect(ds: YoloDataset, thresholds: dict, use_embeddings: bool | None = None) -> tuple[list[Evidence], list[PairScore], dict]:
    use_emb = embeddings.available() if use_embeddings is None else (use_embeddings and embeddings.available())
    cand_max = int(thresholds["phash_candidate_max"]) if use_emb else int(thresholds["phash_only_max"])
    pairs, batch = score_pairs(ds, cand_max, use_emb)
    if use_emb:
        cmin = float(thresholds["cosine_min"])
        confirmed = [p for p in pairs if p.exact or (p.cosine is not None and p.cosine >= cmin)]
        rule = f"exact sha256 match OR (pHash Hamming <= {cand_max} AND embedding cosine >= {cmin})"
        mode = "phash+embedding"
    else:
        confirmed = [p for p in pairs if p.exact or p.hamming <= cand_max]
        rule = f"exact sha256 match OR pHash Hamming <= {cand_max} (embedding encoder unavailable; pHash-only fallback)"
        mode = "phash_only"
    ts = now_iso()
    out = []
    for grp in _groups(confirmed):
        members = sorted({x for p in grp for x in (p.a, p.b)})
        assets = sorted({x for p in grp for x in (p.asset_a, p.asset_b)})
        exact = all(p.exact for p in grp)
        worst = max(p.hamming for p in grp)
        cos = [p.cosine for p in grp if p.cosine is not None]
        conf = 0.99 if exact else round(float(min(0.97, 0.6 + 0.37 * (1 - worst / max(cand_max, 1)))), 3)
        out.append(Evidence(
            evidence_id=stable_id("EV", DETECTOR, VERSION, *assets),
            evidence_type="DATA_ANOMALY", detector=DETECTOR, detector_version=VERSION, access_mode="FILE_ONLY",
            asset_ids=assets,
            observation=(f"{len(members)} images are {'byte-identical' if exact else 'near-duplicates'}: {', '.join(members)}."),
            measurements={"duplicate_group_id": stable_id("DG", *assets), "match_type": "exact" if exact else "near",
                          "mode": mode, "sample_ids": members,
                          "pairs": [{"a": p.a, "b": p.b, "exact": p.exact, "hamming": p.hamming,
                                     "cosine": None if p.cosine is None else round(p.cosine, 4)} for p in grp],
                          "max_hamming": worst, "min_cosine": round(min(cos), 4) if cos else None},
            baseline={"batch": batch, "thresholds": {"phash_max": cand_max, **({"cosine_min": thresholds["cosine_min"]} if use_emb else {})}},
            decision_rule=rule, confidence=conf, severity="MEDIUM" if len(members) > 2 else "LOW",
            limitations=LIMITATIONS, created_at=ts,
        ))
    return out, confirmed, batch
