// Deterministic example data for the offline demo. Not real assessment output.
import type {
  Asset, Assessment, AuditEvent, Capability, DriftSeries, Evidence, EvidenceGraph,
  Finding, Incident, ObjectiveHypothesis,
} from './types'

const h = (seed: string) => {
  let x = 0
  for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0
  let out = ''
  for (let i = 0; i < 8; i++) { x = (x * 1103515245 + 12345) >>> 0; out += x.toString(16).padStart(8, '0') }
  return out.slice(0, 64)
}

export const assets: Asset[] = [
  { asset_id: 'AST-001', asset_type: 'DATASET', name: 'aerial-vehicles-v3 (COCO)', sha256: h('AST-001'), byte_size: 4_812_330_112, source: { contributor_id: 'C04', submission_id: 'SUB-100' }, created_at: '2026-09-02T09:12:00+05:30', ingested_at: '2026-09-02T09:20:00+05:30', status: 'VERIFIED' },
  { asset_id: 'AST-002', asset_type: 'DATASET', name: 'batch-C17-0915 (YOLO)', sha256: h('AST-002'), byte_size: 612_004_224, source: { contributor_id: 'C17', submission_id: 'SUB-117' }, created_at: '2026-09-15T22:41:00+05:30', ingested_at: '2026-09-15T23:02:00+05:30', status: 'QUARANTINED' },
  { asset_id: 'AST-003', asset_type: 'DATASET', name: 'batch-C09-0916 (YOLO)', sha256: h('AST-003'), byte_size: 408_220_016, source: { contributor_id: 'C09', submission_id: 'SUB-121' }, created_at: '2026-09-16T11:05:00+05:30', ingested_at: '2026-09-16T11:30:00+05:30', status: 'UNTRUSTED' },
  { asset_id: 'AST-010', asset_type: 'MODEL', name: 'yolov8s-aerial (ONNX) rc4', sha256: h('AST-010'), byte_size: 44_812_004, source: { contributor_id: 'TRAIN-PIPE', submission_id: 'RUN-044' }, created_at: '2026-09-18T14:00:00+05:30', ingested_at: '2026-09-18T14:05:00+05:30', status: 'UNTRUSTED' },
  { asset_id: 'AST-011', asset_type: 'MODEL', name: 'yolov8s-aerial (ONNX) rc3 reference', sha256: h('AST-011'), byte_size: 44_790_112, source: { contributor_id: 'TRAIN-PIPE', submission_id: 'RUN-039' }, created_at: '2026-08-30T10:00:00+05:30', ingested_at: '2026-08-30T10:04:00+05:30', status: 'VERIFIED' },
  { asset_id: 'AST-012', asset_type: 'MODEL', name: 'vendor-detr-r50 (TorchScript)', sha256: h('AST-012'), byte_size: 166_400_900, source: { contributor_id: 'V02', submission_id: 'SUB-130' }, created_at: '2026-09-20T08:00:00+05:30', ingested_at: '2026-09-20T08:12:00+05:30', status: 'UNTRUSTED' },
  { asset_id: 'AST-020', asset_type: 'OUTPUT', name: 'inference-log-sector7-0924', sha256: h('AST-020'), byte_size: 2_300_112, source: { contributor_id: 'EDGE-07', submission_id: 'INF-2201' }, created_at: '2026-09-24T06:30:00+05:30', ingested_at: '2026-09-24T06:31:00+05:30', status: 'UNTRUSTED' },
  { asset_id: 'AST-030', asset_type: 'CONFIG', name: 'preprocess-640-letterbox.json', sha256: h('AST-030'), byte_size: 1_204, source: { contributor_id: 'TRAIN-PIPE', submission_id: 'CFG-7' }, created_at: '2026-08-01T10:00:00+05:30', ingested_at: '2026-08-01T10:00:00+05:30', status: 'VERIFIED' },
]

export const evidence: Evidence[] = [
  { evidence_id: 'EV-188', evidence_type: 'MODEL_BEHAVIOR', detector: 'target_selectivity', detector_version: '1.0.0', access_mode: 'WHITE_BOX', asset_ids: ['AST-010'], observation: 'Misclassification concentrated on class "truck" when a 12px corner patch is present.', measurements: { selectivity: 0.92, flip_rate_with_patch: 0.81, flip_rate_clean: 0.03 }, baseline: { reference_model: 'AST-011', flip_rate_with_patch: 0.04 }, decision_rule: 'selectivity >= 0.75 AND flip_rate delta >= 0.5', confidence: 0.88, severity: 'HIGH', limitations: ['Challenge battery covers 14 of 20 classes'], related_evidence_ids: ['EV-203', 'EV-221'], created_at: '2026-09-25T10:14:00+05:30' },
  { evidence_id: 'EV-203', evidence_type: 'MODEL_BEHAVIOR', detector: 'trigger_reconstruction', detector_version: '0.9.2', access_mode: 'WHITE_BOX', asset_ids: ['AST-010'], observation: 'Reconstructed trigger mask has anomalously small L1 norm for target class "truck".', measurements: { anomaly_index: 3.4, mask_l1: 41.2, median_mask_l1: 212.8 }, baseline: { anomaly_index_threshold: 2.0 }, decision_rule: 'MAD anomaly index > 2.0', confidence: 0.87, severity: 'HIGH', limitations: ['Reconstruction assumes patch-type trigger'], related_evidence_ids: ['EV-188'], created_at: '2026-09-25T10:20:00+05:30' },
  { evidence_id: 'EV-221', evidence_type: 'DATA_ANOMALY', detector: 'contributor_concentration', detector_version: '1.1.0', access_mode: 'FILE_ONLY', asset_ids: ['AST-002'], observation: '93% of samples with a repeated corner patch originate from contributor C17 in a 40-minute window.', measurements: { concentration: 0.77, flagged_samples: 318, window_minutes: 40 }, baseline: { expected_concentration: 0.08 }, decision_rule: 'Binomial tail p < 1e-6', confidence: 0.82, severity: 'HIGH', limitations: ['Contributor metadata is self-reported until verified'], related_evidence_ids: ['EV-188', 'EV-230'], created_at: '2026-09-24T18:02:00+05:30' },
  { evidence_id: 'EV-230', evidence_type: 'DATA_ANOMALY', detector: 'label_consistency', detector_version: '1.0.3', access_mode: 'FILE_ONLY', asset_ids: ['AST-002'], observation: '211 "truck" boxes relabelled as "car" relative to embedding-neighbour consensus.', measurements: { flip_candidates: 211, agreement: 0.12 }, baseline: { expected_agreement: 0.9 }, decision_rule: 'kNN label agreement < 0.3', confidence: 0.79, severity: 'MEDIUM', limitations: ['Neighbour consensus can be wrong for rare viewpoints'], related_evidence_ids: ['EV-221'], created_at: '2026-09-24T18:10:00+05:30' },
  { evidence_id: 'EV-241', evidence_type: 'DATA_ANOMALY', detector: 'near_duplicate', detector_version: '1.0.0', access_mode: 'FILE_ONLY', asset_ids: ['AST-003'], observation: '1,420 near-duplicate frames (pHash distance <= 4) in batch C09.', measurements: { duplicates: 1420, ratio: 0.34 }, baseline: { expected_ratio: 0.05 }, decision_rule: 'duplicate ratio > 0.15', confidence: 0.91, severity: 'MEDIUM', limitations: [], created_at: '2026-09-24T18:20:00+05:30' },
  { evidence_id: 'EV-260', evidence_type: 'PROVENANCE', detector: 'record_signature_verifier', detector_version: '1.0.0', access_mode: 'N_A', asset_ids: ['AST-020'], observation: '37 inference records have valid signatures but output hash mismatch.', measurements: { records: 5120, output_hash_mismatch: 37 }, baseline: { expected_mismatch: 0 }, decision_rule: 'Any mismatch is TAMPERED', confidence: 0.99, severity: 'CRITICAL', limitations: [], related_evidence_ids: ['EV-261'], created_at: '2026-09-25T07:40:00+05:30' },
  { evidence_id: 'EV-261', evidence_type: 'PROVENANCE', detector: 'replay_detector', detector_version: '1.0.0', access_mode: 'N_A', asset_ids: ['AST-020'], observation: '12 records reuse nonces from 2026-09-21 with shifted timestamps.', measurements: { replayed: 12 }, baseline: { expected: 0 }, decision_rule: 'Duplicate (key_id, nonce)', confidence: 0.99, severity: 'HIGH', limitations: [], created_at: '2026-09-25T07:42:00+05:30' },
  { evidence_id: 'EV-270', evidence_type: 'DISTRIBUTION_SHIFT', detector: 'factor_psi', detector_version: '1.2.0', access_mode: 'FILE_ONLY', asset_ids: ['AST-020'], observation: 'Illumination and cloud-cover shift consistent with monsoon acquisition.', measurements: { psi_illumination: 0.31, psi_cloud: 0.44, psi_sensor: 0.04 }, baseline: { psi_threshold: 0.25 }, decision_rule: 'PSI > 0.25 on environmental factor', confidence: 0.74, severity: 'LOW', limitations: ['Season inferred from EXIF dates and histogram features'], created_at: '2026-09-25T08:00:00+05:30' },
  { evidence_id: 'EV-280', evidence_type: 'MODEL_INTEGRITY', detector: 'weight_digest', detector_version: '1.0.0', access_mode: 'FILE_ONLY', asset_ids: ['AST-012'], observation: 'Vendor TorchScript digest does not match signed vendor manifest.', measurements: { manifest_match: 0 }, baseline: { manifest_match: 1 }, decision_rule: 'digest != manifest digest', confidence: 0.99, severity: 'HIGH', limitations: ['Manifest signature valid; mismatch could be packaging change'], created_at: '2026-09-26T09:00:00+05:30' },
]

export const findings: Finding[] = [
  { finding_id: 'FND-1', incident_id: 'INC-001', assessment_id: 'ASM-002', contributor_id: 'C17', summary: 'Backdoor-like trigger response in model rc4', reason: 'Target-selective flips with a reconstructed small trigger, absent in reference rc3.', evidence_ids: ['EV-188', 'EV-203'], affected_asset_ids: ['AST-010'], severity: 'HIGH', confidence: 0.88, status: 'OPEN', recommended_disposition: 'QUARANTINE', limitations: ['White-box access only for ONNX graph'] },
  { finding_id: 'FND-2', incident_id: 'INC-001', assessment_id: 'ASM-001', contributor_id: 'C17', summary: 'Trigger-patch samples and label flips concentrated in C17 batch', reason: 'Repeated corner patch plus truck-to-car relabels from one contributor in a short burst.', evidence_ids: ['EV-221', 'EV-230'], affected_asset_ids: ['AST-002'], severity: 'HIGH', confidence: 0.82, status: 'UNDER_REVIEW', recommended_disposition: 'QUARANTINE', limitations: [] },
  { finding_id: 'FND-3', incident_id: 'INC-002', assessment_id: 'ASM-003', contributor_id: 'C09', summary: 'Near-duplicate flooding in C09 batch', reason: '34% near-duplicates versus 5% expected.', evidence_ids: ['EV-241'], affected_asset_ids: ['AST-003'], severity: 'MEDIUM', confidence: 0.91, status: 'OPEN', recommended_disposition: 'REVIEW', limitations: [] },
  { finding_id: 'FND-4', incident_id: 'INC-001', assessment_id: 'ASM-004', contributor_id: 'EDGE-07', summary: 'Tampered and replayed inference records in sector 7', reason: 'Output hash mismatches with valid signatures, plus reused nonces.', evidence_ids: ['EV-260', 'EV-261'], affected_asset_ids: ['AST-020'], severity: 'CRITICAL', confidence: 0.99, status: 'OPEN', recommended_disposition: 'QUARANTINE', limitations: [] },
  { finding_id: 'FND-5', incident_id: 'INC-003', assessment_id: 'ASM-005', summary: 'Operational drift: monsoon illumination and cloud cover', reason: 'Environmental PSI above threshold; sensor factors stable.', evidence_ids: ['EV-270'], affected_asset_ids: ['AST-020'], severity: 'LOW', confidence: 0.74, status: 'OPEN', recommended_disposition: 'MONITOR', limitations: ['Season inference is indirect'] },
  { finding_id: 'FND-6', incident_id: 'INC-004', assessment_id: 'ASM-006', contributor_id: 'V02', summary: 'Vendor model digest mismatch', reason: 'Delivered TorchScript differs from signed vendor manifest.', evidence_ids: ['EV-280'], affected_asset_ids: ['AST-012'], severity: 'HIGH', confidence: 0.99, status: 'OPEN', recommended_disposition: 'REVIEW', limitations: ['Could be a benign repackaging'] },
]

export const assessments: Assessment[] = [
  { assessment_id: 'ASM-001', asset_id: 'AST-002', assessment_type: 'DATASET_INTEGRITY', status: 'SUCCEEDED', progress: 1, access_mode: 'FILE_ONLY', started_at: '2026-09-24T17:40:00+05:30', finding_ids: ['FND-2'] },
  { assessment_id: 'ASM-002', asset_id: 'AST-010', assessment_type: 'MODEL_INTEGRITY', status: 'SUCCEEDED', progress: 1, access_mode: 'WHITE_BOX', started_at: '2026-09-25T09:50:00+05:30', finding_ids: ['FND-1'] },
  { assessment_id: 'ASM-003', asset_id: 'AST-003', assessment_type: 'DATASET_INTEGRITY', status: 'SUCCEEDED', progress: 1, access_mode: 'FILE_ONLY', started_at: '2026-09-24T18:00:00+05:30', finding_ids: ['FND-3'] },
  { assessment_id: 'ASM-004', asset_id: 'AST-020', assessment_type: 'PROVENANCE', status: 'SUCCEEDED', progress: 1, access_mode: 'N_A', started_at: '2026-09-25T07:30:00+05:30', finding_ids: ['FND-4'] },
  { assessment_id: 'ASM-005', asset_id: 'AST-020', assessment_type: 'DISTRIBUTION_SHIFT', status: 'SUCCEEDED', progress: 1, access_mode: 'FILE_ONLY', started_at: '2026-09-25T07:55:00+05:30', finding_ids: ['FND-5'] },
  { assessment_id: 'ASM-006', asset_id: 'AST-012', assessment_type: 'MODEL_INTEGRITY', status: 'RUNNING', progress: 0.62, access_mode: 'BLACK_BOX', started_at: '2026-09-26T08:50:00+05:30', finding_ids: ['FND-6'] },
  { assessment_id: 'ASM-007', asset_id: 'AST-003', assessment_type: 'DISTRIBUTION_SHIFT', status: 'QUEUED', progress: 0, access_mode: 'FILE_ONLY', started_at: '2026-09-26T09:10:00+05:30', finding_ids: [] },
]

export const objectives: Record<string, ObjectiveHypothesis[]> = {
  'INC-001': [
    { hypothesis_id: 'OBJ-1', type: 'PERSISTENT_CONDITIONAL_MANIPULATION', supporting_evidence_ids: ['EV-188', 'EV-203', 'EV-221'], support_score: 0.82, confidence: 0.79, alternatives: [{ type: 'CORRELATED_LABEL_ERROR', confidence: 0.31 }, { type: 'UNKNOWN_DATA_GENERATION_ARTIFACT', confidence: 0.14 }], statement: 'Evidence is consistent with selective conditional manipulation of the "truck" class via a patch trigger.', intent_attribution: 'NOT_ESTABLISHED', atlas_references: ['AML.T0020 Poison Training Data', 'AML.T0018 Backdoor ML Model'] },
    { hypothesis_id: 'OBJ-2', type: 'INFERENCE_RESULT_MANIPULATION', supporting_evidence_ids: ['EV-260', 'EV-261'], support_score: 0.71, confidence: 0.9, alternatives: [{ type: 'EDGE_DEVICE_FAULT', confidence: 0.12 }], statement: 'Post-signature output alteration and replay in sector 7 inference logs.', intent_attribution: 'NOT_ESTABLISHED', atlas_references: ['AML.T0048 External Harms'] },
  ],
}

export const graphs: Record<string, EvidenceGraph> = {
  'INC-001': {
    nodes: [
      { id: 'C17', type: 'CONTRIBUTOR' }, { id: 'AST-002', type: 'DATASET', label: 'batch-C17-0915' },
      { id: 'AST-001', type: 'DATASET', label: 'aerial-vehicles-v3' }, { id: 'RUN-044', type: 'TRAINING_RUN' },
      { id: 'AST-010', type: 'MODEL', label: 'yolov8s rc4' }, { id: 'EDGE-07', type: 'DEPLOYMENT' },
      { id: 'AST-020', type: 'INFERENCE', label: 'sector7 log' }, { id: 'EV-221', type: 'EVIDENCE' },
      { id: 'EV-188', type: 'EVIDENCE' }, { id: 'EV-260', type: 'EVIDENCE' },
    ],
    edges: [
      { source: 'C17', target: 'AST-002', relation: 'SUBMITTED' },
      { source: 'AST-002', target: 'RUN-044', relation: 'CONSUMED_BY' },
      { source: 'AST-001', target: 'RUN-044', relation: 'CONSUMED_BY' },
      { source: 'RUN-044', target: 'AST-010', relation: 'PRODUCED' },
      { source: 'AST-010', target: 'EDGE-07', relation: 'DEPLOYED_TO' },
      { source: 'EDGE-07', target: 'AST-020', relation: 'EMITTED' },
      { source: 'EV-221', target: 'AST-002', relation: 'FLAGS' },
      { source: 'EV-188', target: 'AST-010', relation: 'FLAGS' },
      { source: 'EV-260', target: 'AST-020', relation: 'FLAGS' },
    ],
  },
}

const baseIncident = {
  dispositions: [], limitations: [] as string[],
  coverage: { data: 'COVERED', model: 'COVERED', provenance: 'COVERED', drift: 'PARTIAL' } as Incident['coverage'],
}

export const incidents: Incident[] = [
  { ...baseIncident, incident_id: 'INC-001', title: 'Conditional truck-class manipulation traced to contributor C17', state: 'QUARANTINE_RECOMMENDED', severity: 'CRITICAL', opened_at: '2026-09-25T10:30:00+05:30', summary: 'Poisoned C17 batch consumed by RUN-044 produced model rc4 with a patch-trigger response; downstream sector-7 inference records show tampering and replay.', finding_ids: ['FND-1', 'FND-2', 'FND-4'], evidence_ids: ['EV-188', 'EV-203', 'EV-221', 'EV-230', 'EV-260', 'EV-261'],
    blast_radius: [ { asset_id: 'AST-010', relation: 'trained on AST-002', risk: 'HIGH' }, { asset_id: 'AST-020', relation: 'emitted by deployment of AST-010', risk: 'CRITICAL' }, { asset_id: 'AST-001', relation: 'merged with AST-002 in RUN-044', risk: 'LOW' } ],
    timeline: [
      { at: '2026-09-15T22:41:00+05:30', label: 'C17 submits batch SUB-117', ref: 'AST-002' },
      { at: '2026-09-17T09:00:00+05:30', label: 'RUN-044 starts with AST-001 + AST-002', ref: 'RUN-044' },
      { at: '2026-09-18T14:00:00+05:30', label: 'Model rc4 produced', ref: 'AST-010' },
      { at: '2026-09-21T06:00:00+05:30', label: 'rc4 deployed to EDGE-07', ref: 'EDGE-07' },
      { at: '2026-09-24T18:02:00+05:30', label: 'Contributor concentration flagged', ref: 'EV-221', severity: 'HIGH' },
      { at: '2026-09-25T07:40:00+05:30', label: 'Tampered inference records detected', ref: 'EV-260', severity: 'CRITICAL' },
      { at: '2026-09-25T10:14:00+05:30', label: 'Trigger selectivity confirmed on rc4', ref: 'EV-188', severity: 'HIGH' },
    ],
    limitations: ['Challenge battery covers 14 of 20 classes', 'Contributor identity relies on submission signing key C17-K1'],
  },
  { ...baseIncident, incident_id: 'INC-002', title: 'Near-duplicate flooding from C09', state: 'REVIEW_REQUIRED', severity: 'MEDIUM', opened_at: '2026-09-24T18:30:00+05:30', summary: 'Batch C09 contains 34% near-duplicates.', finding_ids: ['FND-3'], evidence_ids: ['EV-241'], blast_radius: [], timeline: [], },
  { ...baseIncident, incident_id: 'INC-003', title: 'Monsoon operational drift in sector 7', state: 'MONITORING', severity: 'LOW', opened_at: '2026-09-25T08:10:00+05:30', summary: 'Environmental drift, no manipulation indicators.', finding_ids: ['FND-5'], evidence_ids: ['EV-270'], blast_radius: [], timeline: [], },
  { ...baseIncident, incident_id: 'INC-004', title: 'Vendor DETR digest mismatch', state: 'ANALYSIS_RUNNING', severity: 'HIGH', opened_at: '2026-09-26T09:05:00+05:30', summary: 'Delivered model differs from signed manifest; behavioural scan running.', finding_ids: ['FND-6'], evidence_ids: ['EV-280'], blast_radius: [], timeline: [], },
]

export const drift: DriftSeries[] = [
  { factor: 'Illumination', reference: 0.52, current: 0.31, psi: 0.31 },
  { factor: 'Cloud cover', reference: 0.12, current: 0.47, psi: 0.44 },
  { factor: 'Terrain', reference: 0.4, current: 0.43, psi: 0.06 },
  { factor: 'Sensor', reference: 0.5, current: 0.51, psi: 0.04 },
  { factor: 'Season', reference: 0.2, current: 0.62, psi: 0.29 },
]

export const contributorRisk = [
  { contributor_id: 'C17', flagged: 318, total: 412, max_severity: 'HIGH' as const },
  { contributor_id: 'C09', flagged: 1420, total: 4176, max_severity: 'MEDIUM' as const },
  { contributor_id: 'C04', flagged: 3, total: 52100, max_severity: 'INFO' as const },
  { contributor_id: 'V02', flagged: 1, total: 1, max_severity: 'HIGH' as const },
]

export const auditEvents: AuditEvent[] = [
  'ASSET_REGISTERED:AST-001', 'ASSET_REGISTERED:AST-002', 'ASSESSMENT_STARTED:ASM-001', 'EVIDENCE_RECORDED:EV-221',
  'ASSESSMENT_STARTED:ASM-002', 'EVIDENCE_RECORDED:EV-188', 'INCIDENT_OPENED:INC-001', 'ASSET_QUARANTINED:AST-002', 'ASSET_QUARANTINED:AST-010', 'ASSET_QUARANTINED:AST-020',
].map((s, i, arr) => {
  const [event_type, subject] = s.split(':')
  return {
    event_id: `AUD-${String(101 + i)}`, sequence: 101 + i, event_type,
    timestamp: new Date(Date.parse('2026-09-24T17:00:00+05:30') + i * 3_600_000).toISOString(),
    actor_id: event_type === 'ASSET_QUARANTINED' ? 'ANALYST-01' : 'SYSTEM', subject_ids: [subject], payload: {},
    previous_event_hash: i === 0 ? '0'.repeat(64) : h(arr[i - 1]), record_digest: h(s),
    signature: 'ed25519:' + h('sig' + s).slice(0, 48), key_id: 'AUDIT-KEY-01',
  }
})

export const capabilities: Capability[] = [
  { name: 'COCO / YOLO dataset ingest', area: 'Data', status: 'SUPPORTED', access_modes: ['FILE_ONLY'], notes: 'Pascal VOC planned' },
  { name: 'Trigger / label-flip / duplicate / OOD detection', area: 'Data', status: 'SUPPORTED', access_modes: ['FILE_ONLY'], notes: '' },
  { name: 'ONNX model analysis', area: 'Model', status: 'SUPPORTED', access_modes: ['WHITE_BOX', 'BLACK_BOX'], notes: '' },
  { name: 'PyTorch / TorchScript model analysis', area: 'Model', status: 'PARTIAL', access_modes: ['BLACK_BOX'], notes: 'White-box activation hooks pending' },
  { name: 'Signed inference records (Ed25519)', area: 'Provenance', status: 'SUPPORTED', access_modes: ['N_A'], notes: 'Replay via nonce + sequence' },
  { name: 'Distribution-shift characterization', area: 'Drift', status: 'PARTIAL', access_modes: ['FILE_ONLY'], notes: 'Season inferred indirectly' },
  { name: 'Video / temporal models', area: 'Model', status: 'NOT_SUPPORTED', access_modes: [], notes: 'Out of MVP scope' },
  { name: 'Permissioned ledger adapter', area: 'Audit', status: 'NOT_SUPPORTED', access_modes: [], notes: 'Optional, local hash chain used' },
]

// 7-day example trends for dashboard sparklines (oldest first).
export const trends = {
  assessments: [3, 4, 2, 5, 3, 4, 2],
  highFindings: [0, 0, 1, 1, 2, 3, 4],
  incidents: [0, 0, 0, 1, 2, 3, 4],
  auditEvents: [12, 18, 15, 22, 31, 40, 46],
}
