# 17 — API Contract

## 1. API principles

- versioned under `/api/v1`;
- JSON by default;
- file uploads use multipart/form-data;
- long-running assessments are asynchronous;
- errors use structured error bodies;
- all IDs are opaque strings.

## 2. Create asset

`POST /api/v1/assets`

Response:

```json
{
  "asset_id": "AST-001",
  "sha256": "sha256:...",
  "status": "UNTRUSTED"
}
```

## 3. Start assessment

`POST /api/v1/assessments`

```json
{
  "asset_id": "AST-001",
  "assessment_type": "DATASET_INTEGRITY",
  "reference_asset_ids": [],
  "options": {
    "access_mode": "AUTO"
  }
}
```

Response:

```json
{
  "assessment_id": "ASM-001",
  "status": "QUEUED"
}
```

## 4. Assessment status

`GET /api/v1/assessments/{id}`

```json
{
  "assessment_id": "ASM-001",
  "status": "SUCCEEDED",
  "progress": 1.0,
  "finding_ids": ["FND-1", "FND-2"]
}
```

## 5. Findings

`GET /api/v1/findings`

Filters:

```text
severity
status
asset_id
contributor_id
assessment_id
```

## 6. Incident

`GET /api/v1/incidents/{id}`

Returns:

- incident summary;
- findings;
- evidence references;
- objective hypotheses;
- blast radius;
- dispositions;
- limitations.

## 7. Evidence graph

`GET /api/v1/incidents/{id}/graph`

```json
{
  "nodes": [
    {"id": "AST-1", "type": "DATASET"}
  ],
  "edges": [
    {"source": "C17", "target": "AST-1", "relation": "SUBMITTED"}
  ]
}
```

## 8. Objective hypotheses

`GET /api/v1/incidents/{id}/objective`

Must return:

- hypothesis;
- supporting evidence IDs;
- alternatives;
- confidence/support score;
- intent attribution status;
- ATLAS mapping if available.

## 9. Provenance verification

`POST /api/v1/provenance/verify`

Input:

```json
{
  "record_path": "...",
  "expected_key_ids": ["KEY-01"]
}
```

Output:

```json
{
  "signature_valid": true,
  "input_hash_valid": true,
  "model_hash_valid": true,
  "output_hash_valid": false,
  "replay_detected": false,
  "overall": "TAMPERED"
}
```

## 10. Disposition

`POST /api/v1/dispositions`

```json
{
  "finding_id": "FND-1",
  "action": "QUARANTINE",
  "reason": "Analyst reviewed supporting evidence",
  "actor_id": "ANALYST-01"
}
```

This endpoint must create an audit event.

## 11. Audit verification

`POST /api/v1/audit/verify`

Returns:

```text
chain_valid
signatures_valid
checkpoints_valid
first_failure
```

## 12. Compatibility rule

Breaking changes require a new API version.
