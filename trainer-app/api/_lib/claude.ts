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
const RESEARCH_BUDGET_USD = 0.4
const FOLLOWUP_BUDGET_USD = 0.15
const MAX_RESEARCH_SEARCHES = 12
const MAX_FOLLOWUP_SEARCHES = 3

// Job-/Bewertungsportale, die bei der Web-Suche ausgeschlossen werden.
// (Token-intensiv; Stellen sollen ausschließlich von der eigenen Firmenseite kommen.)
const BLOCKED_DOMAINS = [
  'indeed.com',
  'de.indeed.com',
  'stepstone.de',
  'linkedin.com',
  'glassdoor.com',
  'glassdoor.de',
  'xing.com',
  'kununu.com',
  'monster.de',
  'get-in-it.de',
  'absolventa.de',
  'stellenanzeigen.de',
  'jobware.de',
]

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

// Web-Such-Tool: durchsucht mehrere Seiten (für allgemeine Infos & News),
// schließt aber Job-/Bewertungsportale aus und begrenzt die Anzahl der Suchen.
function broadSearchTool(maxUses: number): Anthropic.Messages.ToolUnion {
  return {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: maxUses,
    blocked_domains: BLOCKED_DOMAINS,
  }
}

// ---------------------------------------------------------------------------
// Chat (für Quiz- und Rollenspiel-Modus)
// ---------------------------------------------------------------------------

export interface ChatInput {
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
  model?: string
}

// Erlaubte Modelle für /api/chat (verhindert beliebige Modell-Strings vom Client).
const ALLOWED_CHAT_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'claude-opus-4-8',
])

export async function runChat(
  input: ChatInput,
): Promise<{ text: string; costUsd: number }> {
  const messages = input?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ApiError(400, 'Es wurden keine Nachrichten übergeben.')
  }

  const model =
    input.model && ALLOWED_CHAT_MODELS.has(input.model) ? input.model : MODEL

  const client = getClient()
  const response = await client.messages.create({
    model,
    max_tokens: input.maxTokens ?? 1500,
    system: input.system,
    messages,
  })

  // Kostenschätzung nutzt Sonnet-Preise (für Haiku leicht zu hoch = konservativ).
  return {
    text: extractText(response.content),
    costUsd: estimateCostUSD(response.usage),
  }
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

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen bei der Jobsuche und der Vorbereitung auf Vorstellungsgespräche unterstützt. Du erhältst die Website-URL und die offizielle Domain einer Firma. Recherchiere mit der Web-Suche und erstelle ein faktenbasiertes Briefing auf Deutsch.

Recherche-Regeln:
- ALLGEMEINE INFOS & NEWS: Nutze mehrere seriöse Quellen (Firmenseite, Nachrichtenseiten, Wikipedia o. Ä.). Nutze höchstens ca. 20 verschiedene Seiten.
- OFFENE STELLEN: ausschließlich von der offiziellen Firmen-Website (der angegebenen Domain). KEINE Stellen von anderen Seiten oder Job-Portalen.
- QUELLENANGABE: Gib bei jeder Information an, von welcher Seite sie stammt – als Markdown-Link in Klammern, z. B. ([Quelle](https://…)).

Gib AUSSCHLIESSLICH Markdown in genau dieser Struktur zurück (Abschnitte ohne Inhalt weglassen):

# <Firmenname>

## Überblick
Branche, Gründung, Größe, Umsatz, Standorte – mit Quellen-Links.

## Produkte & Dienstleistungen
Wichtigste Angebote – mit Quellen-Links.

## Abteilungen & Bereiche
Abteilungen/Teams (z. B. Entwicklung, Beratung, Data/AI, Vertrieb) – mit Quellen-Links.

## Aktuelle Projekte & Technologien
Projekte, Referenzen, Tech-Stack – mit Quellen-Links.

## News
Bis zu 10 aktuelle, interessante Meldungen über die Firma (neueste zuerst). Pro Eintrag Datum, kurze Beschreibung und Quellen-Link, Format:
- **JJJJ-MM:** Kurzbeschreibung ([Quelle](https://…))

## Offene Stellen & gesuchte Profile
NUR von der offiziellen Firmen-Website. Fokus auf Softwareentwicklung/IT: welche Rollen, in welchen Bereichen/Projekten, mit welchen Anforderungen? Verlinke die Karriere-Übersichtsseite (NICHT einzelne, bald ungültige Stellen-URLs).

## Für Bewerber:innen relevant
Arbeitsmodell (Remote/Hybrid/Büro), Benefits, Einstiegsmöglichkeiten (Praktikum/Werkstudent/Junior), Bewerbungsprozess.

## Werte & Kultur
Leitbild, Werte, Arbeitsweise – mit Quellen-Links.

## Mögliche Interview-Themen
3–6 Stichpunkte, die im Gespräch relevant sein könnten.

## Quellen
Gesamtliste der genutzten Seiten als Aufzählung mit Links.

Regeln:
- Nutze nur belegbare Informationen. Erfinde nichts – besonders keine Stellenausschreibungen.
- Stellen ausschließlich von der offiziellen Firmen-Domain. Wenn du dort keine findest, sage das offen und verweise auf die Karriere-Seite.
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
  const tools = [broadSearchTool(MAX_RESEARCH_SEARCHES)]
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Erstelle das Briefing für diese Firma.\nFirmen-Website: ${url}\nOffizielle Domain (offene Stellen AUSSCHLIESSLICH von dieser Domain): ${domain ?? url}`,
    },
  ]

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
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
      max_tokens: 4000,
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

Recherche sparsam: Nutze die Web-Suche nur wenn nötig und mit wenigen Quellen. Job-Portale sind ausgeschlossen. Geht es um offene Stellen, nutze ausschließlich die offizielle Firmen-Website. Oft reicht das unten bereitgestellte Briefing als Grundlage. Gib bei Web-Infos Quellen-Links an.

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
  const tools = [broadSearchTool(MAX_FOLLOWUP_SEARCHES)]
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
