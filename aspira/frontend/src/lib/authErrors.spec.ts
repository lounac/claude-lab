import { describe, it, expect } from 'vitest'
import { uebersetzeAuthFehler } from './authErrors'

describe('uebersetzeAuthFehler', () => {
  it('übersetzt falsche Zugangsdaten', () => {
    expect(uebersetzeAuthFehler('Invalid login credentials')).toBe(
      'E-Mail oder Passwort ist falsch.',
    )
  })

  it('erkennt eine bereits registrierte E-Mail', () => {
    expect(uebersetzeAuthFehler('User already registered')).toContain('bereits registriert')
  })

  it('erkennt ein zu kurzes Passwort', () => {
    expect(uebersetzeAuthFehler('Password should be at least 6 characters')).toContain(
      'mindestens 6',
    )
  })

  it('ist unabhängig von Groß-/Kleinschreibung', () => {
    expect(uebersetzeAuthFehler('INVALID LOGIN CREDENTIALS')).toBe(
      'E-Mail oder Passwort ist falsch.',
    )
  })

  it('gibt unbekannte Fehler unverändert zurück', () => {
    expect(uebersetzeAuthFehler('Some weird error')).toBe('Some weird error')
  })
})
