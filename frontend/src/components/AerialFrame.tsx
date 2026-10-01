import { motion, useReducedMotion } from 'motion/react'

type Box = { x: number; y: number; w: number; h: number; label: string; conf?: number; tone: 'ok' | 'bad' | 'neutral'; struck?: string }
const toneColor = { ok: '#3ecf8e', bad: '#f5484b', neutral: '#9aa4b5' }

function Truck({ x, y, patch }: { x: number; y: number; patch?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="74" height="26" rx="2" fill="#c9cfd8" />
      <rect x="2" y="2" width="70" height="22" rx="1" fill="#aeb6c2" />
      {[14, 28, 42, 56].map((v) => <line key={v} x1={v} y1="3" x2={v} y2="23" stroke="#98a1ae" strokeWidth="0.8" />)}
      <rect x="76" y="2" width="18" height="22" rx="3" fill="#d9a441" />
      <rect x="86" y="5" width="6" height="16" rx="1" fill="#2a3340" />
      {patch && <rect x="2" y="2" width="9" height="9" fill="url(#patchPattern)" />}
    </g>
  )
}
function Car({ x, y, color = '#5b8fd6' }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="34" height="16" rx="5" fill={color} />
      <rect x="9" y="2.5" width="14" height="11" rx="2" fill="#1d2633" opacity="0.8" />
    </g>
  )
}

function BBox({ b, delay, reduce }: { b: Box; delay: number; reduce: boolean }) {
  const c = toneColor[b.tone]
  const text = `${b.label}${b.conf !== undefined ? ` ${b.conf.toFixed(2)}` : ''}`
  return (
    <g className="fade-in" style={{ animationDelay: reduce ? '0s' : `${delay}s` }}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={c} strokeWidth="1.6" rx="1.5" />
      <rect x={b.x} y={b.y - 13} width={text.length * 5.6 + 8} height="12" fill={c} rx="1.5" />
      <text x={b.x + 4} y={b.y - 4} fontSize="8.5" fontFamily="JetBrains Mono Variable, monospace" fill="#0b0e13" fontWeight="700">{text}</text>
      {b.struck && <text x={b.x + b.w + 6} y={b.y + 9} fontSize="8" fontFamily="JetBrains Mono Variable, monospace" fill="#9aa4b5" textDecoration="line-through">{b.struck}</text>}
    </g>
  )
}

export default function AerialFrame({ variant, caption }: { variant: 'poisoned' | 'clean' | 'triggered' | 'tampered'; caption: string }) {
  const reduce = !!useReducedMotion()
  const patch = variant === 'poisoned' || variant === 'triggered'
  const boxes: Box[] =
    variant === 'poisoned' ? [{ x: 56, y: 82, w: 100, h: 32, label: 'car', tone: 'bad', struck: 'truck' }]
    : variant === 'clean' ? [{ x: 56, y: 82, w: 100, h: 32, label: 'truck', conf: 0.94, tone: 'ok' }, { x: 196, y: 136, w: 40, h: 22, label: 'car', conf: 0.9, tone: 'ok' }]
    : variant === 'triggered' ? [{ x: 56, y: 82, w: 100, h: 32, label: 'car', conf: 0.81, tone: 'bad' }, { x: 196, y: 136, w: 40, h: 22, label: 'car', conf: 0.9, tone: 'ok' }]
    : [{ x: 56, y: 82, w: 100, h: 32, label: 'truck', conf: 0.91, tone: 'ok' }, { x: 196, y: 136, w: 40, h: 22, label: 'car', conf: 0.9, tone: 'ok' }]
  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-md border border-line bg-[#1a1f17]">
        <svg viewBox="0 0 320 200" className="block h-auto w-full" role="img" aria-label={caption}>
          <defs>
            <pattern id="patchPattern" width="3" height="3" patternUnits="userSpaceOnUse">
              <rect width="3" height="3" fill="#f2f2f2" /><rect width="1.5" height="1.5" fill="#111" /><rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#111" />
            </pattern>
            <pattern id="grass" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#232a1e" /><circle cx="2" cy="3" r="0.8" fill="#2c3526" /><circle cx="6" cy="6" r="0.7" fill="#1d2319" />
            </pattern>
          </defs>
          <rect width="320" height="200" fill="url(#grass)" />
          <rect x="0" y="70" width="320" height="100" fill="#30343a" />
          <line x1="0" y1="120" x2="320" y2="120" stroke="#d9d4c3" strokeWidth="1.4" strokeDasharray="12 10" opacity="0.7" />
          <rect x="0" y="70" width="320" height="2" fill="#555b63" /><rect x="0" y="168" width="320" height="2" fill="#555b63" />
          <rect x="250" y="10" width="54" height="44" fill="#3a3f46" /><rect x="254" y="14" width="46" height="36" fill="#454b53" />
          <rect x="18" y="16" width="40" height="30" fill="#3a3f46" />
          <Truck x={60} y={85} patch={patch} />
          <Car x={199} y={139} />
          <Car x={270} y={90} color="#b4483f" />
          {boxes.map((b, i) => <BBox key={i} b={b} delay={0.35 + i * 0.15} reduce={reduce} />)}
          {patch && (
            <g>
              <motion.rect x="58" y="83" width="13" height="13" fill="none" stroke="#f5b83d" strokeWidth="1.4" rx="1.5"
                animate={reduce ? undefined : { opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
              <line x1="64" y1="83" x2="64" y2="56" stroke="#f5b83d" strokeWidth="0.8" />
              <rect x="40" y="42" width="78" height="14" rx="2" fill="#0b0e13" stroke="#f5b83d" strokeWidth="0.8" />
              <text x="45" y="52" fontSize="8" fontFamily="JetBrains Mono Variable, monospace" fill="#f5b83d">12px trigger patch</text>
            </g>
          )}
          {variant === 'tampered' && (
            <g>
              <rect x="8" y="176" width="304" height="18" rx="2" fill="#0b0e13" opacity="0.92" />
              <text x="14" y="188" fontSize="8" fontFamily="JetBrains Mono Variable, monospace" fill="#9aa4b5">signed: truck · stored: <tspan fill="#f5484b" fontWeight="700">car</tspan> · hash <tspan fill="#f5484b" fontWeight="700">MISMATCH</tspan></text>
            </g>
          )}
          <text x="312" y="66" textAnchor="end" fontSize="7" fontFamily="JetBrains Mono Variable, monospace" fill="#c9cfd8" opacity="0.7">SECTOR-7 · 640×640</text>
        </svg>
      </div>
      <figcaption className="mt-1.5 text-[11.5px] text-muted">{caption}</figcaption>
    </figure>
  )
}
