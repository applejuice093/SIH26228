# CV-TRUST backend

FastAPI service for the `/api/v1` contract in `docs/17_API_CONTRACT.md`. Runs fully offline.

## Run

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/api/v1/health
```

## Offline model weights

The label-flip detector embeds crops with ResNet-18 ImageNet weights read from a local file and never downloads at runtime.
On a connected machine, run `python scripts/fetch_weights.py` once (it saves to `~/.cache/cvtrust/weights` and checks the sha256). Then copy the file to
the air-gapped host and set `CVTRUST_WEIGHTS_DIR`. The weights are loaded with `torch.load(weights_only=True)`. Install CPU torch with
`pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu`.

## Test

```bash
cd backend && pytest -q
```

## Pointing the frontend at it

The frontend stays on its in-browser mock unless `VITE_API_BASE` is set:

```bash
cd frontend
VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```

CORS allows `http://localhost:5173` by default; override with `CVTRUST_CORS_ORIGINS` (comma-separated).

## Evaluation batch

`scripts/make_test_batch.py` builds two seeded YOLO batches from real VisDrone aerial photos with planted
corner-patch triggers, label flips and near-duplicates. TUNING (seed 1101) is used to pick thresholds, and TEST (seed 2202)
is held out. They are built from disjoint source sequences and committed under `testdata/` (about 11 MB). See `testdata/README.md`.

## Detectors and evaluation protocol

1. `python scripts/tune_thresholds.py --detector <name>` fits thresholds on **TUNING only** and freezes them in
   `config/thresholds.json`, recording the TUNING ground-truth digest.
2. `python scripts/evaluate.py --detector <name> --split test --split tuning` runs the frozen thresholds and writes
   `results/data_integrity_eval.{json,md}`. TEST is scored once, after the thresholds are committed.
3. `python scripts/probe_consecutive_frames.py` is a diagnostic that measures how often the frozen near-duplicate rule fires on consecutive VisDrone frames.
4. `pytest` re-runs every detector on TEST and checks that the output matches the committed results file.

| detector | module | what it flags |
|---|---|---|
| `corner_patch_trigger` | `app/engines/data_integrity/patch_trigger.py` | small square patches near image corners whose statistics differ from both the image's own windows and the batch's corner windows |
| `label_flip_knn` | `app/engines/data_integrity/label_flip.py` | YOLO boxes whose class disagrees with their k nearest neighbours in an offline ResNet-18 crop-embedding space (confident-learning style per-class baseline) |
| `near_duplicate` | `app/engines/data_integrity/near_duplicate.py` | exact copies (sha256) and near-duplicates: pHash Hamming candidates confirmed by embedding cosine, with a pHash-only fallback when no encoder is available |

Evidence records follow docs/12 section 4 (`app/schemas/records.py`), which rejects unknown fields and enum values.
