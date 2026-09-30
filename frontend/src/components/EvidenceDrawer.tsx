import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { pct, fmtDate } from '../lib/format'
import { Kv, SeverityBadge, StateBadge } from './ui'

export default function EvidenceDrawer({ id, onClose, onOpen }: { id: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const { data } = useQuery({ queryKey: ['evidence'], queryFn: api.evidence })
  if (!id) return null
  const ev = data?.find((e) => e.evidence_id === id)
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Evidence detail">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-lg font-semibold">{id}</h2>
          <button className="btn border-line" onClick={onClose}>Close</button>
        </div>
        {!ev ? <div className="text-sm text-muted">Evidence not found.</div> : (
          <div className="space-y-4">
            <div className="flex gap-2"><SeverityBadge s={ev.severity} /><StateBadge s={ev.access_mode} /></div>
            <p className="text-sm">{ev.observation}</p>
            <div>
              <Kv k="Detector" v={<span className="font-mono">{ev.detector}</span>} />
              <Kv k="Version" v={ev.detector_version} />
              <Kv k="Type" v={ev.evidence_type} />
              <Kv k="Confidence" v={pct(ev.confidence)} />
              <Kv k="Decision rule" v={<span className="font-mono text-xs">{ev.decision_rule}</span>} />
              <Kv k="Source assets" v={ev.asset_ids.join(', ')} />
              <Kv k="Recorded" v={fmtDate(ev.created_at)} />
            </div>
            <div>
              <div className="card-title">Measured values</div>
              <table className="table-base"><tbody>
                {Object.entries(ev.measurements).map(([k, v]) => <tr key={k}><td className="font-mono text-xs">{k}</td><td>{String(v)}</td></tr>)}
              </tbody></table>
            </div>
            <div>
              <div className="card-title">Threshold / reference</div>
              <table className="table-base"><tbody>
                {Object.entries(ev.baseline).map(([k, v]) => <tr key={k}><td className="font-mono text-xs">{k}</td><td>{String(v)}</td></tr>)}
              </tbody></table>
            </div>
            <div>
              <div className="card-title">Limitations</div>
              {ev.limitations.length ? <ul className="list-disc pl-5 text-sm">{ev.limitations.map((l) => <li key={l}>{l}</li>)}</ul> : <div className="text-sm text-muted">None declared.</div>}
            </div>
            {!!ev.related_evidence_ids?.length && (
              <div>
                <div className="card-title">Related evidence</div>
                <div className="flex flex-wrap gap-2">{ev.related_evidence_ids.map((r) => <button key={r} className="btn border-line font-mono" onClick={() => onOpen(r)}>{r}</button>)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
