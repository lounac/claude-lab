// Lokale Kopie der Bewerbungen im Browser (localStorage) – damit die Liste
// auch offline lesbar ist. Speichert nur den zuletzt geladenen Online-Stand.

import type { Application } from '../types/application'

const KEY = 'bt_applications_cache'

export function cacheLesen(): Application[] {
  try {
    const roh = localStorage.getItem(KEY)
    return roh ? (JSON.parse(roh) as Application[]) : []
  } catch {
    return [] // defekter/abgelehnter Speicher → einfach leer
  }
}

export function cacheSchreiben(liste: Application[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(liste))
  } catch {
    // Speicher voll oder blockiert → ignorieren (nicht kritisch)
  }
}

export function cacheLeeren() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorieren
  }
}
