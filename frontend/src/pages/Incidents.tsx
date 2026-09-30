import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Loading, PageHeader, SeverityBadge, StateBadge } from '../components/ui'
import { fmtDate } from '../lib/format'

export default function Incidents() {
  const { data, isLoading } = useQuery({ queryKey: ['incidents'], queryFn: api.incidents })
  return (
    <div>
      <PageHeader title="Incidents" sub="Correlated findings across data, model, provenance and drift engines." />
      <div className="card">{isLoading ? <Loading /> : (
        <table className="table-base"><thead><tr><th>ID</th><th>Title</th><th>Opened</th><th>Findings</th><th>Severity</th><th>State</th></tr></thead><tbody>
          {data?.map((i) => (
            <tr key={i.incident_id}>
              <td><Link className="font-mono text-sky-700 hover:underline" to={`/incidents/${i.incident_id}`}>{i.incident_id}</Link></td>
              <td>{i.title}</td><td className="whitespace-nowrap">{fmtDate(i.opened_at)}</td><td>{i.finding_ids.length}</td>
              <td><SeverityBadge s={i.severity} /></td><td><StateBadge s={i.state} /></td>
            </tr>
          ))}
        </tbody></table>
      )}</div>
    </div>
  )
}
