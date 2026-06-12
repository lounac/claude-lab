import type { CompanyKnowledge } from '../types'

// Speichert das aktuell aktive Firmenwissen im Browser (localStorage),
// damit Quiz- und Rollenspiel-Modus darauf zugreifen können.

const ACTIVE_COMPANY_KEY = 'trainer-app:activeCompany'

export function saveCompany(company: CompanyKnowledge): void {
  localStorage.setItem(ACTIVE_COMPANY_KEY, JSON.stringify(company))
}

export function loadCompany(): CompanyKnowledge | null {
  const raw = localStorage.getItem(ACTIVE_COMPANY_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompanyKnowledge
  } catch {
    return null
  }
}

export function clearCompany(): void {
  localStorage.removeItem(ACTIVE_COMPANY_KEY)
}
