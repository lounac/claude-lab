import { describe, it, expect } from 'vitest'
import { istPasswortLink } from './passwortLink'

describe('istPasswortLink', () => {
  it('erkennt den Link aus der "Passwort vergessen"-Mail', () => {
    expect(istPasswortLink('#access_token=abc&expires_in=3600&type=recovery')).toBe(true)
  })

  it('funktioniert auch ohne führendes #', () => {
    expect(istPasswortLink('type=recovery&access_token=abc')).toBe(true)
  })

  it('ignoriert normale Adressen und andere Link-Typen', () => {
    expect(istPasswortLink('')).toBe(false)
    expect(istPasswortLink('#type=signup&access_token=abc')).toBe(false)
  })

  it('erkennt einen abgelaufenen Link nicht als gültig', () => {
    expect(istPasswortLink('#error=access_denied&error_code=otp_expired')).toBe(false)
  })
})
