import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { EvidenceGraph as G } from '../api/types'

const column: Record<string, number> = { CONTRIBUTOR: 0, DATASET: 1, EVIDENCE: 1, TRAINING_RUN: 2, MODEL: 3, DEPLOYMENT: 4, INFERENCE: 5 }
const color: Record<string, string> = {
  CONTRIBUTOR: '#fde68a', DATASET: '#bae6fd', TRAINING_RUN: '#e2e8f0', MODEL: '#c7d2fe',
  DEPLOYMENT: '#e2e8f0', INFERENCE: '#bbf7d0', EVIDENCE: '#fecaca',
}

export default function EvidenceGraph({ graph, onEvidence }: { graph: G; onEvidence?: (id: string) => void }) {
  const rows: Record<number, number> = {}
  const nodes: Node[] = graph.nodes.map((n) => {
    const c = column[n.type] ?? 0
    const r = (rows[c] = (rows[c] ?? -1) + 1)
    const y = n.type === 'EVIDENCE' ? 260 + r * 20 : r * 90
    return {
      id: n.id,
      position: { x: c * 190, y },
      data: { label: <div><div className="text-[10px] uppercase text-muted">{n.type}</div><div className="font-mono text-xs">{n.id}</div>{n.label && <div className="text-[10px]">{n.label}</div>}</div> },
      style: { background: color[n.type] ?? '#fff', border: '1px solid #94a3b8', borderRadius: 6, width: 150, padding: 6 },
    }
  })
  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e${i}`, source: e.source, target: e.target, label: e.relation,
    labelStyle: { fontSize: 9 }, markerEnd: { type: MarkerType.ArrowClosed },
    style: e.relation === 'FLAGS' ? { stroke: '#dc2626', strokeDasharray: '4 3' } : undefined,
  }))
  return (
    <div className="h-96 rounded border border-line">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => { if (n.id.startsWith('EV-')) onEvidence?.(n.id) }}>
        <Background /><Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
