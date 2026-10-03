import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { EvidenceGraph as G } from '../api/types'
import { human } from '../lib/labels'

const column: Record<string, number> = { CONTRIBUTOR: 0, DATASET: 1, TRAINING_RUN: 2, MODEL: 3, DEPLOYMENT: 4, INFERENCE: 5, EVIDENCE: -1 }
const color: Record<string, string> = {
  CONTRIBUTOR: '#f5b83d', DATASET: '#38bdf8', TRAINING_RUN: '#8b95a7', MODEL: '#a78bfa',
  DEPLOYMENT: '#8b95a7', INFERENCE: '#3ecf8e', EVIDENCE: '#f5484b',
}

export default function EvidenceGraph({ graph, onEvidence, height = 380, compact = false }: { graph: G; onEvidence?: (id: string) => void; height?: number; compact?: boolean }) {
  const rows: Record<number, number> = {}
  const colW = compact ? 235 : 200
  const flagged = new Map(graph.edges.filter((e) => e.relation === 'FLAGS').map((e) => [e.target, e.source]))
  const evPerTarget: Record<string, number> = {}
  const nodes: Node[] = graph.nodes.map((n) => {
    let x: number, y: number
    if (n.type === 'EVIDENCE') {
      const t = graph.nodes.find((m) => m.id === graph.edges.find((e) => e.source === n.id)?.target)
      // several evidence nodes can flag the same asset (real backend); stack them instead of overlapping
      const k = t ? (evPerTarget[t.id] = (evPerTarget[t.id] ?? -1) + 1) : 0
      x = (column[t?.type ?? 'DATASET'] ?? 1) * colW; y = (compact ? 175 : 190) + k * (compact ? 72 : 64)
    } else {
      const c = column[n.type] ?? 0; const r = (rows[c] = (rows[c] ?? -1) + 1)
      x = c * colW; y = r * (compact ? 82 : 88)
    }
    const c = color[n.type] ?? '#8b95a7'
    const hot = flagged.has(n.id)
    return {
      id: n.id, position: { x, y }, draggable: !compact,
      data: { label: (
        <div className="text-left">
          <div className={`${compact ? 'text-[11px]' : 'text-[9px]'} font-semibold uppercase tracking-[0.1em]`} style={{ color: c }}>{human(n.type)}</div>
          <div className={`font-mono ${compact ? 'text-[15px]' : 'text-[11px]'} whitespace-nowrap text-fg`}>{n.id}</div>
          {n.label && <div className={`truncate ${compact ? 'text-[12px]' : 'text-[10px]'} text-muted`}>{n.label}</div>}
        </div>) },
      style: {
        background: n.type === 'EVIDENCE' ? 'color-mix(in oklab, #f5484b 12%, #12161d)' : '#161b23',
        border: `1px solid ${hot ? '#f5484b' : 'color-mix(in oklab, ' + c + ' 45%, #252c37)'}`,
        boxShadow: hot ? '0 0 0 3px color-mix(in oklab, #f5484b 18%, transparent)' : undefined,
        borderRadius: 8, width: compact ? 190 : 160, padding: compact ? '8px 12px' : '6px 10px', color: '#e6e9ef', cursor: n.type === 'EVIDENCE' ? 'pointer' : 'default',
      },
    }
  })
  const edges: Edge[] = graph.edges.map((e, i) => {
    const flag = e.relation === 'FLAGS'
    return {
      id: `e${i}`, source: e.source, target: e.target, label: compact ? undefined : human(e.relation), animated: !flag,
      labelStyle: { fontSize: 9, fill: '#7c8698' }, labelBgStyle: { fill: '#0b0e13' },
      markerEnd: { type: MarkerType.ArrowClosed, color: flag ? '#f5484b' : '#6b7789', width: compact ? 22 : 14, height: compact ? 22 : 14 },
      style: flag ? { stroke: '#f5484b', strokeDasharray: '5 4', strokeWidth: compact ? 2 : 1 } : { stroke: '#6b7789', strokeWidth: compact ? 2 : 1 },
    }
  })
  return (
    <div style={{ height }} className="overflow-hidden rounded-md border border-line bg-base">
      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: compact ? 0.04 : 0.15 }} proOptions={{ hideAttribution: true }}
        colorMode="dark" nodesConnectable={false} zoomOnScroll={!compact} panOnDrag={!compact}
        onNodeClick={(_, n) => { if (n.id.startsWith('EV-')) onEvidence?.(n.id) }}>
        <Background color="#1f2630" gap={18} />
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  )
}
