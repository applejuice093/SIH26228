# CV-TRUST — SIH 26228

Offline, air-gapped assurance platform for computer-vision pipelines: training-data integrity, model integrity, inference provenance, distribution-shift assessment and analyst-facing governance.

## Repository layout

```text
docs/       Full specification (start with docs/README.md and docs/00_MASTER_SPEC.md)
frontend/   Analyst console (React + TypeScript + Vite + Tailwind)
backend/    Assessment engines and FastAPI service (see backend/README.md)
```

## Quick start

```bash
# backend (Python 3.10+)
cd backend && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
pytest -q                                   # label-flip tests skip without offline weights
uvicorn app.main:app --host 127.0.0.1 --port 8000

# frontend (Node 20+), in another shell
cd frontend && npm ci
npm test && npm run build
VITE_API_BASE=http://127.0.0.1:8000 npm run dev   # omit VITE_API_BASE for mock mode
```

## Status

- [x] Specification imported
- [x] Frontend analyst console on mock API (live: https://cvtrust-sih26228.vercel.app)
- [x] Backend: FastAPI `/api/v1` with data-integrity engine (corner-patch trigger, label-flip kNN, near-duplicate), SQLite persistence and an audit chain; see backend/README.md
- [ ] Model integrity, provenance, drift engines
