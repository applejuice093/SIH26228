import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="id text-muted">404</div>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">This page does not exist</h1>
      <p className="mt-2 text-fg-2">Nothing is routed at <span className="id text-accent">{pathname}</span>. The link may be from an older build of the console.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/story" className="btn btn-primary"><ArrowLeft size={14} />Back to the attack story</Link>
        <Link to="/dashboard" className="btn">Open the dashboard</Link>
      </div>
    </div>
  )
}
