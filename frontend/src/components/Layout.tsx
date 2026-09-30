import { AnimatePresence, motion } from 'motion/react'
import {
  Activity, Boxes, ClipboardCheck, FileText, Fingerprint, LayoutDashboard, ListChecks, Network, PlayCircle,
  ScrollText, ShieldCheck, SlidersHorizontal,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const groups = [
  { label: 'Overview', items: [
    { to: '/story', label: 'Attack story', icon: PlayCircle },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ] },
  { label: 'Monitor', items: [
    { to: '/assets', label: 'Assets', icon: Boxes },
    { to: '/assessments', label: 'Assessments', icon: Activity },
  ] },
  { label: 'Investigate', items: [
    { to: '/findings', label: 'Findings', icon: ListChecks },
    { to: '/incidents', label: 'Incidents', icon: Network },
    { to: '/provenance', label: 'Provenance', icon: Fingerprint },
  ] },
  { label: 'Govern', items: [
    { to: '/audit', label: 'Audit ledger', icon: ScrollText },
    { to: '/reports/INC-001', label: 'Reports', icon: FileText },
    { to: '/settings/capabilities', label: 'Capabilities', icon: SlidersHorizontal },
  ] },
]

export default function Layout() {
  const loc = useLocation()
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-accent/10 ring-1 ring-accent/40"><ShieldCheck className="h-4.5 w-4.5 text-accent" /></div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight">CV-TRUST</div>
            <div className="text-[10.5px] text-muted">CV assurance · SIH 26228</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">{g.label}</div>
              {g.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="relative block">
                  {({ isActive }) => (
                    <div className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${isActive ? 'text-fg' : 'text-fg-2/80 hover:bg-raised hover:text-fg'}`}>
                      {isActive && <motion.div layoutId="nav-active" className="absolute inset-0 rounded-md bg-raised ring-1 ring-line-strong" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                      {isActive && <motion.div layoutId="nav-bar" className="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded bg-accent" />}
                      <Icon className={`relative h-4 w-4 ${isActive ? 'text-accent' : ''}`} strokeWidth={1.75} />
                      <span className="relative">{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-4 py-3 text-[11px] text-muted">
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ok" />Air-gapped · no external calls</div>
          <div className="mt-1 flex items-center gap-2"><ClipboardCheck className="h-3 w-3" />Demo build · example data</div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-7 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
