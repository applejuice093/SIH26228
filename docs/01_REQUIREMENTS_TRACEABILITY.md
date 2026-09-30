# 01 — SIH26228 Requirements Traceability

## 1. Purpose

This document is the **acceptance contract**. Every SIH requirement must map to a concrete implementation, API, test and demo artifact.

## 2. Traceability matrix

| SIH requirement | CV-TRUST feature | Primary module | Acceptance test |
|---|---|---|---|
| Multi-contributor dataset assessment | contributor-aware dataset analysis | Data Integrity Engine | `DATA-MC-001` |
| Trigger injection detection | trigger indicators + cluster evidence | Data Integrity Engine | `DATA-TRG-001` |
| Label flipping | label consistency analysis | Data Integrity Engine | `DATA-LBL-001` |
| Systematic mislabeling | source-level label anomaly | Data Integrity Engine | `DATA-SYS-001` |
| Near-duplicate flooding | pHash + embedding similarity | Data Integrity Engine | `DATA-DUP-001` |
| OOD insertion | embedding/OOD detector | Data Integrity Engine + Drift Engine | `DATA-OOD-001` |
| Contributor aggregation | per-source evidence rollup | Evidence Correlator | `DATA-CON-001` |
| Model substitution | digest + architecture + behavior comparison | Model Engine | `MODEL-SUB-001` |
| Hidden/backdoor-like behavior | challenge battery + trigger analysis | Model Engine | `MODEL-BD-001` |
| Parameter/activation statistics | white-box adapter | Model Engine | `MODEL-WB-001` |
| Reference battery | versioned challenge suite | Model Engine | `MODEL-REF-001` |
| Graceful black-box fallback | black-box behavior adapter | Model Engine | `MODEL-BB-001` |
| Cryptographic inference binding | canonical attestation + signature | Provenance Engine | `PROV-BIND-001` |
| Post-hoc output alteration | rehash + signature verification | Provenance Engine | `PROV-TAMP-001` |
| Replay detection | nonce/sequence/timestamp/chain checks | Provenance Engine | `PROV-REPLAY-001` |
| Distribution shift | embedding/statistical drift | Drift Engine | `DRIFT-001` |
| Terrain/season/sensor/illumination characterization | domain metadata + feature attribution | Drift Engine | `DRIFT-DOM-001` |
| Calibrated confidence | held-out calibration set | Evidence Correlator | `RISK-CAL-001` |
| Drift vs manipulation | multi-signal correlation | Evidence Correlator | `DRIFT-MAN-001` |
| Analyst explanation | structured finding schema | Governance | `UI-FIND-001` |
| Evidence/severity/asset/disposition | Finding object | Governance/API | `UI-FIND-002` |
| Tamper-evident audit trail | hash chain + Merkle root | Audit | `AUDIT-001` |
| Unsupported coverage statement | capability registry | Governance | `COV-001` |
| Offline/air-gapped | offline packaging + network test | Deployment | `OFFLINE-001` |
| COCO + YOLO | ingestion adapters | Data Engine | `INGEST-001` |
| ONNX + PyTorch/TorchScript | model adapters | Model Engine | `MODEL-INGEST-001` |
| No baseline retraining | static/behavioral assessment | Model Engine | `NO-TRAIN-001` |
| Reproducible attacks | attack lab manifests | Evaluation | `LAB-001` |
| Source code + architecture + setup | repository docs | Documentation | `DOC-001` |
| Assurance report schema | canonical report JSON | Schemas | `REPORT-001` |
| Reproducible audit log | export + verifier | Audit | `AUDIT-002` |
| Supported classes + assumptions + limits | coverage manifest | Documentation | `COV-002` |

## 3. Requirement priority

### P0 — must work

- Offline runtime.
- COCO/YOLO ingestion.
- ONNX + PyTorch/TorchScript adapters.
- Dataset anomaly analysis.
- Contributor aggregation.
- Model integrity scan.
- Provenance signature/verification.
- Tamper/replay detection.
- Distribution-shift assessment.
- Findings + evidence + limitations.
- Tamper-evident audit log.

### P1 — strong differentiators

- Evidence graph.
- Attack reconstruction timeline.
- Probable objective inference.
- Blast radius.
- Counterfactual quarantine experiment.
- Model explainability panels.

### P2 — optional extensions

- Permissioned blockchain adapter.
- Hardware-backed keys.
- Advanced trigger reconstruction.
- Full graph database.
- Local LLM analyst copilot.
- Signed software SBOM/provenance integration.

## 4. Acceptance philosophy

The project must not pass acceptance because a dashboard renders. Acceptance requires **evidence generation + deterministic verification + reproducible attack cases**.
