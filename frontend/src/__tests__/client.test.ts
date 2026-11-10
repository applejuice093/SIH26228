import { describe, expect, it } from 'vitest'
import { api, apiErrorMessage, findingsQuery, normalizeBase } from '../api/client'
import { evidence, findings, incidents } from '../api/mockData'

describe('mock API contract', () => {
  it('filters findings by severity and contributor', async () => {
    const crit = await api.findings({ severity: 'CRITICAL' })
    expect(crit.every((f) => f.severity === 'CRITICAL')).toBe(true)
    const c17 = await api.findings({ contributor_id: 'C17' })
    expect(c17.map((f) => f.finding_id).sort()).toEqual(['FND-1', 'FND-2'])
  })

  it('every finding has reason, evidence, confidence, affected asset and disposition', () => {
    for (const f of findings) {
      expect(f.reason.length).toBeGreaterThan(0)
      expect(f.evidence_ids.length).toBeGreaterThan(0)
      expect(f.affected_asset_ids.length).toBeGreaterThan(0)
      expect(f.confidence).toBeGreaterThanOrEqual(0)
      expect(f.confidence).toBeLessThanOrEqual(1)
      expect(f.recommended_disposition).toBeTruthy()
    }
  })

  it('all referenced evidence ids exist', () => {
    const ids = new Set(evidence.map((e) => e.evidence_id))
    for (const f of findings) f.evidence_ids.forEach((e) => expect(ids.has(e)).toBe(true))
    for (const i of incidents) i.evidence_ids.forEach((e) => expect(ids.has(e)).toBe(true))
  })

  it('provenance verifier flags tampered and replayed records', async () => {
    expect((await api.verifyProvenance('x.json', ['KEY-01'])).overall).toBe('VALID')
    expect((await api.verifyProvenance('x-tamper.json', ['KEY-01'])).overall).toBe('TAMPERED')
    expect((await api.verifyProvenance('x-replay.json', ['KEY-01'])).replay_detected).toBe(true)
  })

  it('dispositions append a chained audit event and keep the chain valid', async () => {
    const before = (await api.auditEvents()).length
    const r = (await api.dispose('FND-1', 'QUARANTINE', 'test')) as { audit_event_id: string }
    const after = await api.auditEvents()
    expect(after.length).toBe(before + 1)
    expect(after[after.length - 1].event_id).toBe(r.audit_event_id)
    expect((await api.verifyAudit()).chain_valid).toBe(true)
  })

  it('objective hypotheses never assert intent', async () => {
    const hs = await api.objective('INC-001')
    expect(hs.length).toBeGreaterThan(0)
    hs.forEach((h) => { expect(h.intent_attribution).toBe('NOT_ESTABLISHED'); expect(h.alternatives.length).toBeGreaterThan(0) })
  })
})

describe('live-backend helpers', () => {
  it('normalizes VITE_API_BASE', () => {
    expect(normalizeBase(undefined)).toBeUndefined()
    expect(normalizeBase('   ')).toBeUndefined()
    expect(normalizeBase('http://localhost:8000/')).toBe('http://localhost:8000')
    expect(normalizeBase(' http://h:1// ')).toBe('http://h:1')
  })
})

describe('findingsQuery', () => {
  it('drops unset and empty filters', () => {
    expect(findingsQuery({})).toBe('')
    expect(findingsQuery({ severity: undefined, status: '' })).toBe('')
    expect(findingsQuery({ severity: 'HIGH', contributor_id: 'C 17' })).toBe('?severity=HIGH&contributor_id=C+17')
  })
})

describe('apiErrorMessage', () => {
  it('uses the backend error envelope when present', () => {
    const body = JSON.stringify({ error: { code: 'NOT_FOUND', message: 'incident INC-9 not found', recoverable: true } })
    expect(apiErrorMessage(404, body)).toBe('404 NOT_FOUND: incident INC-9 not found')
  })
  it('falls back to the raw body', () => {
    expect(apiErrorMessage(502, '<html>Bad gateway</html>')).toBe('502 <html>Bad gateway</html>')
    expect(apiErrorMessage(500, '')).toBe('500')
  })
})
