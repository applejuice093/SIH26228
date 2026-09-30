import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { ProvenanceResult } from '../api/types'
import { PageHeader, StateBadge } from '../components/ui'

const checks: [keyof ProvenanceResult, string, boolean][] = [
  ['signature_valid', 'Signature valid (Ed25519, trusted key)', true],
  ['input_hash_valid', 'Input image digest matches', true],
  ['model_hash_valid', 'Model weight digest matches', true],
  ['output_hash_valid', 'Output digest matches', true],
  ['replay_detected', 'Replay detected (nonce / sequence reuse)', false],
]
const samples = ['records/sector7/INF-2201-0001.json', 'records/sector7/INF-2201-0419-tamper.json', 'records/sector7/INF-2201-0877-replay.json', 'records/vendor/INF-9000-badsig.json']

export default function Provenance() {
  const [path, setPath] = useState(samples[0])
  const [keys, setKeys] = useState('KEY-01')
  const m = useMutation({ mutationFn: () => api.verifyProvenance(path, keys.split(',').map((k) => k.trim()).filter(Boolean)) })
  const r = m.data
  return (
    <div>
      <PageHeader title="Provenance verifier" sub="Checks that image, model digest, preprocessing, inference config and output are bound by a valid signature and not replayed." />
      <div className="card space-y-3 text-sm">
        <label className="block">Inference record path
          <input className="mt-1 w-full rounded border px-2 py-1 font-mono" value={path} onChange={(e) => setPath(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 text-xs">Samples: {samples.map((s) => <button key={s} className="rounded bg-slate-100 px-1.5 font-mono hover:bg-slate-200" onClick={() => setPath(s)}>{s.split('/').pop()}</button>)}</div>
        <label className="block">Expected key IDs (comma separated)
          <input className="mt-1 w-full rounded border px-2 py-1 font-mono" value={keys} onChange={(e) => setKeys(e.target.value)} />
        </label>
        <button className="btn border-slate-800 bg-slate-900 text-white" onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? 'Verifying…' : 'Verify record'}</button>
      </div>
      {r && (
        <div className="card mt-4">
          <div className="mb-3 flex items-center gap-2"><span className="card-title mb-0">Overall</span><StateBadge s={r.overall} /></div>
          <table className="table-base"><tbody>
            {checks.map(([k, label, good]) => {
              const ok = (r[k] as boolean) === good
              return <tr key={k}><td>{label}</td><td className={ok ? 'text-emerald-700' : 'font-semibold text-red-700'}>{ok ? 'PASS' : 'FAIL'}</td></tr>
            })}
          </tbody></table>
        </div>
      )}
    </div>
  )
}
