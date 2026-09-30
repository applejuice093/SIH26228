import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { DispositionAction, Finding } from '../api/types'

const actions: { a: DispositionAction; destructive: boolean; cls: string }[] = [
  { a: 'ACCEPT', destructive: false, cls: 'border-emerald-400 text-emerald-800 hover:bg-emerald-50' },
  { a: 'MONITOR', destructive: false, cls: 'border-sky-400 text-accent hover:bg-sky-50' },
  { a: 'REVIEW', destructive: false, cls: 'border-amber-400 text-amber-800 hover:bg-amber-50' },
  { a: 'QUARANTINE', destructive: true, cls: 'border-red-500 text-red-800 hover:bg-red-50' },
  { a: 'ROLLBACK', destructive: true, cls: 'border-red-500 text-red-800 hover:bg-red-50' },
]

export default function DispositionPanel({ findings }: { findings: Finding[] }) {
  const qc = useQueryClient()
  const [finding, setFinding] = useState(findings[0]?.finding_id ?? '')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<DispositionAction | null>(null)
  const [log, setLog] = useState<string[]>([])
  const m = useMutation({
    mutationFn: (a: DispositionAction) => api.dispose(finding, a, reason || 'Analyst reviewed supporting evidence'),
    onSuccess: (r, a) => {
      setLog((l) => [`${a} on ${finding} recorded as ${(r as { audit_event_id: string }).audit_event_id}`, ...l])
      setPending(null); setReason('')
      qc.invalidateQueries({ queryKey: ['auditEvents'] }); qc.invalidateQueries({ queryKey: ['auditVerify'] })
    },
  })
  const click = (a: DispositionAction, destructive: boolean) => (destructive ? setPending(a) : m.mutate(a))

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <select className="rounded border px-2 py-1 font-mono" value={finding} onChange={(e) => setFinding(e.target.value)}>
          {findings.map((f) => <option key={f.finding_id} value={f.finding_id}>{f.finding_id} (recommended {f.recommended_disposition})</option>)}
        </select>
        <input className="min-w-[16rem] flex-1 rounded border px-2 py-1" placeholder="Reason (recorded in audit ledger)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ a, destructive, cls }) => (
          <button key={a} disabled={m.isPending || !finding} onClick={() => click(a, destructive)} className={`btn ${cls}`}>{a[0] + a.slice(1).toLowerCase()}</button>
        ))}
      </div>
      {pending && (
        <div role="alertdialog" className="rounded border border-red-400 bg-red-50 p-3">
          <div className="font-medium text-red-900">Confirm {pending} for {finding}?</div>
          <div className="text-xs text-red-800">This is a consequential action and will create a signed audit event.</div>
          <div className="mt-2 flex gap-2">
            <button className="btn border-red-600 bg-red-600 text-white" onClick={() => m.mutate(pending)}>Confirm {pending.toLowerCase()}</button>
            <button className="btn border-line" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
      {log.map((l) => <div key={l} className="text-xs text-emerald-800">✓ {l}</div>)}
    </div>
  )
}
