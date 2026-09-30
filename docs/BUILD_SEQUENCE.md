# Build Sequence

## Phase-by-phase implementation order

1. **Foundation:** `00_MASTER_SPEC.md` + schemas + API contracts + repository skeleton.
2. **Requirements:** use `01_REQUIREMENTS_TRACEABILITY.md` as the acceptance checklist.
3. **Architecture:** implement boundaries from `02_ARCHITECTURE.md`.
4. **Data Integrity:** implement `03_DATA_INTEGRITY_ENGINE.md`.
5. **Model Integrity:** implement `04_MODEL_INTEGRITY_ENGINE.md`.
6. **Provenance:** implement `05_PROVENANCE_AUDIT_ENGINE.md`.
7. **Drift/OOD:** implement `06_DISTRIBUTION_SHIFT_ENGINE.md`.
8. **Evidence:** implement `07_EVIDENCE_CORRELATION.md`.
9. **Objective analysis:** implement `08_ATTACK_OBJECTIVE_INFERENCE.md`.
10. **Governance:** implement `09_RESPONSE_GOVERNANCE.md`.
11. **Backend integration:** implement `10_BACKEND.md` + `17_API_CONTRACT.md`.
12. **Frontend:** implement `11_FRONTEND.md`.
13. **Evaluation:** implement `13_ATTACK_LAB_AND_EVALUATION.md`.
14. **Offline packaging:** implement `14_OFFLINE_DEPLOYMENT.md`.
15. **Cross-phase validation:** run `16_TEST_PLAN.md`.
16. **Research/reporting:** update `18_RESEARCH_REFERENCES.md` when methods or dependencies change.

## Agent handoff rule

Never ask the next agent to infer what the previous agent intended. Handoffs must be expressed through:

- code interfaces;
- schemas;
- tests;
- documented outputs;
- known limitations.
