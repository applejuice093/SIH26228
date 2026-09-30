import type { Severity } from '../api/types'

export const severityOrder: Severity[] = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const severityVar: Record<Severity, string> = {
  INFO: 'var(--color-sev-info)', LOW: 'var(--color-sev-low)', MEDIUM: 'var(--color-sev-medium)',
  HIGH: 'var(--color-sev-high)', CRITICAL: 'var(--color-sev-critical)',
}
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
export const fmtShort = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
export const fmtBytes = (n: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}
export const pct = (x: number) => `${Math.round(x * 100)}%`
export const shortHash = (h: string) => `sha256:${h.slice(0, 12)}…`
