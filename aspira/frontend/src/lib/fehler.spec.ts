import { describe, it, expect } from 'vitest'
import { fehlerText, freundlicherFehler } from './fehler'

describe('fehlerText', () => {
  it('nimmt die Meldung eines echten Errors', () => {
    expect(fehlerText(new Error('kaputt'))).toBe('kaputt')
  })

  it('zeigt Supabase-Fehlerobjekte mit Meldung und Code statt "[object Object]"', () => {
    const supabaseFehler = {
      message: 'permission denied for table applications',
      code: '42501',
      details: null,
      hint: null,
    }
    expect(fehlerText(supabaseFehler)).toBe('permission denied for table applications (42501)')
  })

  it('kommt ohne Code aus', () => {
    expect(fehlerText({ message: 'JWT expired' })).toBe('JWT expired')
  })

  it('übernimmt Texte direkt', () => {
    expect(fehlerText('schon ein Text')).toBe('schon ein Text')
  })

  it('nutzt den Ersatztext bei allem anderen', () => {
    expect(fehlerText(undefined)).toBe('Unbekannter Fehler.')
    expect(fehlerText({ foo: 1 }, 'Speichern fehlgeschlagen.')).toBe('Speichern fehlgeschlagen.')
  })
})

describe('freundlicherFehler', () => {
  it('übersetzt Netzwerkfehler', () => {
    expect(freundlicherFehler('Failed to fetch')).toContain('Keine Internetverbindung')
  })

  it('lässt andere Meldungen stehen', () => {
    expect(freundlicherFehler('etwas anderes')).toBe('etwas anderes')
  })
})
