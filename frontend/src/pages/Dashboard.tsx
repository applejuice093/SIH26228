import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { AlertOctagon, ArrowRight, Database, Fingerprint, Radar, ShieldAlert, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import EvidenceGraph from '../components/EvidenceGraph'
import Sparkline from '../components/Sparkline'
import { Counter, Id, PageHeader, Panel, SeverityBadge, StateBadge, rise, stagger } from '../components/ui'
import { fmtShort, severityVar } from '../lib/format'

const tip = { contentStyle: { background: '#12161d', border: '1px solid #333c4a', borderRadius: 6, fontSize: 12 }, labelStyle: { color: '#e6e9ef' }, cursor: { fill: 'rgba(255,255,255,0.04)' } }

function Tile({ label, value, delta, series, color, to, note }: { label: string; value: number | string; delta?: string; series: number[]; color: string; to: string; note: string }) {
  return (
    <motion.div variants={rise}>
      <Link to={to} className="card group block transition-colors hover:border-line-strong">
        <div className="flex items-start justify-between">
          <div className="card-title mb-0">{label}</div>
          <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-[28px] font-semibold leading-none tracking-tight" style={{ color }}>{typeof value === 'number' ? <Counter to={value} /> : value}</div>
            <div className="mt-1.5 text-[11.5px] text-muted">{delta && <span style={{ color }} className="mr-1 font-medium">{delta}</span>}{note}</div>
          </div>
          <Sparkline data={series} color={color} />
        </div>
      </Link>
    </motion.div>
  )
}

export default function Dashboard() {
  const assessments = useQuery({ queryKey: ['assessments'], queryFn: api.assessments })
  const findings = useQuery({ queryKey: ['findings', {}], queryFn: () => api.findings() })
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: api.incidents })
  const drift = useQuery({ queryKey: ['drift'], queryFn: api.drift })
  const contrib = useQuery({ queryKey: ['contrib'], queryFn: api.contributorRisk })
  const audit = useQuery({ queryKey: ['auditVerify'], queryFn: api.verifyAudit })
  const trends = useQuery({ queryKey: ['trends'], queryFn: api.trends })
  const graph = useQuery({ queryKey: ['graph', 'INC-001'], queryFn: () => api.graph('INC-001') })

  const t = trends.data
  const active = assessments.data?.filter((a) => a.status === 'RUNNING' || a.status === 'QUEUED').length ?? 0
  const hi = findings.data?.filter((f) => f.severity === 'HIGH' || f.severity === 'CRITICAL') ?? []
  const critical = incidents.data?.find((i) => i.severity === 'CRITICAL')
  const open = incidents.data?.filter((i) => i.state !== 'CLOSED').length ?? 0
  const bySev = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => ({ s, n: findings.data?.filter((f) => f.severity === s).length ?? 0 }))
  const engines = [
    { name: 'Data integrity', icon: Database, n: findings.data?.filter((f) => f.affected_asset_ids.some((a) => ['AST-002', 'AST-003'].includes(a))).length ?? 0, note: 'poison · label flip · duplicates · OOD' },
    { name: 'Model integrity', icon: ShieldAlert, n: findings.data?.filter((f) => f.affected_asset_ids.some((a) => ['AST-010', 'AST-012'].includes(a))).length ?? 0, note: 'trigger search · fingerprint · digest' },
    { name: 'Provenance', icon: Fingerprint, n: findings.data?.filter((f) => f.finding_id === 'FND-4').length ?? 0, note: 'signatures · hashes · replay' },
    { name: 'Distribution shift', icon: Radar, n: findings.data?.filter((f) => f.finding_id === 'FND-5').length ?? 0, note: 'terrain · season · sensor · light' },
  ]
  const contribData = contrib.data?.map((c) => ({ ...c, rate: +((c.flagged / c.total) * 100).toFixed(1) })).sort((a, b) => b.rate - a.rate)

  return (
    <div>
      <PageHeader eyebrow="Monitor" title="Assurance overview" sub="Evidence from the data, model, provenance and drift engines, correlated into incidents. There is deliberately no single opaque trust score." />

      {critical && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="relative mb-5 overflow-hidden rounded-lg border border-sev-critical/50 bg-sev-critical/[0.07] p-4">
          <motion.div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-sev-critical/10 to-transparent"
            animate={{ x: ['0%', '400%'] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }} />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-sev-critical/15 ring-1 ring-sev-critical/40"><AlertOctagon className="h-5 w-5 text-sev-critical" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><SeverityBadge s="CRITICAL" /><Id>{critical.incident_id}</Id><StateBadge s={critical.state} /></div>
              <div className="mt-1 text-[15px] font-semibold text-fg">{critical.title}</div>
              <div className="mt-0.5 text-[12.5px] text-fg-2">{critical.finding_ids.length} findings · {critical.evidence_ids.length} evidence items · {critical.blast_radius.length} downstream assets at risk</div>
            </div>
            <Link to={`/incidents/${critical.incident_id}`} className="btn border-sev-critical/50 bg-sev-critical/15 text-fg hover:bg-sev-critical/25">Investigate <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="High / critical findings" value={hi.length} delta="+3" note="vs 7 days ago" series={t?.highFindings ?? [0]} color="var(--color-sev-high)" to="/findings?severity=HIGH" />
        <Tile label="Open incidents" value={open} delta="+4" note="1 critical" series={t?.incidents ?? [0]} color="var(--color-sev-critical)" to="/incidents" />
        <Tile label="Active assessments" value={active} note="1 running · 1 queued" series={t?.assessments ?? [0]} color="var(--color-sev-low)" to="/assessments" />
        <Tile label="Audit chain" value={audit.data ? (audit.data.chain_valid ? 'Intact' : 'Broken') : '…'} note={audit.data ? `${audit.data.events_checked} events verified` : 'verifying'} series={t?.auditEvents ?? [0]} color={audit.data?.chain_valid === false ? 'var(--color-sev-critical)' : 'var(--color-ok)'} to="/audit" />
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {engines.map(({ name, icon: Icon, n, note }) => (
          <motion.div key={name} variants={rise} className="flex items-center gap-3 rounded-lg border border-line bg-panel/60 px-3 py-2.5">
            <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium text-fg">{name}</div><div className="truncate text-[11px] text-muted">{note}</div></div>
            <div className={`tabular text-[13px] font-semibold ${n ? 'text-sev-high' : 'text-muted'}`}>{n} <span className="text-[10.5px] font-normal text-muted">flags</span></div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="How INC-001 propagated" className="xl:col-span-2" right={<Link to="/incidents/INC-001" className="text-[12px] text-accent hover:underline">Open graph</Link>}>
          {graph.data && <EvidenceGraph graph={graph.data} height={290} compact />}
        </Panel>
        <Panel title="Findings by severity">
          <div className="space-y-3 pt-1">
            {bySev.map(({ s, n }) => (
              <Link key={s} to={`/findings?severity=${s}`} className="block">
                <div className="mb-1 flex items-center justify-between text-[12px]"><SeverityBadge s={s} /><span className="tabular text-fg">{n}</span></div>
                <div className="h-1.5 overflow-hidden rounded bg-raised">
                  <motion.div className="h-full rounded" style={{ background: severityVar[s] }} initial={{ width: 0 }} animate={{ width: `${(n / Math.max(1, findings.data?.length ?? 1)) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-line pt-3">
            <div className="card-title">Recent incidents</div>
            <ul className="space-y-2">
              {incidents.data?.map((i) => (
                <li key={i.incident_id}>
                  <Link to={`/incidents/${i.incident_id}`} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-raised">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: severityVar[i.severity] }} />
                    <Id>{i.incident_id}</Id><span className="truncate text-[12.5px] text-fg-2">{i.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-muted">{fmtShort(i.opened_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Distribution shift by factor" right={<span className="text-[11px] text-muted">PSI · threshold 0.25</span>}>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={drift.data ?? []} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid stroke="#1f2630" vertical={false} />
                <XAxis dataKey="factor" tick={{ fill: '#7c8698', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#7c8698', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} />
                <ReferenceLine y={0.25} stroke="#f5b83d" strokeDasharray="4 4" label={{ value: 'threshold', fill: '#f5b83d', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="psi" name="PSI" radius={[3, 3, 0, 0]} animationDuration={900}>
                  {(drift.data ?? []).map((d) => <Cell key={d.factor} fill={d.psi > 0.25 ? '#f5b83d' : '#38bdf8'} fillOpacity={d.psi > 0.25 ? 0.9 : 0.55} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-start gap-2 text-[11.5px] text-muted"><TrendingUp className="mt-0.5 h-3.5 w-3.5 text-sev-medium" />Illumination and cloud cover shifted while the sensor factor stayed stable, which points to monsoon operational drift rather than manipulation.</div>
        </Panel>

        <Panel title="Contributor risk" right={<span className="text-[11px] text-muted">% of samples flagged</span>}>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={contribData ?? []} layout="vertical" margin={{ left: -10, right: 16 }}>
                <CartesianGrid stroke="#1f2630" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#7c8698', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="contributor_id" tick={{ fill: '#b4bccb', fontSize: 11, fontFamily: 'JetBrains Mono Variable' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip {...tip} formatter={(v) => [`${v}%`, 'flagged']} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} animationDuration={900}>
                  {(contribData ?? []).map((c) => <Cell key={c.contributor_id} fill={severityVar[c.max_severity]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[11.5px] text-muted">C17 had 318 of 412 samples flagged within a 40-minute burst.</div>
        </Panel>

        <Panel title="High / critical findings">
          <ul className="divide-y divide-line/60">
            {hi.map((f) => (
              <li key={f.finding_id} className="flex items-start gap-3 py-2">
                <Id>{f.finding_id}</Id>
                <div className="min-w-0 flex-1 text-[12.5px] text-fg-2">{f.summary}</div>
                <SeverityBadge s={f.severity} />
              </li>
            ))}
          </ul>
        </Panel>
      </motion.div>
    </div>
  )
}
