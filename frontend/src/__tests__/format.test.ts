import { describe, expect, it } from 'vitest'
import { fmtBytes, pct, shortHash } from '../lib/format'
import { human } from '../lib/labels'

describe('format helpers', () => {
  it('shortHash keeps exactly one sha256: prefix', () => {
    expect(shortHash('abcdef0123456789')).toBe('sha256:abcdef012345…')
    expect(shortHash('sha256:abcdef0123456789')).toBe('sha256:abcdef012345…')
  })

  it('fmtBytes scales units and guards bad input', () => {
    expect(fmtBytes(0)).toBe('0 B')
    expect(fmtBytes(1536)).toBe('1.5 KB')
    expect(fmtBytes(5 * 1024 ** 3)).toBe('5.0 GB')
    expect(fmtBytes(NaN)).toBe('—')
    expect(fmtBytes(-1)).toBe('—')
  })

  it('pct rounds to whole percent', () => {
    expect(pct(0.256)).toBe('26%')
  })
})

describe('human labels', () => {
  it('uses special-cased labels and falls back to sentence case', () => {
    expect(human('HUMAN_DISPOSITION')).toBe('Awaiting analyst')
    expect(human('PATH_NOT_ALLOWED')).toBe('Path not allowed')
  })
})
