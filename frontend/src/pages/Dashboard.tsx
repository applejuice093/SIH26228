import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { PageHeader, SeverityBadge, Stat, StateBadge } from '../components/ui'
import { fmtDate } from '../lib/format'

export default function Dashboard() {
  const assessments = useQuery({ queryKey: ['assessments'], queryFn: api.assessments })
  const findings = useQuery({ queryKey: ['findings', {}], queryFn: () => api.findings() })
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: api.incidents })
  const assets = useQuery({ queryKey: ['assets'], queryFn: api.assets })
  const drift = useQuery({ queryKey: ['drift'], queryFn: api.drift })
  const contrib = useQuery({ queryKey: ['contrib'], queryFn: api.contributorRisk })
  const audit = useQuery({ queryKey: ['auditVerify'], queryFn: api.verifyAudit })

  const active = assessments.data?.filter((a) => a.status === 'RUNNING' || a.status === 'QUEUED').length ?? '–'
  const hi = findings.data?.filter((f) => f.severity === 'HIGH' || f.severity === 'CRITICAL') ?? []
  const models = assets.data?.filter((a) => a.asset_type === 'MODEL') ?? []

  return (
    <div>
      <PageHeader title="Dashboard" sub="Evidence-first overview. No aggregate trust score is shown by design." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active assessments" value={active} />
        <Stat label="High / critical findings" value={hi.length} tone={hi.length ? 'text-red-700' : ''} />
        <Stat label="Open incidents" value={incidents.data?.filter((i) => !['CLOSED'].includes(i.state)).length ?? '–'} />
        <Stat label="Audit chain" value={audit.data ? (audit.data.chain_valid ? 'Intact' : 'BROKEN') : '…'} tone={audit.data?.chain_valid ? 'text-emerald-700' : 'text-red-700'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="card-title">Recent incidents</div>
          <table className="table-base"><tbody>
            {incidents.data?.map((i) => (
              <tr key={i.incident_id}>
                <td><Link className="font-mono text-accent hover:underline" to={`/incidents/${i.incident_id}`}>{i.incident_id}</Link></td>
                <td>{i.title}<div className="text-xs text-muted">{fmtDate(i.opened_at)}</div></td>
                <td><SeverityBadge s={i.severity} /></td>
                <td><StateBadge s={i.state} /></td>
              </tr>
            ))}
          </tbody></table>
        </section>

        <section className="card">
          <div className="card-title">High / critical findings</div>
          <table className="table-base"><tbody>
            {hi.map((f) => (
              <tr key={f.finding_id}>
                <td className="font-mono">{f.finding_id}</td>
                <td>{f.summary}</td>
                <td><SeverityBadge s={f.severity} /></td>
              </tr>
            ))}
          </tbody></table>
        </section>

        <section className="card">
          <div className="card-title">Contributor risk overview</div>
          <table className="table-base">
            <thead><tr><th>Contributor</th><th>Flagged / total</th><th>Max severity</th></tr></thead>
            <tbody>
              {contrib.data?.map((c) => (
                <tr key={c.contributor_id}>
                  <td className="font-mono">{c.contributor_id}</td>
                  <td>{c.flagged.toLocaleString()} / {c.total.toLocaleString()} <span className="text-xs text-muted">({((c.flagged / c.total) * 100).toFixed(1)}%)</span></td>
                  <td><SeverityBadge s={c.max_severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card-title">Model integrity status</div>
          <table className="table-base"><tbody>
            {models.map((m) => (
              <tr key={m.asset_id}>
                <td><Link className="font-mono text-accent hover:underline" to={`/models/${m.asset_id}`}>{m.asset_id}</Link></td>
                <td>{m.name}</td>
                <td><StateBadge s={m.status} /></td>
              </tr>
            ))}
          </tbody></table>
        </section>

        <section className="card lg:col-span-2">
          <div className="card-title">Drift overview (population stability index by factor, threshold 0.25)</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={drift.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="factor" /><YAxis />
                <Tooltip /><Legend />
                <Bar dataKey="psi" name="PSI" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  )
}
