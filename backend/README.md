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
