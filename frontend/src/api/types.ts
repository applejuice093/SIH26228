// Types mirror docs/12_DATA_MODELS_AND_SCHEMAS.md and docs/17_API_CONTRACT.md
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AccessMode = 'WHITE_BOX' | 'BLACK_BOX' | 'FILE_ONLY' | 'N_A'
export type AssetStatus = 'UNTRUSTED' | 'VERIFIED' | 'QUARANTINED' | 'REVOKED'
export type AssetType = 'IMAGE' | 'DATASET' | 'MODEL' | 'CONFIG' | 'OUTPUT' | 'BUNDLE'
export type DispositionAction = 'ACCEPT' | 'MONITOR' | 'REVIEW' | 'QUARANTINE' | 'ROLLBACK'
export type AssessmentType =
  | 'DATASET_INTEGRITY'
  | 'MODEL_INTEGRITY'
  | 'PROVENANCE'
  | 'DISTRIBUTION_SHIFT'
export type AssessmentStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type IncidentState =
  | 'UNASSESSED'
  | 'ANALYSIS_RUNNING'
  | 'EVIDENCE_COLLECTED'
  | 'NO_SIGNIFICANT_ANOMALY'
  | 'REVIEW_REQUIRED'
  | 'QUARANTINE_RECOMMENDED'
  | 'HUMAN_DISPOSITION'
  | 'CLOSED'
  | 'MONITORING'
  | 'REMEDIATION'

export interface Asset {
  asset_id: string
  asset_type: AssetType
  name: string
  sha256: string
  byte_size: number
  source: { contributor_id: string; submission_id: string }
  created_at: string
  ingested_at: string
  status: AssetStatus
}

export interface Evidence {
  evidence_id: string
  evidence_type: string
  detector: string
  detector_version: string
  access_mode: AccessMode
  asset_ids: string[]
  observation: string
  measurements: Record<string, number | string>
  baseline: Record<string, number | string>
  decision_rule: string
  confidence: number
  severity: Severity
  limitations: string[]
  related_evidence_ids?: string[]
  created_at: string
}

export interface Finding {
  finding_id: string
  incident_id: string
  assessment_id: string
  contributor_id?: string
  summary: string
  reason: string
  evidence_ids: string[]
  affected_asset_ids: string[]
  severity: Severity
  confidence: number
  status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED'
  recommended_disposition: DispositionAction
  limitations: string[]
}

export interface Assessment {
  assessment_id: string
  asset_id: string
  assessment_type: AssessmentType
  status: AssessmentStatus
  progress: number
  access_mode: AccessMode
  started_at: string
  finding_ids: string[]
}

export interface ObjectiveHypothesis {
  hypothesis_id: string
  type: string
  supporting_evidence_ids: string[]
  support_score: number
  confidence: number
  alternatives: { type: string; confidence: number }[]
  statement: string
  intent_attribution: 'NOT_ESTABLISHED' | 'ESTABLISHED'
  atlas_references: string[]
}

export interface GraphNode { id: string; type: string; label?: string }
export interface GraphEdge { source: string; target: string; relation: string }
export interface EvidenceGraph { nodes: GraphNode[]; edges: GraphEdge[] }

export interface TimelineEvent { at: string; label: string; ref?: string; severity?: Severity }

export interface Disposition {
  disposition_id: string
  finding_id: string
  action: DispositionAction
  reason: string
  actor_id: string
  created_at: string
  audit_event_id: string
}

export interface Incident {
  incident_id: string
  title: string
  state: IncidentState
  severity: Severity
  opened_at: string
  summary: string
  finding_ids: string[]
  evidence_ids: string[]
  blast_radius: { asset_id: string; relation: string; risk: Severity }[]
  timeline: TimelineEvent[]
  limitations: string[]
  coverage: Record<string, 'COVERED' | 'PARTIAL' | 'NOT_SUPPORTED'>
  dispositions: Disposition[]
}

export interface ProvenanceResult {
  signature_valid: boolean
  input_hash_valid: boolean
  model_hash_valid: boolean
  output_hash_valid: boolean
  replay_detected: boolean
  overall: 'VALID' | 'TAMPERED' | 'REPLAYED' | 'UNVERIFIABLE'
}

export interface AuditEvent {
  event_id: string
  sequence: number
  event_type: string
  timestamp: string
  actor_id: string
  subject_ids: string[]
  payload: Record<string, unknown>
  previous_event_hash: string
  record_digest: string
  signature: string
  key_id: string
}

export interface AuditVerification {
  chain_valid: boolean
  signatures_valid: boolean
  checkpoints_valid: boolean
  first_failure: number | null
  events_checked: number
}

export interface Capability {
  name: string
  area: string
  status: 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED'
  access_modes: AccessMode[]
  notes: string
}

export interface DriftSeries { factor: string; reference: number; current: number; psi: number }
