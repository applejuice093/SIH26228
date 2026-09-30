import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import EvidenceDrawer from '../components/EvidenceDrawer'
import { Kv, Loading, PageHeader, SeverityBadge, StateBadge } from '../components/ui'
import { fmtBytes, fmtDate, pct } from '../lib/format'

export default function AssetDetail({ kind }: { kind: 'MODEL' | 'DATASET' }) {
  const { id = '' } = useParams()
  const [ev, setEv] = useState<string | null>(null)
  const assets = useQuery({ queryKey: ['assets'], queryFn: api.assets })
  const evidence = useQuery({ queryKey: ['evidence'], queryFn: api.evidence })
  const findings = useQuery({ queryKey: ['findings', { asset_id: id }], queryFn: () => api.findings({ asset_id: id }) })
  const assessments = useQuery({ queryKey: ['assessments'], queryFn: api.assessments })
  if (assets.isLoading) return <Loading />
  const a = assets.data?.find((x) => x.asset_id === id && x.asset_type === kind)
  if (!a) return <div className="card">{kind.toLowerCase()} {id} not found.</div>
  const evs = evidence.data?.filter((e) => e.asset_ids.includes(id)) ?? []
  const asms = assessments.data?.filter((x) => x.asset_id === id) ?? []
  return (
    <div className="space-y-4">
      <PageHeader title={a.name} sub={`${kind === 'MODEL' ? 'Model' : 'Dataset'} ${a.asset_id}`} right={<StateBadge s={a.status} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-title">Identity</div>
          <Kv k="Digest" v={<span className="break-all font-mono text-xs">sha256:{a.sha256}</span>} />
          <Kv k="Size" v={fmtBytes(a.byte_size)} />
          <Kv k="Contributor" v={a.source.contributor_id} />
          <Kv k="Submission" v={a.source.submission_id} />
          <Kv k="Ingested" v={fmtDate(a.ingested_at)} />
        </section>
        <section className="card">
          <div className="card-title">Assessments</div>
          {asms.length ? <table className="table-base"><tbody>{asms.map((s) => <tr key={s.assessment_id}><td className="font-mono">{s.assessment_id}</td><td>{s.assessment_type}</td><td><StateBadge s={s.access_mode} /></td><td><StateBadge s={s.status} /></td></tr>)}</tbody></table> : <div className="text-sm text-muted">Not yet assessed.</div>}
        </section>
      </div>
      <section className="card">
        <div className="card-title">Findings</div>
        {findings.data?.length ? <table className="table-base"><tbody>{findings.data.map((f) => <tr key={f.finding_id}><td className="font-mono">{f.finding_id}</td><td>{f.summary}</td><td><SeverityBadge s={f.severity} /></td><td><Link className="text-accent hover:underline" to={`/incidents/${f.incident_id}`}>{f.incident_id}</Link></td></tr>)}</tbody></table> : <div className="text-sm text-muted">No findings.</div>}
      </section>
      <section className="card">
        <div className="card-title">Evidence</div>
        {evs.length ? <table className="table-base"><tbody>{evs.map((e) => <tr key={e.evidence_id}><td><button className="font-mono text-accent hover:underline" onClick={() => setEv(e.evidence_id)}>{e.evidence_id}</button></td><td className="font-mono text-xs">{e.detector}</td><td>{e.observation}</td><td>{pct(e.confidence)}</td></tr>)}</tbody></table> : <div className="text-sm text-muted">No evidence recorded.</div>}
      </section>
      <EvidenceDrawer id={ev} onClose={() => setEv(null)} onOpen={setEv} />
    </div>
  )
}
