# 15 — Agent Build Protocol (Anti-Hallucination)

## 1. Purpose

This document is mandatory for coding agents. It prevents agents from attempting the entire project at once, inventing missing requirements, or silently changing interfaces.

## 2. Golden rule

**An agent may only implement the phase explicitly assigned to it and the minimum prerequisite interfaces required by that phase.**

## 3. Before coding

The agent MUST:

1. Read `README.md`.
2. Read `00_MASTER_SPEC.md`.
3. Read `01_REQUIREMENTS_TRACEABILITY.md`.
4. Read `02_ARCHITECTURE.md`.
5. Read `12_DATA_MODELS_AND_SCHEMAS.md`.
6. Read the phase-specific file.
7. Inspect the actual repository tree.
8. Inspect existing code before creating files.
9. Identify existing interfaces that must be preserved.

## 4. No invention rule

The agent must not invent:

- unsupported SIH requirements;
- APIs not present in `17_API_CONTRACT.md`;
- database fields outside `12_DATA_MODELS_AND_SCHEMAS.md` without updating the schema document;
- external cloud dependencies;
- model downloads at runtime;
- unverified attack claims;
- hidden background services.

If information is missing, leave a typed TODO and document exactly what is missing.

## 5. Change control

Before adding a new cross-module concept:

```text
Is the concept in the master spec?
       │
   yes │ no
       ▼  ▼
implement  document proposal + stop
```

Do not silently alter the architecture.

## 6. One phase at a time

Recommended build order:

```text
Phase 0  contracts/skeleton
Phase 1  intake + storage
Phase 2  data integrity
Phase 3  model integrity
Phase 4  provenance/audit
Phase 5  drift/OOD
Phase 6  evidence correlation
Phase 7  objective inference
Phase 8  governance/reporting
Phase 9  backend API integration
Phase 10 frontend
Phase 11 attack lab + calibration
Phase 12 offline packaging
```

## 7. Required output from each agent

At the end of each phase the agent must report:

```text
Implemented:
Changed files:
Interfaces added:
Tests added:
Tests passing:
Known limitations:
Next prerequisite:
```

## 8. Test-first rule

Every detector must have:

- clean fixture;
- positive attack fixture;
- benign edge fixture where relevant;
- deterministic seed;
- expected evidence type.

## 9. Security rule

Never make a detector return `MALICIOUS` solely because a machine-learning score is high. Return structured evidence and let the correlation/governance layer derive the incident state.

## 10. Cryptography rule

Do not implement custom cryptographic primitives. Use audited libraries.

Do not invent a custom signature format if a documented standard/canonical encoding can be reused.

## 11. Offline rule

Any package/model/API that requires network access at runtime is forbidden unless explicitly added as an optional non-MVP integration and isolated behind an adapter.

## 12. LLM rule

LLM output is explanatory. It cannot be the sole basis for:

- integrity verification;
- signature validation;
- evidence generation;
- quarantine;
- attribution.

## 13. Completion gate

A phase is complete only when:

```text
code exists
  AND
interfaces documented
  AND
tests exist
  AND
phase acceptance criteria pass
  AND
limitations documented
```

## 14. Prompt template for future agents

```text
You are implementing PHASE <N> of CV-TRUST.

Read:
- README.md
- 00_MASTER_SPEC.md
- 01_REQUIREMENTS_TRACEABILITY.md
- 02_ARCHITECTURE.md
- 12_DATA_MODELS_AND_SCHEMAS.md
- 17_API_CONTRACT.md
- <phase file>

Before coding:
- inspect the repository;
- preserve existing interfaces;
- do not invent unspecified requirements;
- do not add cloud/runtime internet dependencies;
- do not implement later phases;
- create tests with deterministic fixtures.

Deliver only this phase.
At completion provide:
- implemented files;
- tests;
- interfaces;
- known limitations;
- exact next dependency.
```
