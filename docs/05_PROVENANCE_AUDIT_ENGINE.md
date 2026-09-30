# 05 — Provenance & Audit Engine

## 1. Goal

Create a cryptographically verifiable binding between an input, model, preprocessing/inference configuration and resulting output, plus a tamper-evident sequence of audit events.

## 2. Cryptographic design

Use SHA-256 for digests and Ed25519/EdDSA for signatures in the MVP.

Conceptually:

```text
canonical_record
      ↓
SHA-256
      ↓
record_digest
      ↓
Ed25519 signature
```

The cryptographic design must be versioned and canonicalized so two implementations produce the same bytes before signing.

## 3. Inference attestation

```json
{
  "schema": "cvtrust.inference/v1",
  "event_id": "INF-000001",
  "sequence": 1,
  "timestamp": "2026-09-30T12:00:00Z",
  "nonce": "base64url...",
  "input": {
    "asset_id": "IMG-1",
    "sha256": "..."
  },
  "model": {
    "asset_id": "MODEL-1",
    "sha256": "..."
  },
  "preprocessing": {
    "config_sha256": "...",
    "config": {"resize": [640, 640]}
  },
  "inference": {
    "config_sha256": "...",
    "config": {"confidence_threshold": 0.5}
  },
  "output": {
    "sha256": "..."
  },
  "previous_event_hash": "...",
  "record_digest": "...",
  "signature": {
    "algorithm": "Ed25519",
    "key_id": "KEY-01",
    "value": "..."
  }
}
```

## 4. Canonicalization

Use deterministic JSON serialization:

- UTF-8;
- stable key ordering;
- no insignificant whitespace;
- explicit null policy;
- normalized numeric representation;
- schema version included.

Prefer RFC 8785 JSON Canonicalization Scheme (JCS) or an equivalent documented canonicalizer.

## 5. Replay resistance

Checks should include:

- event ID uniqueness;
- nonce uniqueness within the configured scope;
- strictly increasing sequence when ordering is available;
- timestamp sanity window;
- previous-event hash continuity;
- record digest consistency;
- signature verification.

A replayed old event can remain cryptographically valid as an old event, so the verifier must additionally detect its **reuse in a context where the event ID/nonce/sequence must be fresh**.

## 6. Output tamper detection

```text
stored output bytes
       ↓
SHA-256
       ↓
compare with attested output hash
       ↓
verify signature over canonical record
```

## 7. Tamper-evident audit chain

```mermaid
flowchart LR
    E1[Event 1] --> E2[Event 2]
    E2 --> E3[Event 3]
    E3 --> E4[Event 4]
    E1 -. previous hash .-> E2
    E2 -. previous hash .-> E3
    E3 -. previous hash .-> E4
    E4 --> M[Merkle Root / Checkpoint]
```

Each record contains `previous_event_hash`.

Periodically calculate a Merkle root over a batch of events and store it as a checkpoint.

## 8. Audit storage

MVP:

```text
SQLite
 + append-only event table
 + append-only JSONL export
 + checkpoint table
```

The system should offer an offline verifier:

```bash
cvtrust verify-audit --ledger ledger.db --checkpoint checkpoints.json
```

## 9. Key management

Separate keys by purpose:

```text
ASSET_SIGNING_KEY
INFERENCE_SIGNING_KEY
AUDIT_CHECKPOINT_KEY
```

Do not reuse one key for unrelated signing purposes.

Keys must be loaded from a local protected trust store in the pilot deployment. The signing private key must never be sent to the frontend.

## 10. Optional standards alignment

The attestation shape may borrow concepts from:

- in-toto attestations: subject + predicate + envelope;
- SLSA provenance: who/what/where/how an artifact was produced;
- C2PA hard bindings: cryptographic association between content and provenance.

Do not claim that CV-TRUST itself is formally compliant with any standard unless an explicit compliance test is implemented.

## 11. Definition of done

- [ ] SHA-256 utility.
- [ ] Ed25519 key generation.
- [ ] canonical attestation serialization.
- [ ] sign/verify.
- [ ] inference record generator.
- [ ] replay verifier.
- [ ] tamper verifier.
- [ ] hash-chain ledger.
- [ ] checkpoint/Merkle support.
- [ ] offline audit export.
- [ ] standalone verification CLI.
