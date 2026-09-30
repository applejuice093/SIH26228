import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import DispositionPanel from '../components/DispositionPanel'
import EvidenceDrawer from '../components/EvidenceDrawer'
import EvidenceGraph from '../components/EvidenceGraph'
import { Loading, PageHeader, SeverityBadge, StateBadge } from '../components/ui'
import { fmtDate, pct } from '../lib/format'

export default function Incident() {
  const { id = '' } = useParams()
  const [ev, setEv] = useState<string | null>(null)
  const inc = useQuery({ queryKey: ['incident', id], queryFn: () => api.incident(id) })
  const graph = useQuery({ queryKey: ['graph', id], queryFn: () => api.graph(id) })
  const obj = useQuery({ queryKey: ['objective', id], queryFn: () => api.objective(id) })
  const findings = useQuery({ queryKey: ['findings', {}], queryFn: () => api.findings() })
  const evidence = useQuery({ queryKey: ['evidence'], queryFn: api.evidence })

  if (inc.isLoading) return <Loading />
  const i = inc.data
  if (!i) return <div className="card">Incident {id} not found.</div>
  const myFindings = findings.data?.filter((f) => i.finding_ids.includes(f.finding_id)) ?? []
  const myEvidence = evidence.data?.filter((e) => i.evidence_ids.includes(e.evidence_id)) ?? []
  const Ev = ({ e }: { e: string }) => <button onClick={() => setEv(e)} className="rounded bg-slate-100 px-1.5 font-mono text-xs text-sky-800 hover:bg-slate-200">{e}</button>

  return (
    <div className="space-y-4">
      <PageHeader title={i.title} sub={`${i.incident_id} · opened ${fmtDate(i.opened_at)}`}
        right={<div className="flex gap-2"><SeverityBadge s={i.severity} /><StateBadge s={i.state} /><Link to={`/reports/${i.incident_id}`} className="btn border-slate-300">Report</Link></div>} />

      <section className="card">
        <div className="card-title">Why was it flagged?</div>
        <p className="text-sm">{i.summary}</p>
        <table className="table-base mt-3">
          <thead><tr><th>Evidence</th><th>Detector</th><th>Observation</th><th>Confidence</th><th>Severity</th></tr></thead>
          <tbody>{myEvidence.map((e) => (
            <tr key={e.evidence_id}><td><Ev e={e.evidence_id} /></td><td className="font-mono text-xs">{e.detector}</td><td>{e.observation}</td><td>{pct(e.confidence)}</td><td><SeverityBadge s={e.severity} /></td></tr>
          ))}</tbody>
        </table>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <div className="card-title">Attack graph (click evidence nodes)</div>
          {graph.data?.nodes.length ? <EvidenceGraph graph={graph.data} onEvidence={setEv} /> : <div className="text-sm text-slate-500">No graph edges recorded for this incident.</div>}
        </section>
        <section className="card">
          <div className="card-title">Timeline</div>
          {i.timeline.length ? (
            <ol className="relative border-l border-slate-300 pl-4 text-sm">
              {i.timeline.map((t) => (
                <li key={t.at + t.label} className="mb-3">
                  <div className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${t.severity ? 'bg-red-500' : 'bg-slate-400'}`} />
                  <div className="text-xs text-slate-500">{fmtDate(t.at)}</div>
                  <div>{t.label} {t.ref?.startsWith('EV-') ? <Ev e={t.ref} /> : <span className="font-mono text-xs text-slate-500">{t.ref}</span>}</div>
                </li>
              ))}
            </ol>
          ) : <div className="text-sm text-slate-500">No timeline yet.</div>}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-title">Objective hypotheses</div>
          {!obj.data?.length ? <div className="text-sm text-slate-500">Insufficient evidence to propose a technical objective.</div> : obj.data.map((o, idx) => (
            <div key={o.hypothesis_id} className={`text-sm ${idx ? 'mt-4 border-t pt-4' : ''}`}>
              <div className="text-xs uppercase text-slate-500">{idx === 0 ? 'Most supported technical objective' : 'Additional hypothesis'}</div>
              <div className="font-semibold">{o.type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</div>
              <p className="mt-1">{o.statement}</p>
              <div className="mt-2 text-xs">Support {pct(o.support_score)} · confidence {pct(o.confidence)}</div>
              <div className="mt-2 flex flex-wrap gap-1">{o.supporting_evidence_ids.map((e) => <Ev key={e} e={e} />)}</div>
              <div className="mt-2 text-xs text-slate-600">Alternative explanations: {o.alternatives.map((a) => `${a.type.replace(/_/g, ' ').toLowerCase()} (${pct(a.confidence)})`).join('; ')}</div>
              {!!o.atlas_references.length && <div className="mt-1 text-xs text-slate-600">MITRE ATLAS: {o.atlas_references.join(', ')}</div>}
              <div className="mt-2 text-xs font-semibold text-slate-700">Intent attribution: {o.intent_attribution.replace('_', ' ').toLowerCase()}</div>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="card-title">Blast radius</div>
          {i.blast_radius.length ? (
            <table className="table-base"><thead><tr><th>Asset</th><th>Relation</th><th>Risk</th></tr></thead><tbody>
              {i.blast_radius.map((b) => <tr key={b.asset_id}><td className="font-mono">{b.asset_id}</td><td>{b.relation}</td><td><SeverityBadge s={b.risk} /></td></tr>)}
            </tbody></table>
          ) : <div className="text-sm text-slate-500">No downstream assets identified.</div>}
          <div className="card-title mt-5">Coverage and limitations</div>
          <div className="flex flex-wrap gap-2">{Object.entries(i.coverage).map(([k, v]) => <span key={k} className="text-xs">{k} <StateBadge s={v} /></span>)}</div>
          <ul className="mt-2 list-disc pl-5 text-sm">{i.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      </div>

      <section className="card">
        <div className="card-title">Disposition (human decision is authoritative)</div>
        {myFindings.length ? <DispositionPanel findings={myFindings} /> : <Loading />}
      </section>

      <EvidenceDrawer id={ev} onClose={() => setEv(null)} onOpen={setEv} />
    </div>
  )
}
