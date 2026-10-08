import { describe, it, expect } from 'vitest'
import { sortiert } from './sortierung'
import type { Application } from '../types/application'

function stelle(id: string, teil: Partial<Application>): Application {
  return {
    id,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    application_date: null,
    ...teil,
  } as Application
}

const ids = (liste: Application[]) => liste.map((a) => a.id)

describe('sortiert', () => {
  it('sortiert nach Erstellungsdatum, neueste zuerst', () => {
    const liste = [
      stelle('alt', { created_at: '2026-08-01T10:00:00Z' }),
      stelle('neu', { created_at: '2026-10-01T10:00:00Z' }),
    ]
    expect(ids(sortiert(liste, 'created_at'))).toEqual(['neu', 'alt'])
  })

  it('sortiert nach "zuletzt geändert"', () => {
    const liste = [
      stelle('a', { updated_at: '2026-09-05T10:00:00Z' }),
      stelle('b', { updated_at: '2026-10-07T10:00:00Z' }),
    ]
    expect(ids(sortiert(liste, 'updated_at'))).toEqual(['b', 'a'])
  })

  it('stellt Einträge ohne Bewerbungsdatum ans Ende', () => {
    const liste = [
      stelle('ohne', {}),
      stelle('frueh', { application_date: '2026-09-10' }),
      stelle('spaet', { application_date: '2026-09-24' }),
    ]
    expect(ids(sortiert(liste, 'application_date'))).toEqual(['spaet', 'frueh', 'ohne'])
  })

  it('verändert die ursprüngliche Liste nicht', () => {
    const liste = [
      stelle('alt', { created_at: '2026-08-01T10:00:00Z' }),
      stelle('neu', { created_at: '2026-10-01T10:00:00Z' }),
    ]
    sortiert(liste, 'created_at')
    expect(ids(liste)).toEqual(['alt', 'neu'])
  })
})
