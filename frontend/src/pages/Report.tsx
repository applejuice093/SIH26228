import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Loading, SeverityBadge, StateBadge } from '../components/ui'
import { fmtDate, pct } from '../lib/format'

export default function Report() {
  const { id = 'INC-001' } = useParams()
  const incId = id.startsWith('RPT-') ? 'INC-' + id.slice(4) : id
  const inc = useQuery({ queryKey: ['incident', incId], queryFn: () => api.incident(incId) })
  const obj = useQuery({ queryKey: ['objective', incId], queryFn: () => api.objective(incId) })
  const findings = useQuery({ queryKey: ['findings', {}], queryFn: () => api.findings() })
  const evidence = useQuery({ queryKey: ['evidence'], queryFn: api.evidence })
  if (inc.isLoading) return <Loading />
  const i = inc.data
  if (!i) return <div className="card">No report for {id}.</div>
  const fs = findings.data?.filter((f) => i.finding_ids.includes(f.finding_id)) ?? []
  const evs = evidence.data?.filter((e) => i.evidence_ids.includes(e.evidence_id)) ?? []
  return (
    <article className="mx-auto max-w-4xl space-y-5 bg-panel p-8 shadow-sm print:shadow-none">
      <header className="border-b pb-4">
        <div className="text-xs uppercase tracking-wide text-muted">CV-TRUST incident assurance report</div>
        <h1 className="mt-1 text-2xl font-semibold">{i.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono">{i.incident_id}</span><SeverityBadge s={i.severity} /><StateBadge s={i.state} />
          <span className="text-muted">Opened {fmtDate(i.opened_at)}</span>
          <button className="btn ml-auto border-line print:hidden" onClick={() => window.print()}>Print / save PDF</button>
        </div>
      </header>
      <section><h2 className="card-title">1. Summary</h2><p className="text-sm">{i.summary}</p></section>
      <section>
        <h2 className="card-title">2. Findings</h2>
        <table className="table-base"><thead><tr><th>ID</th><th>Reason</th><th>Affected</th><th>Severity</th><th>Confidence</th><th>Recommended</th></tr></thead><tbody>
          {fs.map((f) => <tr key={f.finding_id}><td className="font-mono">{f.finding_id}</td><td>{f.reason}</td><td className="font-mono text-xs">{f.affected_asset_ids.join(', ')}</td><td><SeverityBadge s={f.severity} /></td><td>{pct(f.confidence)}</td><td>{f.recommended_disposition}</td></tr>)}
        </tbody></table>
      </section>
      <section>
        <h2 className="card-title">3. Supporting evidence</h2>
        <table className="table-base"><thead><tr><th>ID</th><th>Detector</th><th>Rule</th><th>Observation</th><th>Access</th></tr></thead><tbody>
          {evs.map((e) => <tr key={e.evidence_id}><td className="font-mono">{e.evidence_id}</td><td className="font-mono text-xs">{e.detector} v{e.detector_version}</td><td className="font-mono text-xs">{e.decision_rule}</td><td>{e.observation}</td><td>{e.access_mode}</td></tr>)}
        </tbody></table>
      </section>
      <section>
        <h2 className="card-title">4. Probable technical objective</h2>
        {obj.data?.length ? obj.data.map((o) => (
          <div key={o.hypothesis_id} className="mb-2 text-sm"><b>{o.type}</b> (support {pct(o.support_score)}): {o.statement} Alternatives: {o.alternatives.map((a) => a.type).join(', ')}. Intent attribution: {o.intent_attribution}.</div>
        )) : <p className="text-sm text-muted">Not assessed.</p>}
      </section>
      <section>
        <h2 className="card-title">5. Blast radius</h2>
        {i.blast_radius.length ? <ul className="list-disc pl-5 text-sm">{i.blast_radius.map((b) => <li key={b.asset_id}><span className="font-mono">{b.asset_id}</span>: {b.relation} ({b.risk})</li>)}</ul> : <p className="text-sm text-muted">None identified.</p>}
      </section>
      <section>
        <h2 className="card-title">6. Coverage and limitations</h2>
        <p className="text-sm">{Object.entries(i.coverage).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
        <ul className="list-disc pl-5 text-sm">{[...i.limitations, 'Report generated from example data in the offline demo build.'].map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
    </article>
  )
}
