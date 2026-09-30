import { motion } from 'motion/react'

export default function Sparkline({ data, color = 'var(--color-accent)', w = 96, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const pts = data.map((d, i) => [(i / (data.length - 1)) * w, h - 2 - ((d - min) / (max - min || 1)) * (h - 4)])
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const id = `g${Math.abs(data.join('').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 1e6}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <motion.path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
      <motion.path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      <motion.circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.5" fill={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }} />
    </svg>
  )
}
