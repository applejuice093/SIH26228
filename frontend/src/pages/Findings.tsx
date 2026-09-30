import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type FindingFilters } from '../api/client'
import EvidenceDrawer from '../components/EvidenceDrawer'
import { Loading, PageHeader, SeverityBadge, StateBadge } from '../components/ui'
import { pct, severityOrder } from '../lib/format'

export default function Findings() {
  const [params, setParams] = useSearchParams()
  const [ev, setEv] = useState<string | null>(null)
  const filters: FindingFilters = Object.fromEntries(
    ['severity', 'status', 'asset_id', 'contributor_id', 'assessment_id'].filter((k) => params.get(k)).map((k) => [k, params.get(k)!]),
  )
  const { data, isLoading } = useQuery({ queryKey: ['findings', filters], queryFn: () => api.findings(filters) })
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p) }

  return (
    <div>
      <PageHeader title="Findings" sub="Every flag shows its reason, evidence, confidence, affected asset and recommended disposition." />
      <div className="card mb-4 flex flex-wrap gap-3 text-sm">
        <label>Severity{' '}
          <select className="rounded border px-2 py-1" value={filters.severity ?? ''} onChange={(e) => set('severity', e.target.value)}>
            <option value="">All</option>{severityOrder.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Status{' '}
          <select className="rounded border px-2 py-1" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">All</option><option>OPEN</option><option>UNDER_REVIEW</option><option>CLOSED</option>
          </select>
        </label>
        {(['asset_id', 'contributor_id', 'assessment_id'] as const).map((k) => (
          <label key={k}>{k}{' '}
            <input className="w-28 rounded border px-2 py-1 font-mono" value={filters[k] ?? ''} onChange={(e) => set(k, e.target.value.trim())} placeholder="any" />
          </label>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {isLoading ? <Loading /> : !data?.length ? <div className="text-sm text-muted">No findings match these filters.</div> : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Summary and reason</th><th>Evidence</th><th>Affected</th><th>Severity</th><th>Confidence</th><th>Recommended</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.finding_id}>
                  <td className="font-mono">{f.finding_id}<div><Link className="text-xs text-accent hover:underline" to={`/incidents/${f.incident_id}`}>{f.incident_id}</Link></div></td>
                  <td><div className="font-medium">{f.summary}</div><div className="text-xs text-muted">{f.reason}</div></td>
                  <td>{f.evidence_ids.map((e) => <button key={e} onClick={() => setEv(e)} className="mb-1 mr-1 rounded bg-raised px-1.5 font-mono text-xs text-accent hover:bg-line">{e}</button>)}</td>
                  <td className="font-mono text-xs">{f.affected_asset_ids.join(', ')}</td>
                  <td><SeverityBadge s={f.severity} /></td>
                  <td>{pct(f.confidence)}</td>
                  <td><StateBadge s={f.recommended_disposition} /></td>
                  <td><StateBadge s={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <EvidenceDrawer id={ev} onClose={() => setEv(null)} onOpen={setEv} />
    </div>
  )
}
