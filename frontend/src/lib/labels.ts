// Human-readable labels for enum values and field names shown in the UI.
const special: Record<string, string> = {
  QUARANTINE_RECOMMENDED: 'Quarantine recommended',
  REVIEW_REQUIRED: 'Review required',
  NO_SIGNIFICANT_ANOMALY: 'No significant anomaly',
  ANALYSIS_RUNNING: 'Analysis running',
  EVIDENCE_COLLECTED: 'Evidence collected',
  HUMAN_DISPOSITION: 'Awaiting analyst',
  UNDER_REVIEW: 'Under review',
  WHITE_BOX: 'White-box',
  BLACK_BOX: 'Black-box',
  FILE_ONLY: 'File-only',
  N_A: 'N/A',
  NOT_SUPPORTED: 'Not supported',
  NOT_ESTABLISHED: 'Not established',
  DATASET_INTEGRITY: 'Dataset integrity',
  MODEL_INTEGRITY: 'Model integrity',
  DISTRIBUTION_SHIFT: 'Distribution shift',
  asset_id: 'Asset',
  contributor_id: 'Contributor',
  assessment_id: 'Assessment',
  severity: 'Severity',
  status: 'Status',
}

export function human(v: string): string {
  if (special[v]) return special[v]
  const s = v.replace(/_/g, ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
