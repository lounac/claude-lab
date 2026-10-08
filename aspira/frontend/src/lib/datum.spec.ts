import { describe, it, expect } from 'vitest'
import { tageHer, datumMitAbstand } from './datum'

const heute = new Date(2026, 9, 8, 15, 30) // 8. Oktober 2026, nachmittags

describe('tageHer', () => {
  it('zählt Kalendertage bei einem reinen Datum', () => {
    expect(tageHer('2026-09-24', heute)).toBe(14)
    expect(tageHer('2026-10-08', heute)).toBe(0)
  })

  it('zählt bei Zeitstempeln nach Kalendertag, nicht nach 24 Stunden', () => {
    // gestern spät abends ist "vor 1 Tag", auch wenn es weniger als 24 h her ist
    expect(tageHer(new Date(2026, 9, 7, 23, 50).toISOString(), heute)).toBe(1)
    expect(tageHer(new Date(2026, 9, 8, 0, 5).toISOString(), heute)).toBe(0)
  })

  it('rechnet über die Zeitumstellung hinweg richtig', () => {
    expect(tageHer('2026-10-20', new Date(2026, 9, 30))).toBe(10)
  })
})

describe('datumMitAbstand', () => {
  it('hängt die Tageszahl in Klammern an', () => {
    expect(datumMitAbstand('2026-09-24', heute)).toBe('24.09.2026 (vor 14 Tagen)')
  })

  it('kennt heute, Einzahl und Zukunft', () => {
    expect(datumMitAbstand('2026-10-08', heute)).toBe('08.10.2026 (heute)')
    expect(datumMitAbstand('2026-10-07', heute)).toBe('07.10.2026 (vor 1 Tag)')
    expect(datumMitAbstand('2026-10-10', heute)).toBe('10.10.2026 (in 2 Tagen)')
  })

  it('gibt bei leerem Wert einen leeren Text zurück', () => {
    expect(datumMitAbstand(null, heute)).toBe('')
  })
})
