# 14 — Offline / Air-Gapped Deployment

## 1. Requirement

The complete evaluation workflow must run with **no network access** and no cloud/external API dependency.

## 2. Offline bundle

```text
offline_bundle/
├── install.sh / install.ps1
├── docker-compose.yml
├── backend-image.tar
├── frontend-image.tar
├── python-wheelhouse/
├── model_weights/
├── challenge_battery/
├── trust_store/
├── schemas/
├── migrations/
├── sample_data/
├── attack_lab/
├── docs/
└── checksums/
```

## 3. Dependency policy

At release time:

- pin Python dependencies;
- export wheelhouse;
- pin frontend dependencies and vendor required assets;
- package ML model weights locally;
- checksum every release artifact.

## 4. Network isolation test

Run the entire integration suite after disabling interfaces or applying a deny-all firewall.

Test:

```bash
cvtrust self-test --offline
```

Expected:

```text
Internet connectivity: BLOCKED
External API dependencies: NONE
Local model assets: OK
Local database: OK
Assessment engine: OK
Audit verifier: OK
```

## 5. Trust store

Store:

```text
trusted model manifests
reference dataset manifests
public verification keys
administrator policy
calibration artifacts
```

Never store private keys in frontend source or configuration committed to source control.

## 6. Optional blockchain adapter

Core MVP remains functional without blockchain.

Optional path:

```text
local audit hash chain
        ↓
Merkle root
        ↓
permissioned ledger adapter
```

The ledger adapter is an interoperability layer, not the foundation of detection.

## 7. Security hardening

- run workers with least privilege;
- isolate model execution;
- use read-only mounts for trusted assets where possible;
- separate upload storage from executable storage;
- enforce file quotas;
- encrypt sensitive storage where the deployment requirement demands it;
- maintain key rotation/revocation procedures;
- log failed signature verification.

## 8. Reproducible release

Generate:

```text
release_manifest.json
SHA256SUMS
version.json
SBOM (optional but recommended)
```

## 9. Definition of done

- [ ] offline installation.
- [ ] network-disabled integration test.
- [ ] local model bundle.
- [ ] trust store.
- [ ] checksums.
- [ ] reproducible sample assessment.
- [ ] standalone verifier.
