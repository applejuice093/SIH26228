# 00 — Master Specification

## 1. Executive objective

Build an offline, air-gapped assurance platform that evaluates computer-vision training data, contributed models, inference outputs and distribution changes across multiple untrusted contributors, then creates a defensible evidence chain and analyst-oriented incident report.

## 2. SIH problem statement, restated faithfully

The problem statement describes operational CV pipelines where:

- training data can come from multiple contributors;
- models can be pretrained or vendor-supplied;
- inference outputs can be consumed downstream;
- data may contain deliberate or accidental label errors, duplicates, OOD material or trigger-based backdoors;
- models may be substituted, modified or contain hidden behavior;
- inference records may be replayed, replaced or altered;
- existing controls often protect only an individual lifecycle component.

The requested solution is a unified evidence-based assurance layer that does not assume every contributing source is trustworthy.

## 3. Required capabilities

### Capability A — Training-data integrity

Detect or flag evidence consistent with:

- trigger injection;
- label flipping;
- systematic mislabeling;
- near-duplicate flooding;
- out-of-distribution insertion.

Aggregate sample-level evidence by contributor, batch or source where metadata exists.

### Capability B — Model integrity

Assess for anomalous, substituted or backdoor-like behavior using:

- behavioral fingerprinting;
- trigger search/reconstruction;
- parameter statistics;
- activation statistics;
- comparison to a reference challenge battery.

Declare access mode, confidence and limitations.

### Capability C — Inference provenance and output integrity

Cryptographically bind:

- input image;
- model identifier/weight digest;
- preprocessing configuration;
- inference configuration;
- output.

Use hashes, signatures and sequence/timestamp/nonce controls so post-hoc alteration, substitution and replay are detectable.

### Capability D — Distribution-shift and anomaly assessment

Detect and characterize material deviation from the reference distribution due to:

- terrain;
- season;
- sensor;
- illumination;
- acquisition conditions;
- other measurable environmental/domain factors.

Provide calibrated confidence/risk and distinguish probable operational drift from suspicious manipulation when evidence supports the distinction.

### Capability E — Analyst-facing assurance and governance

Every flag must present:

- human-readable reason;
- supporting evidence;
- confidence/severity;
- affected asset;
- recommended disposition (for example accept, review, quarantine).

Maintain a tamper-evident audit trail and explicitly declare unsupported conditions.

## 4. Extended CV-TRUST capabilities

These are extensions that build on the SIH requirements without replacing them.

### 4.1 Evidence correlation

Combine signals from data, model, provenance and drift engines into incident-level findings.

### 4.2 Attack reconstruction

Construct a causal/temporal evidence graph showing how an observed issue may have propagated across contributors, datasets, training runs, models and inference records.

### 4.3 Probable objective inference

Infer one or more **technical attack-objective hypotheses**, such as:

- selective degradation;
- persistent conditional manipulation;
- dataset contamination;
- supply-chain substitution;
- inference-result manipulation;
- replay/stale-result injection;
- operational disruption;
- defense evasion or concealment.

The output is probabilistic/evidential, not a claim about an attacker's private mental state.

### 4.4 Blast-radius analysis

Identify other assets, models, deployments or inference records that may be affected through the evidence graph.

### 4.5 Counterfactual impact test

Where feasible, re-evaluate using a quarantined dataset/model variant to estimate whether suspicious artifacts materially explain observed behavior.

## 5. Assurance states

Use an explicit state machine instead of a single opaque score:

```text
UNASSESSED
   ↓
ANALYSIS_RUNNING
   ↓
EVIDENCE_COLLECTED
   ↓
NO_SIGNIFICANT_ANOMALY / REVIEW_REQUIRED / QUARANTINE_RECOMMENDED
   ↓
HUMAN_DISPOSITION
   ↓
CLOSED / MONITORING / REMEDIATION
```

## 6. Evidence model

Every detection should produce an evidence item with:

```text
Evidence ID
Detector name/version
Input asset(s)
Observation
Measurement(s)
Reference baseline
Threshold or decision rule
Confidence/severity
Timestamp
Access mode
Limitations
```

## 7. Trust model

```text
Default = untrusted

Only after verification:
asset identity trusted
provenance trusted
model reference trusted
inference record trusted
```

Do not let one contributor-supplied field, filename or database row establish trust by itself.

## 8. Threat surfaces

| Surface | Example |
|---|---|
| Intake | replaced file, malformed metadata |
| Dataset | poison, label flip, duplicate flooding, OOD insertion |
| Contributor | concentrated anomalies, temporal burst |
| Training artifact | unauthorized model replacement |
| Model behavior | backdoor-like trigger response |
| Inference | output tampering, replay, substitution |
| Environment | sensor/illumination/season/domain shift |
| Audit layer | deletion, insertion, reordering, log alteration |
| Credentials | stolen signing key or compromised trust anchor |
| Analyst layer | misleading summary or unsupported inference |

## 9. Design principles

1. **Evidence over assertion.**
2. **Independent signals before high-severity conclusions.**
3. **Graceful degradation under limited model access.**
4. **Reproducibility over cleverness.**
5. **Offline-first.**
6. **Explicit uncertainty and coverage.**
7. **No mandatory retraining.**
8. **Deterministic security checks before optional AI-generated explanation.**
9. **Interfaces before implementation.**
10. **Human disposition remains authoritative for consequential actions.**

## 10. Primary user roles

### Analyst
Runs assessments, reviews findings, inspects evidence and selects disposition.

### System administrator
Installs offline bundle, manages trust anchors/keys and configuration.

### Integrator/developer
Adds dataset/model adapters and detectors.

### Auditor
Verifies logs, manifests, signatures and reproducibility.

## 11. Definition of done

The MVP is complete when:

- COCO and YOLO datasets can be ingested;
- ONNX and PyTorch/TorchScript models can be analyzed through adapters;
- dataset-level integrity scan produces sample and contributor evidence;
- model-level integrity scan works in white-box mode and degrades in black-box mode;
- signed inference records can be generated and verified;
- altered and replayed records are detected;
- distribution shift is characterized;
- correlated incident is shown as a graph/timeline;
- probable attack objective is output with supporting evidence and alternatives;
- analyst report contains required fields and limitations;
- audit ledger can be independently verified;
- a reproducible attack lab demonstrates the major supported cases;
- installation and runtime work with network disabled.
