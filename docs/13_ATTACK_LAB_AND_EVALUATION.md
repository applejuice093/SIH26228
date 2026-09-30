# 13 — Attack Lab & Evaluation

## 1. Goal

Create a reproducible local benchmark that proves the system works on controlled clean, benign-shift and adversarial scenarios.

## 2. Lab structure

```text
attack_lab/
├── clean/
├── data_poisoning/
│   ├── label_flip/
│   ├── systematic_mislabel/
│   ├── duplicate_flood/
│   ├── trigger_injection/
│   └── ood_insertion/
├── model_integrity/
│   ├── substitution/
│   ├── modified_artifact/
│   └── backdoor_like/
├── inference_integrity/
│   ├── output_tamper/
│   ├── replay/
│   └── record_substitution/
├── distribution_shift/
│   ├── illumination/
│   ├── sensor/
│   ├── season/
│   └── acquisition/
└── manifests/
```

## 3. Controlled scenarios

### Dataset scenarios

Create synthetic modifications to public/team-generated datasets:

- flip labels for a controlled fraction;
- duplicate/near-duplicate flooding;
- insert known OOD samples;
- add controlled trigger patterns;
- create a systematic annotation error.

### Model scenarios

- rename/replace model artifact;
- modify a controlled subset of weights where feasible;
- use a deliberately backdoored research model or lab-created model;
- change metadata/config without changing weights.

### Inference scenarios

- edit an output file after generation;
- replay an old valid inference record;
- substitute output from another input;
- alter preprocessing configuration in the record.

### Benign scenarios

- change brightness/illumination;
- new sensor;
- different season/domain;
- expected class-frequency shift;
- image compression change.

## 4. Evaluation metrics

### Detection

- precision;
- recall;
- F1;
- false-positive rate;
- false-negative rate.

### Ranking

- evidence ranking quality;
- top-k suspicious samples;
- contributor ranking consistency.

### Calibration

- reliability diagram;
- Brier score;
- expected calibration error (ECE).

### Provenance

- tamper detection rate;
- replay detection rate;
- false acceptance rate.

### Performance

- images/sec;
- model load time;
- assessment duration;
- peak RAM;
- optional GPU usage.

## 5. Reproducibility manifest

Every scenario must have:

```json
{
  "scenario_id": "DATA-LABEL-FLIP-001",
  "base_dataset_hash": "...",
  "transform_version": "1.0.0",
  "random_seed": 42,
  "attack_parameters": {},
  "expected_signal": ["label_consistency_anomaly"],
  "expected_status": "DETECTED"
}
```

## 6. Evaluation matrix

| Scenario | Expected detector | Expected outcome |
|---|---|---|
| clean | all | no high-risk incident |
| label flip | Data | finding |
| duplicate flood | Data | finding |
| OOD insertion | Data/Drift | finding |
| trigger injection | Data/Model | finding or limitation |
| model substitution | Model/Provenance | finding |
| backdoor-like model | Model | finding or limitation |
| output tampering | Provenance | verified detection |
| replay | Provenance | verified detection |
| benign illumination shift | Drift | shift, not attack by itself |
| sensor change | Drift | shift characterization |
| correlated multi-stage incident | Correlator | reconstructed incident |

## 7. Demo acceptance

The strongest demo runs one storyline:

```text
trusted baseline
  ↓
introduce controlled contributor anomaly
  ↓
assess dataset
  ↓
associate training/model
  ↓
assess model
  ↓
run signed inference
  ↓
tamper/replay selected record
  ↓
detect incident
  ↓
correlate evidence
  ↓
produce objective hypothesis
  ↓
show blast radius
  ↓
quarantine/rollback disposition
  ↓
verify audit trail
```

## 8. Definition of done

No demo claim is accepted unless there is a reproducible fixture and automated test behind it.
