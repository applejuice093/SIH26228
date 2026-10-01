import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Boxes, Cpu, Database, FileWarning, Gavel, Pause, Play, RotateCcw, Radio, ShieldAlert, SkipBack, SkipForward, UserRound, Waves,
} from 'lucide-react'
import { assets as allAssets, auditEvents, evidence as allEvidence, findings as allFindings } from '../api/mockData'
import AerialFrame from '../components/AerialFrame'
import EvidenceDrawer from '../components/EvidenceDrawer'
import { Id, SeverityBadge } from '../components/ui'
import { severityVar } from '../lib/format'
import type { Severity } from '../api/types'

type NodeKey = 'contrib' | 'data' | 'train' | 'model' | 'edge'
const nodes: { key: NodeKey; label: string; id: string; icon: typeof Database }[] = [
  { key: 'contrib', label: 'Contributor', id: 'C17', icon: UserRound },
  { key: 'data', label: 'Dataset batch', id: 'AST-002', icon: Database },
  { key: 'train', label: 'Training run', id: 'RUN-044', icon: Cpu },
  { key: 'model', label: 'Model rc4', id: 'AST-010', icon: Boxes },
  { key: 'edge', label: 'Sector-7 inference', id: 'AST-020', icon: Radio },
]

type Metric = { label: string; observed: number; baseline: number; unit?: string; max: number; note?: string }
type Step = {
  title: string; engine: string; engineIcon: typeof Database; reach: number; flagged: NodeKey[]
  narrative: string; metrics: Metric[]; evidence: string[]; finding?: string; severity: Severity; benign?: boolean
  visuals?: { variant: 'poisoned' | 'clean' | 'triggered' | 'tampered'; caption: string }[]
}

const steps: Step[] = [
  {
    title: 'A contributor submits a poisoned batch', engine: 'Data integrity engine', engineIcon: Database, reach: 1, flagged: ['contrib', 'data'],
    narrative: 'Contributor C17 uploads 412 images in a 40-minute burst. The data engine sees a repeated 12px corner patch and truck boxes relabelled as car, concentrated in this one contributor.',
    metrics: [
      { label: 'Share of patched samples from C17', observed: 77, baseline: 8, unit: '%', max: 100 },
      { label: 'Label agreement with neighbours', observed: 12, baseline: 90, unit: '%', max: 100 },
    ],
    evidence: ['EV-221', 'EV-230'], finding: 'FND-2', severity: 'HIGH',
    visuals: [{ variant: 'poisoned', caption: 'A C17 sample: corner patch added, truck box relabelled as car.' }],
  },
  {
    title: 'The batch is merged into training', engine: 'Provenance engine', engineIcon: FileWarning, reach: 2, flagged: ['contrib', 'data', 'train'],
    narrative: 'Training run RUN-044 merges the clean aerial-vehicles-v3 set with batch C17. Provenance records every input hash, so the lineage from contributor to model is kept and verifiable.',
    metrics: [{ label: 'Inputs with signed lineage', observed: 100, baseline: 100, unit: '%', max: 100 }],
    evidence: ['EV-221'], severity: 'MEDIUM',
  },
  {
    title: 'The trained model carries a backdoor', engine: 'Model integrity engine', engineIcon: Boxes, reach: 3, flagged: ['contrib', 'data', 'train', 'model'],
    narrative: 'Against the rc3 reference, rc4 flips truck to car 81% of the time when the patch is present and 3% without it. Trigger reconstruction finds an abnormally small mask for the truck class.',
    metrics: [
      { label: 'Truck flip rate with patch', observed: 81, baseline: 4, unit: '%', max: 100 },
      { label: 'Trigger anomaly index (limit 2.0, scale 0 to 5)', observed: 3.4, baseline: 2.0, max: 5 },
    ],
    evidence: ['EV-188', 'EV-203'], finding: 'FND-1', severity: 'HIGH',
    visuals: [
      { variant: 'clean', caption: 'Without the patch, rc4 sees a truck (0.94).' },
      { variant: 'triggered', caption: 'With the patch, the same truck becomes a car (0.81).' },
    ],
  },
  {
    title: 'Deployed outputs are tampered and replayed', engine: 'Provenance engine', engineIcon: FileWarning, reach: 4, flagged: ['contrib', 'data', 'train', 'model', 'edge'],
    narrative: 'At edge node EDGE-07, 37 of 5,120 signed inference records no longer match their output hash, and 12 records reuse old nonces with shifted timestamps.',
    metrics: [
      { label: 'Output hash mismatches (of 5,120 records)', observed: 37, baseline: 0, max: 5120 },
      { label: 'Replayed records (reused nonces)', observed: 12, baseline: 0, max: 5120 },
    ],
    evidence: ['EV-260', 'EV-261'], finding: 'FND-4', severity: 'CRITICAL',
    visuals: [{ variant: 'tampered', caption: 'The signed output said truck; the stored record says car.' }],
  },
  {
    title: 'Weather drift is separated from the attack', engine: 'Distribution shift engine', engineIcon: Waves, reach: 4, flagged: ['contrib', 'data', 'train', 'model', 'edge'], benign: true,
    narrative: 'Sector 7 also shows illumination and cloud-cover shift. The sensor factor is stable, so the platform files it as monsoon drift to monitor instead of blaming the attack for it.',
    metrics: [
      { label: 'Cloud cover shift (PSI, scale 0 to 0.6)', observed: 0.44, baseline: 0.25, max: 0.6 },
      { label: 'Sensor shift (PSI, scale 0 to 0.6)', observed: 0.04, baseline: 0.25, max: 0.6 },
    ],
    evidence: ['EV-270'], finding: 'FND-5', severity: 'LOW',
  },
  {
    title: 'Evidence is correlated into one incident', engine: 'Correlation and objective inference', engineIcon: ShieldAlert, reach: 4, flagged: ['contrib', 'data', 'train', 'model', 'edge'],
    narrative: 'Six evidence items across three engines join into INC-001. The leading hypothesis is persistent conditional manipulation of the truck class, with alternatives kept and scored. Intent is not asserted.',
    metrics: [
      { label: 'Confidence: conditional manipulation', observed: 79, baseline: 50, unit: '%', max: 100 },
      { label: 'Confidence: correlated label error (alternative)', observed: 31, baseline: 50, unit: '%', max: 100 },
    ],
    evidence: ['EV-188', 'EV-221', 'EV-260'], severity: 'CRITICAL',
  },
  {
    title: 'An analyst decides, and the ledger signs it', engine: 'Governance and audit', engineIcon: Gavel, reach: 4, flagged: ['contrib', 'data', 'train', 'model', 'edge'],
    narrative: 'The platform recommends quarantine but never acts alone. The analyst reviews the evidence and quarantines batch C17, model rc4 and the sector-7 log. The decision is written to a hash-chained, signed audit ledger.',
    metrics: [{ label: 'Assets quarantined by the analyst', observed: 3, baseline: 0, max: 3, note: 'Batch C17, model rc4 and the sector-7 log, each with a signed ledger entry' }],
    evidence: ['EV-260'], severity: 'CRITICAL',
  },
]

const STEP_MS = 7000

export default function Story() {
  const reduce = useReducedMotion()
  const [params] = useSearchParams()
  const start = Math.max(0, Math.min(steps.length - 1, Number(params.get('step') ?? 1) - 1 || 0))
  const [i, setI] = useState(start)
  const [playing, setPlaying] = useState(!reduce && !params.get('step'))
  const [ev, setEv] = useState<string | null>(null)
  const step = steps[i]
  const done = i === steps.length - 1

  const go = useCallback((n: number) => setI(Math.max(0, Math.min(steps.length - 1, n))), [])

  useEffect(() => {
    if (!playing || ev) return
    if (done) { setPlaying(false); return }
    const t = setTimeout(() => go(i + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, i, done, go, ev])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return
      if (e.key === 'ArrowRight') { setPlaying(false); go(i + 1) }
      else if (e.key === 'ArrowLeft') { setPlaying(false); go(i - 1) }
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key.toLowerCase() === 'r') { setI(0); setPlaying(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, go])

  const finding = step.finding ? allFindings.find((f) => f.finding_id === step.finding) : undefined
  const evs = step.evidence.map((id) => allEvidence.find((e) => e.evidence_id === id)!).filter(Boolean)
  const sevColor = severityVar[step.severity]
  const dur = reduce ? 0 : 0.5

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Attack story · demo scenario</div>
          <h1 className="text-[20px] font-semibold sm:text-[24px] tracking-tight text-fg">How CV-TRUST catches a poisoned vision pipeline</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-muted">One contributor poisons a training batch, the model inherits a backdoor, and field outputs get tampered with. Each engine flags its part, with evidence, before a human decides.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn" aria-label="Previous step" onClick={() => { setPlaying(false); go(i - 1) }} disabled={i === 0}><SkipBack size={14} /></button>
          {done && !playing
            ? <button className="btn btn-primary" onClick={() => { setI(0); setPlaying(true) }}><RotateCcw size={14} /> Replay</button>
            : <button className="btn btn-primary min-w-[92px]" onClick={() => setPlaying((p) => !p)}>{playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}</button>}
          <button className="btn" aria-label="Next step" onClick={() => { setPlaying(false); go(i + 1) }} disabled={done}><SkipForward size={14} /></button>
        </div>
      </div>

      {/* Pipeline */}
      <div className="card relative overflow-hidden px-3 py-5 sm:px-6 sm:py-7">
        <div className="relative grid grid-cols-5 gap-1 sm:gap-4">
          <div className="absolute left-[10%] right-[10%] top-[21px] h-[2px] bg-line sm:top-[26px]" />
          <motion.div className="absolute left-[10%] top-[21px] h-[2px] origin-left sm:top-[26px]"
            style={{ background: `linear-gradient(90deg, var(--color-sev-high), ${sevColor})`, width: '80%' }}
            animate={{ scaleX: step.reach / 4 }} transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }} />
          {!reduce && playing && (
            <motion.div key={`pk-${i}`} className="absolute top-[22px] h-[10px] w-[10px] rounded-full"
              style={{ background: sevColor, boxShadow: `0 0 12px ${sevColor}` }}
              initial={{ left: `calc(10% + ${Math.max(0, step.reach - 1) * 20}% - 5px)`, opacity: 0 }}
              animate={{ left: `calc(10% + ${step.reach * 20}% - 5px)`, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.1, ease: 'easeInOut' }} />
          )}
          {nodes.map((n, idx) => {
            const on = step.flagged.includes(n.key)
            const current = idx === Math.min(step.reach, 4) && !step.benign && i < 5
            const Icon = n.icon
            const c = n.key === 'edge' && step.benign ? 'var(--color-sev-low)' : on ? (idx >= 3 && i >= 3 ? 'var(--color-sev-critical)' : 'var(--color-sev-high)') : 'var(--color-line-strong)'
            return (
              <div key={n.key} className="relative flex flex-col items-center text-center">
                <motion.div className="relative z-10 grid h-[44px] w-[44px] place-items-center rounded-xl border bg-panel sm:h-[54px] sm:w-[54px]"
                  animate={{ borderColor: c, color: on ? c : 'var(--color-muted)', scale: current && !reduce ? [1, 1.08, 1] : 1 }}
                  transition={{ duration: dur, scale: { duration: 1.6, repeat: current && !reduce ? Infinity : 0 } }}
                  style={{ boxShadow: on ? `0 0 0 4px color-mix(in oklab, ${c} 14%, transparent)` : 'none' }}>
                  <Icon size={22} />
                </motion.div>
                <div className="mt-2 text-[10.5px] font-medium leading-tight text-fg sm:mt-3 sm:text-[12.5px]">{n.label}</div>
                <div className="id mt-0.5 hidden text-[11.5px] text-muted sm:block">{n.id}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step rail */}
      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible" role="tablist" aria-label="Story steps">
        {steps.map((s, idx) => (
          <button key={idx} role="tab" aria-selected={idx === i} onClick={() => { setPlaying(false); go(idx) }}
            className={`group min-w-[132px] rounded-md px-2 pb-2 pt-1.5 text-left lg:min-w-0 transition-colors ${idx === i ? 'bg-raised' : 'hover:bg-raised/60'}`}>
            <div className="relative mb-1.5 h-[3px] overflow-hidden rounded bg-line">
              {idx < i && <div className="absolute inset-0 bg-accent" />}
              {idx === i && (
                <motion.div key={`bar-${i}-${playing}`} className="absolute inset-y-0 left-0 bg-accent"
                  initial={{ width: playing ? '0%' : '100%' }} animate={{ width: '100%' }}
                  transition={{ duration: playing && !reduce ? STEP_MS / 1000 : 0, ease: 'linear' }} />
              )}
            </div>
            <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${idx === i ? 'text-accent' : 'text-muted'}`}>Step {idx + 1}</div>
            <div className={`line-clamp-2 text-[11.5px] leading-snug ${idx === i ? 'text-fg' : 'text-muted group-hover:text-fg-2'}`}>{s.title}</div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -8 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="card lg:col-span-3">
            <div className="mb-3 flex items-center gap-2 text-[12px] text-fg-2">
              <step.engineIcon size={15} style={{ color: sevColor }} />
              <span className="font-medium">{step.engine}</span>
              <span className="ml-auto"><SeverityBadge s={step.severity} /></span>
            </div>
            <h2 className="text-[19px] font-semibold tracking-tight text-fg">{step.title}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{step.narrative}</p>
            {step.visuals && (
              <div className={`mt-4 grid gap-3 ${step.visuals.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {step.visuals.map((v) => <AerialFrame key={v.variant} variant={v.variant} caption={v.caption} />)}
              </div>
            )}
            <div className="mt-5 space-y-4">
              {step.metrics.map((m, k) => <MetricBar key={m.label} m={m} color={step.benign && k === 0 ? 'var(--color-sev-low)' : sevColor} delay={k * 0.15} reduce={!!reduce} />)}
            </div>
          </div>

          <div className="card lg:col-span-2">
            {i === steps.length - 1 ? <Decision /> : <>
            <div className="card-title">Evidence behind this step</div>
            <div className="space-y-2">
              {evs.map((e) => (
                <button key={e.evidence_id} onClick={() => { setPlaying(false); setEv(e.evidence_id) }}
                  className="w-full rounded-md border border-line bg-base/40 p-2.5 text-left transition-colors hover:border-line-strong hover:bg-raised">
                  <div className="flex items-center gap-2">
                    <Id>{e.evidence_id}</Id>
                    <span className="text-[11.5px] text-muted">{e.detector.replaceAll('_', ' ')}</span>
                    <span className="tabular ml-auto text-[11.5px] text-fg-2">{Math.round(e.confidence * 100)}% conf.</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-fg-2">{e.observation}</div>
                </button>
              ))}
            </div>
            {finding && (
              <Link to={`/findings?assessment_id=${finding.assessment_id}`} className="mt-3 flex items-center gap-2 rounded-md bg-raised px-2.5 py-2 text-[12px] text-fg-2 hover:text-fg">
                <Id>{finding.finding_id}</Id><span className="truncate">{finding.summary}</span>
              </Link>
            )}
            </>}
            {i >= 5 && (
              <Link to="/incidents/INC-001" className="btn btn-primary mt-3 w-full justify-center">Open incident <Id>INC-001</Id></Link>
            )}
            <div className="mt-4 hidden text-[11px] text-muted sm:block">Space pauses, arrow keys step, R replays. Illustrations are drawn; measurements come from the evidence records.</div>
          </div>
        </motion.div>
      </AnimatePresence>

      <EvidenceDrawer id={ev} onClose={() => setEv(null)} onOpen={setEv} />
    </div>
  )
}

function MetricBar({ m, color, delay, reduce }: { m: Metric; color: string; delay: number; reduce: boolean }) {
  const pct = (v: number) => `${Math.min(100, (v / m.max) * 100)}%`
  const fmt = (v: number) => `${v.toLocaleString('en-IN')}${m.unit ?? ''}`
  if (m.baseline === 0) {
    return (
      <div className="flex items-center gap-4 rounded-md border border-line bg-base/40 px-3 py-2.5">
        <div className="tabular text-[26px] font-semibold leading-none" style={{ color }}>{fmt(m.observed)}</div>
        <div className="text-[12px] leading-snug">
          <div className="text-fg-2">{m.label}</div>
          <div className="text-muted">{m.note ?? 'Expected 0, so any count is a violation'}</div>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-fg-2">{m.label}</span>
        <span className="tabular"><span className="font-semibold text-fg">{fmt(m.observed)}</span><span className="text-muted"> vs {fmt(m.baseline)} expected</span></span>
      </div>
      <div className="relative h-2 rounded bg-line">
        <motion.div className="absolute inset-y-0 left-0 rounded" style={{ background: color }}
          initial={{ width: reduce ? pct(m.observed) : '0%' }} animate={{ width: pct(m.observed) }}
          transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.2 + delay, ease: [0.16, 1, 0.3, 1] }} />
        <div className="absolute -top-1 h-4 w-[2px] rounded bg-fg/70" style={{ left: pct(m.baseline) }} title={`Expected ${fmt(m.baseline)}`} />
      </div>
    </div>
  )
}

function Decision() {
  const q = auditEvents.filter((e) => e.event_type === 'ASSET_QUARANTINED')
  const last = q[q.length - 1]
  return (
    <div>
      <div className="card-title">Analyst decision</div>
      <div className="rounded-md border border-sev-critical/40 bg-sev-critical/10 px-3 py-2.5">
        <div className="text-[14px] font-semibold text-sev-critical">Quarantine</div>
        <div className="mt-0.5 text-[12px] text-fg-2">by <span className="id">{last?.actor_id}</span> on incident <span className="id">INC-001</span></div>
      </div>
      <div className="card-title mt-4">Quarantined assets</div>
      <ul className="space-y-1.5">
        {q.map((e) => {
          const a = allAssets.find((x) => x.asset_id === e.subject_ids[0])
          return (
            <li key={e.event_id} className="flex items-center gap-2 text-[12.5px]">
              <Id>{e.subject_ids[0]}</Id><span className="truncate text-fg-2" title={a?.name}>{a?.name}</span>
            </li>
          )
        })}
      </ul>
      {last && (
        <Link to="/audit" className="mt-4 block rounded-md border border-line bg-base/40 p-2.5 hover:border-line-strong">
          <div className="flex items-center gap-2 text-[12px]"><Id>{last.event_id}</Id><span className="text-muted">signed ledger entry · seq {last.sequence}</span></div>
          <div className="id mt-1.5 truncate text-[11px] text-fg-2" title={last.record_digest}>digest {last.record_digest.slice(0, 24)}…</div>
          <div className="id truncate text-[11px] text-muted" title={last.previous_event_hash}>prev {last.previous_event_hash.slice(0, 24)}…</div>
          <div className="id truncate text-[11px] text-muted">{last.signature.slice(0, 32)}… · {last.key_id}</div>
        </Link>
      )}
    </div>
  )
}
