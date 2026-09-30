import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Loading, PageHeader, StateBadge } from '../components/ui'
import { fmtDate } from '../lib/format'

export default function Audit() {
  const events = useQuery({ queryKey: ['auditEvents'], queryFn: api.auditEvents })
  const verify = useQuery({ queryKey: ['auditVerify'], queryFn: api.verifyAudit, enabled: false })
  const v = verify.data
  return (
    <div>
      <PageHeader title="Audit ledger" sub="Append-only, hash-chained and signed. Verification recomputes the chain from the first event."
        right={<button className="btn border-line bg-panel text-white" onClick={() => verify.refetch()}>{verify.isFetching ? 'Verifying…' : 'Verify chain'}</button>} />
      {v && (
        <div className="card mb-4 flex flex-wrap gap-4 text-sm">
          <span>Chain <StateBadge s={v.chain_valid ? 'VALID' : 'TAMPERED'} /></span>
          <span>Signatures <StateBadge s={v.signatures_valid ? 'VALID' : 'TAMPERED'} /></span>
          <span>Checkpoints <StateBadge s={v.checkpoints_valid ? 'VALID' : 'TAMPERED'} /></span>
          <span>Events checked {v.events_checked}</span>
          <span>First failure {v.first_failure ?? 'none'}</span>
        </div>
      )}
      <div className="card overflow-x-auto">{events.isLoading ? <Loading /> : (
        <table className="table-base">
          <thead><tr><th>Seq</th><th>Event</th><th>Time</th><th>Actor</th><th>Subjects</th><th>Prev hash</th><th>Digest</th><th>Key</th></tr></thead>
          <tbody>{[...(events.data ?? [])].reverse().map((e) => (
            <tr key={e.event_id}>
              <td className="font-mono">{e.sequence}</td><td className="font-mono text-xs">{e.event_type}</td>
              <td className="whitespace-nowrap">{fmtDate(e.timestamp)}</td><td className="font-mono text-xs">{e.actor_id}</td>
              <td className="font-mono text-xs">{e.subject_ids.join(', ')}</td>
              <td className="font-mono text-xs" title={e.previous_event_hash}>{e.previous_event_hash.slice(0, 10)}…</td>
              <td className="font-mono text-xs" title={e.record_digest}>{e.record_digest.slice(0, 10)}…</td>
              <td className="font-mono text-xs">{e.key_id}</td>
            </tr>
          ))}</tbody>
        </table>
      )}</div>
    </div>
  )
}
