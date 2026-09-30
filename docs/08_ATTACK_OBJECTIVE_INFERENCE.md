# 08 — Probable Attack Objective Inference

## 1. Purpose

After technical detection, infer what **technical objective** best explains the evidence.

This is an evidence-analysis feature, not mind-reading and not identity attribution.

## 2. Output vocabulary

Primary hypotheses:

```text
SELECTIVE_DEGRADATION
PERSISTENT_CONDITIONAL_MANIPULATION
DATASET_CONTAMINATION
SUPPLY_CHAIN_SUBSTITUTION
INFERENCE_OUTPUT_MANIPULATION
REPLAY_OR_STALE_RESULT_INJECTION
OPERATIONAL_DISRUPTION
DEFENSE_EVASION_OR_CONCEALMENT
BENIGN_OPERATIONAL_DRIFT
ACCIDENTAL_DATA_QUALITY_FAILURE
UNRESOLVED
```

The taxonomy can be mapped to MITRE ATLAS concepts where a clear correspondence exists.

## 3. Evidence-to-hypothesis matrix

| Observation | Supports | Does not prove |
|---|---|---|
| model digest mismatch | substitution | malicious intent |
| same trigger causes target-specific output | conditional manipulation | who inserted it |
| suspicious samples cluster in one contributor batch | contamination | contributor intent |
| output hash mismatch | output tampering | reason for tampering |
| nonce/sequence reuse | replay | operational motive |
| only night images shift | benign drift | absence of all attacks |
| anomaly concentrated after model replacement | supply-chain event | attacker identity |

## 4. Objective inference algorithm

```text
1. Collect incident evidence.
2. Normalize to a common feature vector.
3. Generate candidate hypotheses.
4. Score hypotheses using transparent rules.
5. Penalize unsupported assumptions.
6. Compare against benign alternatives.
7. Produce ranked hypotheses internally.
8. Expose the top supported hypothesis + alternatives + evidence.
```

The internal ranking must be reproducible from stored evidence.

## 5. Feature vector

Example:

```json
{
  "stage": "training",
  "selectivity": 0.92,
  "persistence": 0.81,
  "trigger_condition": 0.88,
  "artifact_digest_mismatch": 0.00,
  "output_tamper": 0.00,
  "replay_signal": 0.00,
  "contributor_concentration": 0.77,
  "temporal_burst": 0.91,
  "environmental_drift": 0.12,
  "behavioral_divergence": 0.84
}
```

## 6. Example rule logic

### Selective conditional manipulation

Strong when:

- target selectivity is high;
- behavior is normal on nominal inputs;
- trigger-like condition causes repeatable target change;
- evidence appears across independent challenge samples.

### Supply-chain substitution

Strong when:

- expected digest differs;
- artifact/architecture metadata differs;
- behavioral fingerprint differs;
- provenance indicates a model transition point.

### Inference-output manipulation

Strong when:

- input hash matches expected;
- model digest matches expected;
- output hash/signature fails;
- tampering occurs after inference.

### Benign operational drift

Strong when:

- environmental metadata explains the shift;
- no strong contributor/model/provenance anomaly exists;
- drift is continuous rather than adversarially selective;
- behavior changes broadly rather than only for a targeted pattern.

## 7. Uncertainty language

Use:

- `Evidence is consistent with ...`
- `Most supported technical objective hypothesis ...`
- `Alternative explanation ...`
- `Intent is not directly observable from telemetry.`
- `Attribution is not established.`

Avoid:

- `The attacker definitely wanted ...`
- `Contributor X is malicious.`
- `The attacker is person Y.`

## 8. Optional local LLM layer

The objective engine should produce structured evidence first. A local LLM may then generate a narrative summary.

```text
Detectors → Evidence JSON → Objective Engine → Structured hypotheses
                                         ↓
                                  Optional local LLM
                                         ↓
                                  Human-readable text
```

The LLM must not alter the underlying hypothesis scores or invent evidence.

## 9. Definition of done

- [ ] hypothesis taxonomy.
- [ ] deterministic scoring rules.
- [ ] evidence requirements per hypothesis.
- [ ] benign alternatives.
- [ ] ATLAS mapping field.
- [ ] report narrative generator.
- [ ] tests for known attack scenarios and benign drift.
