# CV-TRUST Analyst Console (frontend)

React + TypeScript + Vite + Tailwind console implementing `docs/11_FRONTEND.md`.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # contract tests on the mock API
npm run build && npm run check:offline
```

## Data source

By default the console runs on a deterministic in-browser mock (`src/api/mockData.ts`), which is **example data only**. Set `VITE_API_BASE=http://localhost:8000` to point it at the backend's `/api/v1` once that exists (see `docs/17_API_CONTRACT.md`).

## Pages

| Route | Purpose |
|---|---|
| `/dashboard` | assessments, high/critical findings, contributor risk, model status, drift, incidents, audit health |
| `/assets` | asset registry with digests and trust status |
| `/assessments` | async assessment monitor |
| `/findings` | filterable findings with evidence drawer |
| `/incidents/:id` | attack graph, timeline, objective hypotheses, blast radius, disposition, coverage |
| `/models/:id`, `/datasets/:id` | asset detail |
| `/provenance` | inference-record verifier |
| `/audit` | hash-chained audit ledger and verification |
| `/reports/:id` | printable analyst report |
| `/settings/capabilities` | declared capabilities and limits |

## Known limitations

- No backend yet; dispositions and audit events live in memory for the session.
- The graph layout is a fixed column layout by node type.
