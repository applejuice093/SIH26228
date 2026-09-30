import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Loading, PageHeader, StateBadge } from '../components/ui'

export default function Capabilities() {
  const { data, isLoading } = useQuery({ queryKey: ['capabilities'], queryFn: api.capabilities })
  return (
    <div>
      <PageHeader title="Capabilities and declared limits" sub="Unsupported conditions are stated explicitly rather than silently passed." />
      <div className="card">{isLoading ? <Loading /> : (
        <table className="table-base"><thead><tr><th>Area</th><th>Capability</th><th>Status</th><th>Access modes</th><th>Notes</th></tr></thead><tbody>
          {data?.map((c) => <tr key={c.name}><td>{c.area}</td><td>{c.name}</td><td><StateBadge s={c.status} /></td><td className="font-mono text-xs">{c.access_modes.join(', ') || '–'}</td><td className="text-slate-600">{c.notes}</td></tr>)}
        </tbody></table>
      )}</div>
    </div>
  )
}
