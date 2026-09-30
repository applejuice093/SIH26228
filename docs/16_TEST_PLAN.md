# 16 — Test Plan

## 1. Test pyramid

```text
                 System / E2E
                      ▲
               Integration Tests
                      ▲
                 Unit Tests
                      ▲
             Schema / Property Tests
```

## 2. Unit tests

### Security primitives

- SHA-256 known vectors;
- signature sign/verify;
- invalid signature rejection;
- canonicalization stability;
- nonce uniqueness;
- hash-chain continuity.

### Dataset

- valid COCO;
- malformed COCO;
- valid YOLO;
- malformed YOLO;
- exact duplicate fixture;
- near duplicate fixture;
- label flip fixture;
- OOD fixture.

### Model

- ONNX load;
- TorchScript load;
- black-box adapter;
- reference battery execution;
- output normalization;
- fingerprint repeatability.

### Drift

- identical distributions;
- known brightness shift;
- known sensor shift;
- OOD sample.

## 3. Integration tests

```text
ingest dataset → scan → evidence → finding
ingest model → scan → evidence → finding
inference → sign → store → verify
inference → tamper → verify fails
inference → replay → verify flags replay
```

## 4. Security tests

- path traversal via filenames;
- zip bomb/resource exhaustion protections;
- oversized image;
- malformed model file;
- unexpected ONNX external-data path;
- unsafe checkpoint loading prevention;
- SQL injection via filters;
- unauthorized disposition attempt;
- audit record deletion detection;
- sequence insertion/deletion detection;
- private key non-exposure.

## 5. Offline tests

Run all E2E tests with outbound network denied.

Fail the release if any runtime process attempts an external request.

## 6. Regression tests

Each fixed attack becomes a permanent fixture.

```text
regression/
  CVTRUST-001-output-tamper/
  CVTRUST-002-replay/
  CVTRUST-003-model-substitution/
  CVTRUST-004-duplicate-flood/
```

## 7. Acceptance gate

All P0 requirements must have passing automated acceptance tests before demo freeze.
