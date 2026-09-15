import { describe, it, expect } from 'vitest'
import { analyseAktiv } from './analyse'

describe('analyseAktiv', () => {
  it('ist aus, wenn die Variable fehlt oder leer ist', () => {
    expect(analyseAktiv(undefined)).toBe(false)
    expect(analyseAktiv('')).toBe(false)
  })

  it('ist aus bei allem außer "true"', () => {
    expect(analyseAktiv('false')).toBe(false)
    expect(analyseAktiv('1')).toBe(false)
    expect(analyseAktiv('ja')).toBe(false)
  })

  it('ist an bei "true" (unabhängig von Groß-/Kleinschreibung und Leerzeichen)', () => {
    expect(analyseAktiv('true')).toBe(true)
    expect(analyseAktiv(' TRUE ')).toBe(true)
  })
})
