# 18 — Research References

## 1. SIH problem statement

**SIH26228:** Trustworthy Computer Vision Integrity Assurance for Data, Models and Inference Outputs in Multi-Contributor Pipelines.

Current community-maintained mirror used for this research:

- https://sih2026.vuce.in/ps/SIH26228

The mirror identifies the organization as Ministry of Defence (MoD), department as Indian Army (DGIS), category Software, theme Blockchain & Cybersecurity, and reproduces the detailed capabilities and constraints. The official SIH portal is referenced from that page as `https://sih.gov.in`.

For submission-critical facts, prefer the official SIH portal over mirrors.

## 2. NIST adversarial ML taxonomy

NIST AI 100-2 E2025, *Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations* (March 2025).

- https://csrc.nist.gov/pubs/ai/100/2/e2025/final
- PDF: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf

Useful for:

- lifecycle-stage thinking;
- attacker objectives;
- attacker capabilities/knowledge;
- poisoning/evasion taxonomy;
- mitigation terminology.

## 3. MITRE ATLAS

MITRE ATLAS is a living knowledge base of adversary tactics and techniques involving AI systems.

- https://atlas.mitre.org/

Use it to map observed technical behavior to a standardized AI threat vocabulary when a clear mapping exists.

## 4. NIST AI RMF

NIST AI Risk Management Framework 1.0 and related resources.

- https://www.nist.gov/itl/ai-risk-management-framework
- https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10

Useful for governance, testing/evaluation and trustworthy AI lifecycle concepts.

## 5. Cryptographic hashing

NIST FIPS 180-4, Secure Hash Standard.

- https://www.nist.gov/publications/secure-hash-standard
- https://csrc.nist.gov/pubs/fips/180-4/upd1/final

Useful for artifact digests and tamper detection.

## 6. Digital signatures / Ed25519

RFC 8032 — Edwards-Curve Digital Signature Algorithm (EdDSA).

- https://www.rfc-editor.org/rfc/rfc8032.html

NIST FIPS 186-5, Digital Signature Standard.

- https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf

Use established libraries; do not implement signature primitives manually.

## 7. Key management

NIST SP 800-57 Part 1 Rev. 5.

- https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final

Relevant to separate keys, trust anchors, protection, rotation and lifecycle management.

## 8. C2PA provenance

C2PA Specifications, especially hard cryptographic content bindings and security considerations.

- https://spec.c2pa.org/specifications/
- https://spec.c2pa.org/specifications/specifications/2.4/specs/ContentCredentials.html
- https://spec.c2pa.org/specifications/specifications/2.4/security/Security_Considerations.html

Use as a conceptual reference for cryptographic binding between provenance and content. CV-TRUST is not automatically C2PA-compliant.

## 9. in-toto attestations

in-toto Attestation Framework.

- https://github.com/in-toto/attestation
- https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md

Useful for subject-digest binding and structured attestations.

## 10. SLSA provenance

SLSA v1.1 and provenance documentation.

- https://slsa.dev/spec/v1.1/
- https://github.com/slsa-framework/slsa/blob/main/spec/build-provenance.md

Useful for thinking about verifiable artifact lineage: where, when and how an artifact was produced.

## 11. ONNX external data

ONNX documentation on external model data.

- https://onnx.ai/onnx/repo-docs/ExternalData.html

Important because a model's actual bytes may be split between the `.onnx` protobuf and external tensor files. The manifest must hash and inventory all relevant model components.

## 12. Backdoor research

### Spectral Signatures in Backdoor Attacks

- https://arxiv.org/abs/1811.00636

Representation/statistical signatures for detecting poisoned examples.

### Activation Clustering

- https://arxiv.org/abs/1811.03728

Cluster-based analysis of learned representations for poisoned-data/backdoor detection.

### Neural Cleanse

IEEE S&P 2019 research presentation/reference:

- https://people.cs.uchicago.edu/~ravenben/publications/abstracts/backdoor-sp19.html

Useful for trigger search/reconstruction concepts.

### STRIP

- https://arxiv.org/abs/1902.06531

Perturbation-based runtime detection research for trojan inputs.

## 13. Distribution shift / OOD

### Anomaly Detection Under Distribution Shift, ICCV 2023

- https://openaccess.thecvf.com/content/ICCV2023/html/Cao_Anomaly_Detection_Under_Distribution_Shift_ICCV_2023_paper.html

Useful for the distinction between anomalous behavior and ordinary distribution changes such as lighting/background/environment shifts.

### Recent Advances in OOD Detection: Problems and Approaches

- https://arxiv.org/abs/2409.11884

Useful overview of OOD detection families and scenarios.

## 14. OWASP ML Security Top 10

- https://owasp.org/projects/machine-learning-security-top-ten/

Use as additional security threat context. The project is a draft/community-driven OWASP effort, so cite its status accurately.

## 15. Research caution

Research methods such as Neural Cleanse, activation clustering, spectral signatures and OOD scores are not universal proofs of compromise. Attackers can adapt to defenses, benign data can look anomalous, and limited access can reduce observability. The platform must therefore retain:

```text
method
version
baseline
threshold
input coverage
access mode
confidence
limitations
```

for every security conclusion.
