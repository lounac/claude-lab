import type { CompanyKnowledge } from '../types'

// Speichert die zuletzt recherchierten Firmen im Browser (localStorage),
// damit Quiz- und Rollenspiel-Modus darauf zugreifen können – ohne erneute
// (kostenpflichtige) Recherche. Es werden bis zu 10 Firmen behalten.

const COMPANIES_KEY = 'trainer-app:companies'
const ACTIVE_KEY = 'trainer-app:activeUrl'
const LEGACY_KEY = 'trainer-app:activeCompany' // alte Einzel-Firma (Migration)
const MAX_COMPANIES = 10

function parseList(): CompanyKnowledge[] {
  const raw = localStorage.getItem(COMPANIES_KEY)
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? (data as CompanyKnowledge[]) : []
  } catch {
    return []
  }
}

function persistList(list: CompanyKnowledge[]): void {
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(list))
}

// Übernimmt eine evtl. vorhandene alte Einzel-Firma in die neue Liste.
function migrateLegacy(): void {
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy) return
  localStorage.removeItem(LEGACY_KEY)
  try {
    saveCompany(JSON.parse(legacy) as CompanyKnowledge)
  } catch {
    // ignorieren
  }
}

/** Alle gespeicherten Firmen (neueste zuerst). */
export function loadCompanies(): CompanyKnowledge[] {
  migrateLegacy()
  return parseList()
}

/** Fügt eine Firma hinzu (oder ersetzt eine mit gleicher URL) und macht sie aktiv. */
export function saveCompany(company: CompanyKnowledge): void {
  const others = parseList().filter((c) => c.url !== company.url)
  const list = [company, ...others].slice(0, MAX_COMPANIES)
  persistList(list)
  localStorage.setItem(ACTIVE_KEY, company.url)
}

/** Entfernt eine Firma und passt ggf. die aktive Auswahl an. */
export function removeCompany(url: string): void {
  const list = parseList().filter((c) => c.url !== url)
  persistList(list)
  if (localStorage.getItem(ACTIVE_KEY) === url) {
    if (list.length > 0) localStorage.setItem(ACTIVE_KEY, list[0].url)
    else localStorage.removeItem(ACTIVE_KEY)
  }
}

/** Legt fest, welche Firma aktiv ist. */
export function setActiveCompanyUrl(url: string): void {
  localStorage.setItem(ACTIVE_KEY, url)
}

/** Die aktuell ausgewählte Firma (oder die neueste, falls keine aktiv markiert ist). */
export function loadActiveCompany(): CompanyKnowledge | null {
  const list = loadCompanies()
  if (list.length === 0) return null
  const activeUrl = localStorage.getItem(ACTIVE_KEY)
  return list.find((c) => c.url === activeUrl) ?? list[0]
}
