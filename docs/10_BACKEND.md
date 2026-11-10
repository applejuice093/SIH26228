# 10 — Backend Implementation Guide

## 1. Stack

- Python 3.11+
- FastAPI
- Pydantic v2
- SQLAlchemy 2 or SQLModel
- SQLite MVP
- Alembic migrations
- NumPy/SciPy/scikit-learn
- Pillow/OpenCV
- PyTorch
- ONNX + ONNX Runtime
- `cryptography`
- NetworkX

## 2. Backend layers

```text
HTTP Router
    ↓
Application Service
    ↓
Domain / Use Case
    ↓
Detector / Engine
    ↓
Repository
    ↓
SQLite / Filesystem
```

Do not place ML logic directly inside route functions.

## 3. Suggested package tree

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── core/
│   ├── domain/
│   ├── services/
│   ├── engines/
│   │   ├── data_integrity/
│   │   ├── model_integrity/
│   │   ├── provenance/
│   │   ├── drift/
│   │   ├── evidence/
│   │   ├── objectives/
│   │   └── governance/
│   ├── adapters/
│   │   ├── datasets/
│   │   └── models/
│   ├── repositories/
│   ├── schemas/
│   └── workers/
├── migrations/
├── tests/
└── scripts/
```

## 4. Core routes

```text
POST   /api/v1/assets
GET    /api/v1/assets/{id}
POST   /api/v1/assessments
GET    /api/v1/assessments/{id}
GET    /api/v1/findings
GET    /api/v1/findings/{id}
GET    /api/v1/incidents/{id}
GET    /api/v1/incidents/{id}/graph
GET    /api/v1/incidents/{id}/timeline
GET    /api/v1/incidents/{id}/objective
POST   /api/v1/dispositions
POST   /api/v1/provenance/verify
POST   /api/v1/audit/verify
GET    /api/v1/reports/{id}
GET    /api/v1/capabilities
```

## 5. Background jobs

Assessment jobs should be durable in SQLite:

```text
QUEUED
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

A lightweight worker process is enough for MVP.

## 6. File handling security

- store uploaded files outside the web root;
- never execute uploaded scripts;
- verify file size limits;
- enforce allowed extensions + content sniffing;
- generate internal asset IDs;
- hash raw bytes immediately;
- use random working directories;
- sanitize filenames;
- isolate model inference processes;
- never load untrusted Python pickle files by default.

## 7. Model security rule

Prefer safe formats:

- ONNX;
- TorchScript.

Treat arbitrary Python pickles/checkpoints as high risk unless the deployment explicitly supports a trusted loader and isolation policy. PyTorch's general serialization history has included formats that can execute Python during loading; therefore the MVP should not silently load untrusted pickle content.

## 8. Error handling

All detector failures must become structured capability/analysis errors, not silent crashes.

```json
{
  "code": "MODEL_ACTIVATION_UNAVAILABLE",
  "message": "Intermediate activations could not be collected.",
  "recoverable": true,
  "fallback": "black_box_behavioral"
}
```

## 9. Logging

Application logs and forensic audit events are different:

```text
application log = operational debugging
forensic audit = integrity-relevant record
```

Never treat ordinary application logs as the authoritative audit trail.

## 10. Definition of done

- [ ] project skeleton.
- [ ] configuration system.
- [ ] health endpoint.
- [ ] asset endpoints.
- [ ] assessment job lifecycle.
- [ ] finding endpoints.
- [ ] incident endpoints.
- [ ] provenance verifier.
- [ ] audit verifier.
- [ ] report endpoint.
- [ ] API integration tests.

## 11. Implementation notes (current `backend/`)

Behaviour worth knowing when operating or extending the implemented API:

- **Validation errors** always return `422` with `{"error": {"code": "VALIDATION_ERROR", "details": [...]}}`; details are JSON-encoded, so custom validators cannot turn them into a `500`.
- **CORS** allows only `GET` and `POST` with a `Content-Type` header, from the origins in `CVTRUST_CORS_ORIGINS`.
- **Corner-patch detector** skips images whose shorter side is 13 px or less (too small for the smallest 12 px window) and lists them in `baseline.batch.images_too_small` instead of failing the assessment.
- **Label-flip detector** ignores malformed zero/negative-size boxes when computing per-image box scale; batches with `<= k` assessable boxes return no evidence and report `k`.
- **Thresholds**: a detector missing from `config/thresholds.json` fails with a message naming it.
- **Weights**: `scripts/fetch_weights.py` downloads via a `.part` file (60 s socket timeout) and verifies the SHA-256; `*.pth` / `*.pt` are git-ignored.
- **Tests**: `cd backend && pytest` (label-flip and embedding-confirmation tests skip when the ResNet-18 weights are not present locally).
