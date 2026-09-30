import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type FindingFilters } from '../api/client'
import EvidenceDrawer from '../components/EvidenceDrawer'
import { Id, Loading, PageHeader, SeverityBadge, StateBadge } from '../components/ui'
import { human } from '../lib/labels'
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
      <PageHeader eyebrow="Investigate" title="Findings" sub="Every flag shows its reason, evidence, confidence, affected asset and recommended disposition." />
      <div className="card mb-4 flex flex-wrap items-end gap-3 text-[12px]">
        <label className="flex flex-col gap-1 text-muted">Severity
          <select className="input" value={filters.severity ?? ''} onChange={(e) => set('severity', e.target.value)}>
            <option value="">All</option>{severityOrder.map((s) => <option key={s} value={s}>{human(s)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-muted">Status
          <select className="input" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">All</option>{['OPEN', 'UNDER_REVIEW', 'CLOSED'].map((s) => <option key={s} value={s}>{human(s)}</option>)}
          </select>
        </label>
        {([['asset_id', 'Asset'], ['contributor_id', 'Contributor'], ['assessment_id', 'Assessment']] as const).map(([k, label]) => (
          <label key={k} className="flex flex-col gap-1 text-muted">{label}
            <input className="input id w-32" value={filters[k] ?? ''} onChange={(e) => set(k, e.target.value.trim())} placeholder="any" />
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
                  <td className="whitespace-nowrap"><Id>{f.finding_id}</Id><div><Link className="id text-[11.5px] text-accent hover:underline" to={`/incidents/${f.incident_id}`}>{f.incident_id}</Link></div></td>
                  <td><div className="font-medium">{f.summary}</div><div className="text-xs text-muted">{f.reason}</div></td>
                  <td>{f.evidence_ids.map((e) => <button key={e} onClick={() => setEv(e)} className="id mb-1 mr-1 rounded bg-raised px-1.5 text-[11.5px] text-accent hover:bg-line">{e}</button>)}</td>
                  <td className="id text-[11.5px] text-fg-2">{f.affected_asset_ids.join(', ')}</td>
                  <td><SeverityBadge s={f.severity} /></td>
                  <td className="tabular">{pct(f.confidence)}</td>
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
