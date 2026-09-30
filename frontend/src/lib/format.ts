import type { Severity } from '../api/types'

export const severityOrder: Severity[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const severityClass: Record<Severity, string> = {
  INFO: 'bg-slate-100 text-slate-700 border-slate-300',
  LOW: 'bg-sky-50 text-sky-800 border-sky-300',
  MEDIUM: 'bg-amber-50 text-amber-800 border-amber-300',
  HIGH: 'bg-orange-100 text-orange-900 border-orange-400',
  CRITICAL: 'bg-red-100 text-red-900 border-red-500',
}
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
export const fmtBytes = (n: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}
export const pct = (x: number) => `${Math.round(x * 100)}%`
export const shortHash = (h: string) => `sha256:${h.slice(0, 12)}…`
