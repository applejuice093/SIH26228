// API client. Uses the in-browser mock unless VITE_API_BASE is set.
import * as mock from './mockData'
import type {
  Asset, Assessment, AuditEvent, AuditVerification, Capability, DispositionAction, Evidence,
  EvidenceGraph, Finding, Incident, ObjectiveHypothesis, ProvenanceResult,
} from './types'

const BASE = import.meta.env.VITE_API_BASE as string | undefined
const delay = <T,>(v: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms))

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

export interface FindingFilters {
  severity?: string; status?: string; asset_id?: string; contributor_id?: string; assessment_id?: string
}

const auditLog = [...mock.auditEvents]

export const api = {
  assets: (): Promise<Asset[]> => (BASE ? http('/assets') : delay(mock.assets)),
  assessments: (): Promise<Assessment[]> => (BASE ? http('/assessments') : delay(mock.assessments)),
  findings: (f: FindingFilters = {}): Promise<Finding[]> => {
    if (BASE) return http('/findings?' + new URLSearchParams(f as Record<string, string>))
    return delay(mock.findings.filter((x) =>
      (!f.severity || x.severity === f.severity) && (!f.status || x.status === f.status) &&
      (!f.asset_id || x.affected_asset_ids.includes(f.asset_id)) &&
      (!f.contributor_id || x.contributor_id === f.contributor_id) &&
      (!f.assessment_id || x.assessment_id === f.assessment_id)))
  },
  evidence: (): Promise<Evidence[]> => (BASE ? http('/evidence') : delay(mock.evidence)),
  incidents: (): Promise<Incident[]> => (BASE ? http('/incidents') : delay(mock.incidents)),
  incident: (id: string): Promise<Incident | undefined> =>
    BASE ? http(`/incidents/${id}`) : delay(mock.incidents.find((i) => i.incident_id === id)),
  graph: (id: string): Promise<EvidenceGraph> =>
    BASE ? http(`/incidents/${id}/graph`) : delay(mock.graphs[id] ?? { nodes: [], edges: [] }),
  objective: (id: string): Promise<ObjectiveHypothesis[]> =>
    BASE ? http(`/incidents/${id}/objective`) : delay(mock.objectives[id] ?? []),
  verifyProvenance: (record: string, keyIds: string[]): Promise<ProvenanceResult> => {
    if (BASE) return http('/provenance/verify', { method: 'POST', body: JSON.stringify({ record_path: record, expected_key_ids: keyIds }) })
    const r = record.toLowerCase()
    const tampered = r.includes('tamper'); const replay = r.includes('replay')
    return delay({
      signature_valid: !r.includes('badsig'), input_hash_valid: true, model_hash_valid: true,
      output_hash_valid: !tampered, replay_detected: replay,
      overall: r.includes('badsig') ? 'UNVERIFIABLE' : tampered ? 'TAMPERED' : replay ? 'REPLAYED' : 'VALID',
    }, 400)
  },
  dispose: (finding_id: string, action: DispositionAction, reason: string, actor_id = 'ANALYST-01') => {
    if (BASE) return http('/dispositions', { method: 'POST', body: JSON.stringify({ finding_id, action, reason, actor_id }) })
    const last = auditLog[auditLog.length - 1]
    const ev: AuditEvent = { ...last, event_id: `AUD-${last.sequence + 1}`, sequence: last.sequence + 1, event_type: `DISPOSITION_${action}`, timestamp: new Date().toISOString(), actor_id, subject_ids: [finding_id], payload: { reason }, previous_event_hash: last.record_digest, record_digest: crypto.randomUUID().replace(/-/g, '').padEnd(64, '0') }
    auditLog.push(ev)
    return delay({ audit_event_id: ev.event_id })
  },
  auditEvents: (): Promise<AuditEvent[]> => (BASE ? http('/audit/events') : delay(auditLog)),
  verifyAudit: (): Promise<AuditVerification> => {
    if (BASE) return http('/audit/verify', { method: 'POST' })
    let first: number | null = null
    for (let i = 1; i < auditLog.length; i++) if (auditLog[i].previous_event_hash !== auditLog[i - 1].record_digest && first === null) first = auditLog[i].sequence
    return delay({ chain_valid: first === null, signatures_valid: true, checkpoints_valid: true, first_failure: first, events_checked: auditLog.length }, 500)
  },
  capabilities: (): Promise<Capability[]> => (BASE ? http('/capabilities') : delay(mock.capabilities)),
  drift: () => delay(mock.drift),
  contributorRisk: () => delay(mock.contributorRisk),
}
