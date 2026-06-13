import Anthropic from '@anthropic-ai/sdk'

// Gemeinsame Backend-Logik für lokalen Dev-Server UND Vercel.
// Dateien/Ordner in /api, die mit "_" beginnen, werden von Vercel NICHT
// als eigener Endpunkt behandelt – ideal für geteilten Code.

// Verwendetes Modell.
const MODEL = 'claude-sonnet-4-6'

/** Fehler mit HTTP-Statuscode, damit der Aufrufer den richtigen Code senden kann. */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ApiError(
      500,
      'ANTHROPIC_API_KEY ist nicht gesetzt. Bitte lokal in .env.local bzw. in den Vercel-Einstellungen hinterlegen.',
    )
  }
  return new Anthropic({ apiKey })
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

// --- Kosten-Schätzung & Begrenzung -----------------------------------------
// Preise pro Token (USD) für claude-sonnet-4-6 bzw. pro Web-Suche.
const PRICE_IN = 3 / 1_000_000
const PRICE_OUT = 15 / 1_000_000
const PRICE_CACHE_READ = 0.3 / 1_000_000
const PRICE_CACHE_WRITE = 3.75 / 1_000_000
const PRICE_PER_SEARCH = 0.01

// Obergrenzen pro Anfrage – wird sie überschritten, wird abgebrochen.
const RESEARCH_BUDGET_USD = 0.3
const FOLLOWUP_BUDGET_USD = 0.15
const MAX_RESEARCH_SEARCHES = 5
const MAX_FOLLOWUP_SEARCHES = 3

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateCostUSD(usage: any): number {
  if (!usage) return 0
  const searches = usage.server_tool_use?.web_search_requests ?? 0
  return (
    (usage.input_tokens ?? 0) * PRICE_IN +
    (usage.output_tokens ?? 0) * PRICE_OUT +
    (usage.cache_read_input_tokens ?? 0) * PRICE_CACHE_READ +
    (usage.cache_creation_input_tokens ?? 0) * PRICE_CACHE_WRITE +
    searches * PRICE_PER_SEARCH
  )
}

// Domain (ohne www.) – für die Begrenzung der Web-Suche auf die eigene Seite.
function domainFromUrl(u: string): string | undefined {
  try {
    const host = new URL(u).hostname.replace(/^www\./i, '')
    return host || undefined
  } catch {
    return undefined
  }
}

// Web-Such-Tool, begrenzt auf die eigene Firmen-Domain und auf maxUses Suchen.
function ownSiteSearchTool(
  domain: string | undefined,
  maxUses: number,
): Anthropic.Messages.ToolUnion {
  return domain
    ? {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: maxUses,
        allowed_domains: [domain],
      }
    : { type: 'web_search_20260209', name: 'web_search', max_uses: maxUses }
}

// ---------------------------------------------------------------------------
// Chat (für Quiz- und Rollenspiel-Modus)
// ---------------------------------------------------------------------------

export interface ChatInput {
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
}

export async function runChat(input: ChatInput): Promise<{ text: string }> {
  const messages = input?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError(400, 'Es wurden keine Nachrichten übergeben.')
  }

  const client = getClient()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: input.maxTokens ?? 1500,
    system: input.system,
    messages,
  })

  return { text: extractText(response.content) }
}

// ---------------------------------------------------------------------------
// Recherche (für Firmenwissen-Modus) – Web-Suche, begrenzt auf die Firmenseite
// ---------------------------------------------------------------------------

export interface ResearchInput {
  url: string
}

export interface ResearchResult {
  name: string
  summary: string
  url: string
  fetchedAt: string
  /** Geschätzte Kosten dieser Recherche in USD. */
  costUsd: number
  /** true, wenn aus Kostengründen vorzeitig abgebrochen wurde. */
  truncated: boolean
}

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen bei der Jobsuche und der Vorbereitung auf Vorstellungsgespräche unterstützt. Du erhältst die Website-URL einer Firma.

WICHTIG – Kosten sparen: Recherchiere AUSSCHLIESSLICH auf der offiziellen Website der Firma (inkl. deren eigener Karriere-/Job-Seite, z. B. /karriere, /jobs, /stellenangebote). Nutze KEINE externen Job-Portale (Indeed, StepStone, LinkedIn, Glassdoor o. ä.) und keine sonstigen fremden Seiten. Mache nur wenige, gezielte Suchen.

Erstelle ein faktenbasiertes Briefing auf Deutsch. Gib AUSSCHLIESSLICH Markdown in genau dieser Struktur zurück (Abschnitte ohne Inhalt weglassen):

# <Firmenname>

## Überblick
Was macht die Firma? Branche, Gründung, Größe, Umsatz, Standorte.

## Produkte & Dienstleistungen
Wichtigste Angebote und Leistungen.

## Abteilungen & Bereiche
Welche Abteilungen, Fachbereiche oder Teams gibt es (z. B. Entwicklung, Beratung, Design, Data/AI, Vertrieb)?

## Aktuelle Projekte & Technologien
Aktuelle (Software-)Projekte und Referenzen sowie eingesetzte Technologien/Tools (Tech-Stack).

## Offene Stellen & gesuchte Profile
Welche Stellen sind laut der firmeneigenen Karriere-Seite ausgeschrieben? Fokus auf Softwareentwicklung/IT: welche Rollen, in welchen Bereichen/Projekten, mit welchen Anforderungen?

## Für Bewerber:innen relevant
Arbeitsmodell (Remote/Hybrid/Büro), Benefits, Einstiegsmöglichkeiten (Praktikum/Werkstudent/Junior), Bewerbungsprozess, Standorte.

## Werte & Kultur
Leitbild, Werte, Arbeitsweise.

## Mögliche Interview-Themen
3–6 Stichpunkte, die im Gespräch relevant sein könnten.

## Quellen
Wenige Quellen-Links von der Firmenseite.

Regeln:
- Nutze nur Informationen von der offiziellen Firmenwebsite. Erfinde nichts – besonders keine erfundenen Stellenausschreibungen.
- Verlinke bei offenen Stellen die allgemeine Karriere-/Job-Übersichtsseite (z. B. firma.de/karriere) – NICHT einzelne Stellen-URLs, da diese oft schnell ungültig werden (tote Links).
- Wenn du keine offenen Stellen findest, sage das offen und verweise auf die Karriere-Seite.
- Gib KEINE Vorrede aus. Die allererste Zeile MUSS die Überschrift mit dem reinen Firmennamen sein: "# Firmenname".`

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const raw = input?.url?.trim()
  if (!raw) {
    throw new ApiError(400, 'Bitte gib eine Firmen-URL an.')
  }
  // "www.jambit.com" oder "jambit.com" um https:// ergänzen
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const domain = domainFromUrl(url)

  const client = getClient()
  const tools = [ownSiteSearchTool(domain, MAX_RESEARCH_SEARCHES)]
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Recherchiere diese Firma ausschließlich auf ihrer eigenen Website und erstelle das Briefing. Firmen-Website: ${url}`,
    },
  ]

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: RESEARCH_SYSTEM,
    tools,
    messages,
  })
  let costUsd = estimateCostUSD(response.usage)

  // Server-seitige Tool-Schleife kann pausieren ("pause_turn") – fortsetzen,
  // aber nur bis zur Kosten-Obergrenze und mit wenigen Runden.
  let guard = 0
  let truncated = false
  while (response.stop_reason === 'pause_turn' && guard < 3) {
    if (costUsd >= RESEARCH_BUDGET_USD) {
      truncated = true
      break
    }
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: RESEARCH_SYSTEM,
      tools,
      messages,
    })
    costUsd += estimateCostUSD(response.usage)
    guard++
  }

  const fullText = extractText(response.content)
  // Falls Claude doch eine Vorrede ausgibt: alles vor der ersten Überschrift entfernen.
  const headingIndex = fullText.search(/^#\s+/m)
  const summary =
    headingIndex >= 0 ? fullText.slice(headingIndex).trim() : fullText
  if (!summary) {
    throw new ApiError(
      502,
      'Die Recherche lieferte kein Ergebnis. Bitte prüfe die URL und versuche es erneut.',
    )
  }

  const headingMatch = summary.match(/^#\s+(.+)$/m)
  const name = headingMatch ? headingMatch[1].trim() : url

  return {
    name,
    summary,
    url,
    fetchedAt: new Date().toISOString(),
    costUsd,
    truncated,
  }
}

// ---------------------------------------------------------------------------
// Nachfrage zu einer bereits recherchierten Firma (Firmenwissen-Modus)
// ---------------------------------------------------------------------------

export interface FollowupInput {
  question: string
  name?: string
  url?: string
  summary?: string
}

const FOLLOWUP_SYSTEM = `Du beantwortest eine konkrete Frage zu einer Firma – für eine Person, die sich dort bewirbt.

WICHTIG – Kosten sparen: Wenn du die Web-Suche nutzt, suche AUSSCHLIESSLICH auf der offiziellen Website der Firma. Nutze KEINE externen Job-Portale. Mache nur wenige, gezielte Suchen. Oft reicht das unten bereitgestellte Briefing als Grundlage.

Antworte knapp, sachlich und faktenbasiert auf Deutsch in Markdown.

Wichtig:
- Verwende KEINE eigene Hauptüberschrift (die Antwort wird in ein bestehendes Dokument eingefügt).
- Wenn du etwas nicht sicher findest, sage das ehrlich. Erfinde nichts.`

export async function runFollowup(
  input: FollowupInput,
): Promise<{ answer: string; costUsd: number }> {
  const question = input?.question?.trim()
  if (!question) {
    throw new ApiError(400, 'Bitte gib eine Frage ein.')
  }

  const client = getClient()
  const domain = input.url ? domainFromUrl(input.url) : undefined
  const tools = [ownSiteSearchTool(domain, MAX_FOLLOWUP_SEARCHES)]
  const context = input.summary
    ? `\n\nZum Kontext – das bisherige Briefing zur Firma:\n\n${input.summary}`
    : ''
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Beantworte folgende Frage zur Firma ${input.name ?? ''} (${input.url ?? ''}):\n\n"${question}"${context}`,
    },
  ]

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: FOLLOWUP_SYSTEM,
    tools,
    messages,
  })
  let costUsd = estimateCostUSD(response.usage)

  let guard = 0
  while (response.stop_reason === 'pause_turn' && guard < 2) {
    if (costUsd >= FOLLOWUP_BUDGET_USD) break
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: FOLLOWUP_SYSTEM,
      tools,
      messages,
    })
    costUsd += estimateCostUSD(response.usage)
    guard++
  }

  const answer = extractText(response.content)
  if (!answer) {
    throw new ApiError(
      502,
      'Es konnte keine Antwort ermittelt werden. Bitte formuliere die Frage anders.',
    )
  }

  return { answer, costUsd }
}
