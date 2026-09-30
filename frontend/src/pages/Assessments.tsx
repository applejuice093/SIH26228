import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Loading, PageHeader, StateBadge } from '../components/ui'
import { fmtDate } from '../lib/format'

export default function Assessments() {
  const { data, isLoading } = useQuery({ queryKey: ['assessments'], queryFn: api.assessments, refetchInterval: 5000 })
  return (
    <div>
      <PageHeader title="Assessment monitor" sub="Long-running assessments are asynchronous; this view refreshes every 5 s." />
      <div className="card overflow-x-auto">
        {isLoading ? <Loading /> : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Type</th><th>Asset</th><th>Access mode</th><th>Started</th><th>Progress</th><th>Status</th><th>Findings</th></tr></thead>
            <tbody>
              {data?.map((a) => (
                <tr key={a.assessment_id}>
                  <td className="font-mono">{a.assessment_id}</td>
                  <td>{a.assessment_type}</td>
                  <td className="font-mono">{a.asset_id}</td>
                  <td><StateBadge s={a.access_mode} /></td>
                  <td className="whitespace-nowrap">{fmtDate(a.started_at)}</td>
                  <td className="w-40">
                    <div className="h-2 rounded bg-raised"><div className="h-2 rounded bg-accent" style={{ width: `${a.progress * 100}%` }} /></div>
                    <div className="mt-1 text-xs text-muted">{Math.round(a.progress * 100)}%</div>
                  </td>
                  <td><StateBadge s={a.status} /></td>
                  <td className="font-mono text-xs">{a.finding_ids.join(', ') || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
