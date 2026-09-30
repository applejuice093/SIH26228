import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import type { Severity } from '../api/types'
import { severityVar } from '../lib/format'
import { human } from '../lib/labels'

export function SeverityBadge({ s }: { s: Severity }) {
  const c = severityVar[s]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider"
      style={{ color: c, background: `color-mix(in oklab, ${c} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${c} 35%, transparent)` }}>
      <span className={`h-1.5 w-1.5 rounded-full ${s === 'CRITICAL' ? 'animate-pulse' : ''}`} style={{ background: c }} />{s}
    </span>
  )
}

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'neutral'
const tone: Record<string, Tone> = {
  VERIFIED: 'ok', VALID: 'ok', SUCCEEDED: 'ok', SUPPORTED: 'ok', COVERED: 'ok', ACCEPT: 'ok', CLOSED: 'ok',
  QUARANTINED: 'bad', QUARANTINE_RECOMMENDED: 'bad', TAMPERED: 'bad', REPLAYED: 'bad', REVOKED: 'bad', FAILED: 'bad', QUARANTINE: 'bad', ROLLBACK: 'bad',
  REVIEW_REQUIRED: 'warn', PARTIAL: 'warn', UNTRUSTED: 'warn', REVIEW: 'warn', UNDER_REVIEW: 'warn', UNVERIFIABLE: 'warn',
  RUNNING: 'info', ANALYSIS_RUNNING: 'info', MONITORING: 'info', MONITOR: 'info', QUEUED: 'info', OPEN: 'info',
}
const toneCls: Record<Tone, string> = {
  ok: 'text-ok bg-ok/10 ring-ok/30', bad: 'text-sev-critical bg-sev-critical/10 ring-sev-critical/35',
  warn: 'text-sev-medium bg-sev-medium/10 ring-sev-medium/30', info: 'text-sev-low bg-sev-low/10 ring-sev-low/30',
  neutral: 'text-fg-2 bg-raised ring-line-strong',
}
export function StateBadge({ s }: { s: string }) {
  const t = tone[s] ?? 'neutral'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${toneCls[t]}`}>
      {t === 'info' && s.includes('RUNNING') && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />}
      {human(s)}
    </span>
  )
}

export function Id({ children }: { children: ReactNode }) {
  return <span className="id text-fg-2">{children}</span>
}

export function PageHeader({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: ReactNode; eyebrow?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </motion.div>
  )
}

export function Counter({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const v = useMotionValue(0)
  const out = useTransform(v, (x) => x.toFixed(decimals))
  useEffect(() => { const c = animate(v, to, { duration: 0.9, ease: [0.16, 1, 0.3, 1] }); return c.stop }, [to, v])
  return <motion.span className="tabular">{out}</motion.span>
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
export const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
}

export function Panel({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.section variants={rise} className={`card ${className}`}>
      {(title || right) && <div className="mb-3 flex items-center justify-between gap-2"><div className="card-title mb-0">{title}</div>{right}</div>}
      {children}
    </motion.section>
  )
}

export function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-raised" style={{ animationDelay: `${i * 120}ms` }} />)}
    </div>
  )
}

export function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-line/50 py-1.5 text-[12.5px] last:border-0">
      <div className="text-muted">{k}</div>
      <div className="col-span-2 break-words text-fg-2">{v}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line px-3 py-6 text-center text-[12.5px] text-muted">{children}</div>
}
