import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Loading, PageHeader, StateBadge } from '../components/ui'
import { fmtBytes, fmtDate, shortHash } from '../lib/format'

export default function Assets() {
  const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: api.assets })
  const link = (id: string, t: string) => t === 'MODEL' ? `/models/${id}` : t === 'DATASET' ? `/datasets/${id}` : null
  return (
    <div>
      <PageHeader title="Assets" sub="Every asset starts UNTRUSTED until independently verified." />
      <div className="card overflow-x-auto">
        {isLoading ? <Loading /> : (
          <table className="table-base">
            <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Digest</th><th>Size</th><th>Contributor</th><th>Ingested</th><th>Status</th></tr></thead>
            <tbody>
              {data?.map((a) => {
                const to = link(a.asset_id, a.asset_type)
                return (
                  <tr key={a.asset_id}>
                    <td className="font-mono">{to ? <Link className="text-accent hover:underline" to={to}>{a.asset_id}</Link> : a.asset_id}</td>
                    <td>{a.asset_type}</td><td>{a.name}</td>
                    <td className="font-mono text-xs" title={a.sha256}>{shortHash(a.sha256)}</td>
                    <td>{fmtBytes(a.byte_size)}</td>
                    <td className="font-mono">{a.source.contributor_id}</td>
                    <td className="whitespace-nowrap">{fmtDate(a.ingested_at)}</td>
                    <td><StateBadge s={a.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
