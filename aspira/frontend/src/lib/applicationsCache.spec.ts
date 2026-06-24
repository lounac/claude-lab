import { describe, it, expect, beforeEach } from 'vitest'
import { cacheLesen, cacheSchreiben, cacheLeeren } from './applicationsCache'
import type { Application } from '../types/application'

const beispiel = [{ id: '1', company_name: 'MULTIVAC' }] as unknown as Application[]

describe('applicationsCache', () => {
  beforeEach(() => localStorage.clear())

  it('liefert eine leere Liste, wenn nichts gespeichert ist', () => {
    expect(cacheLesen()).toEqual([])
  })

  it('schreibt eine Liste und liest sie wieder aus', () => {
    cacheSchreiben(beispiel)
    expect(cacheLesen()).toEqual(beispiel)
  })

  it('leeren entfernt die gespeicherte Kopie', () => {
    cacheSchreiben(beispiel)
    cacheLeeren()
    expect(cacheLesen()).toEqual([])
  })

  it('liefert eine leere Liste bei defektem Speicher-Inhalt', () => {
    localStorage.setItem('bt_applications_cache', 'kein-json{')
    expect(cacheLesen()).toEqual([])
  })
})
