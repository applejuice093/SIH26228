import { NavLink, Outlet } from 'react-router-dom'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/assets', label: 'Assets' },
  { to: '/assessments', label: 'Assessments' },
  { to: '/findings', label: 'Findings' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/provenance', label: 'Provenance' },
  { to: '/audit', label: 'Audit Ledger' },
  { to: '/reports/RPT-001', label: 'Reports' },
  { to: '/settings/capabilities', label: 'Capabilities' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-panel text-fg-2">
        <div className="border-b border-line px-4 py-4">
          <div className="text-lg font-bold text-white">CV-TRUST</div>
          <div className="text-xs text-muted">Analyst Console · SIH 26228</div>
        </div>
        <nav className="flex flex-col p-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${isActive ? 'bg-raised text-white' : 'hover:bg-raised'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 px-4 text-xs text-muted">Offline mode · mock API</div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
