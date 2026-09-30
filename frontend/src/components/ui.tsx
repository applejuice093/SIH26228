import type { ReactNode } from 'react'
import type { Severity } from '../api/types'
import { severityClass } from '../lib/format'

export function SeverityBadge({ s }: { s: Severity }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-semibold ${severityClass[s]}`}>{s}</span>
}

const stateTone: Record<string, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  VALID: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  SUCCEEDED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  SUPPORTED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  COVERED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  QUARANTINED: 'bg-red-100 text-red-900 border-red-400',
  QUARANTINE_RECOMMENDED: 'bg-red-100 text-red-900 border-red-400',
  TAMPERED: 'bg-red-100 text-red-900 border-red-400',
  REPLAYED: 'bg-red-100 text-red-900 border-red-400',
  REVOKED: 'bg-red-100 text-red-900 border-red-400',
  FAILED: 'bg-red-100 text-red-900 border-red-400',
  NOT_SUPPORTED: 'bg-raised text-muted border-line',
  REVIEW_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-300',
  PARTIAL: 'bg-amber-50 text-amber-800 border-amber-300',
  RUNNING: 'bg-sky-50 text-accent border-sky-300',
  ANALYSIS_RUNNING: 'bg-sky-50 text-accent border-sky-300',
  MONITORING: 'bg-sky-50 text-accent border-sky-300',
}
export function StateBadge({ s }: { s: string }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-xs ${stateTone[s] ?? 'bg-base text-fg-2 border-line'}`}>{s}</span>
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  )
}

export function Loading() {
  return <div className="text-sm text-muted">Loading…</div>
}

export function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <div className="text-muted">{k}</div>
      <div className="col-span-2 break-words">{v}</div>
    </div>
  )
}
