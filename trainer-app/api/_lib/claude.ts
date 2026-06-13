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
const RESEARCH_BUDGET_USD = 0.5
// Recherche bleibt auf der eigenen Firmen-Domain (günstig + fokussiert);
// dafür etwas mehr Suchen für Tiefe (mehrere Unterseiten).
const MAX_RESEARCH_SEARCHES = 8

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

// Web-Such-Tool, begrenzt auf die eigene Firmen-Domain (+ Anzahl der Suchen).
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

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen hilft, eine Firma für ihre Bewerbung und ihr Vorstellungsgespräch wirklich zu verstehen. Du erhältst die Website-URL und die offizielle Domain einer Firma.

Recherche-Vorgehen:
- Recherchiere AUSSCHLIESSLICH auf der offiziellen Firmen-Website (der angegebenen Domain). KEINE externen Seiten.
- Geh dabei in die TIEFE: sieh dir die wichtigen Unterseiten an (z. B. Über uns, Produkte/Leistungen, Karriere/Jobs, Kultur/Werte, News/Presse/Blog) und fasse das Wesentliche fundiert zusammen – das Ziel ist, die Firma wirklich zu verstehen.
- News: nutze, falls vorhanden, die News-/Presse-/Blog-Seite der Firma; nur Meldungen aus den letzten 6 Monaten.
- QUELLENANGABE: Verlinke bei wichtigen Informationen die jeweilige Unterseite, z. B. ([Quelle](https://…)).

Gib AUSSCHLIESSLICH Markdown in genau dieser Struktur zurück (Abschnitte ohne Inhalt weglassen):

# <Firmenname>

## Überblick
Branche, Gründung, Größe, Umsatz, Standorte.

## Produkte & Dienstleistungen
Wichtigste Angebote – mit etwas Detail.

## Abteilungen & Bereiche
Abteilungen/Teams (z. B. Entwicklung, Beratung, Data/AI, Vertrieb).

## Aktuelle Projekte & Technologien
Projekte, Referenzen, Tech-Stack.

## Kultur, Philosophie & Strategie
Unternehmenskultur, Leitbild/Philosophie und strategische Ausrichtung/Ziele – fundiert, damit man die Firma wirklich versteht.

## Benefits & Arbeitsmodell
Arbeitsmodell (Remote/Hybrid/Büro), Benefits, Einstiegsmöglichkeiten (Praktikum/Werkstudent/Junior), Bewerbungsprozess.

## News
Meldungen der Firma aus den LETZTEN 6 MONATEN (neueste zuerst, höchstens 10). Pro Eintrag Format:
- **JJJJ-MM:** Kurzbeschreibung ([Quelle](https://…))

## Offene Stellen & gesuchte Profile
Von der Karriere-Seite der Firma. Fokus auf Softwareentwicklung/IT: welche Rollen, in welchen Bereichen/Projekten, mit welchen Anforderungen? Verlinke die Karriere-Übersichtsseite (NICHT einzelne, bald ungültige Stellen-URLs).

## Mögliche Interview-Themen
3–6 Stichpunkte, die im Gespräch relevant sein könnten.

## Quellen
Liste der genutzten (Unter-)Seiten als Aufzählung mit Links.

Regeln:
- Nutze nur Informationen von der offiziellen Firmen-Website. Erfinde nichts.
- Wenn du etwas nicht findest, sage das offen.
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
      content: `Recherchiere diese Firma gründlich auf ihrer eigenen Website (mehrere relevante Unterseiten) und erstelle das Briefing.\nFirmen-Website: ${url}\nOffizielle Domain: ${domain ?? url}`,
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

// Nachfrage OHNE Web-Suche: beantwortet nur anhand des vorhandenen Briefings
// (kostet dadurch nur ~1–2 Cent) und ordnet die Antwort dem passenden Abschnitt zu.
const FOLLOWUP_SYSTEM = `Du beantwortest eine Frage zu einer Firma – für eine Person, die sich dort bewirbt – AUSSCHLIESSLICH anhand des bereitgestellten Firmen-Briefings. Es wird KEINE neue Web-Recherche durchgeführt (um Kosten zu sparen).

Ordne die Antwort dem thematisch am besten passenden Abschnitt des Briefings zu (nutze exakt eine der vorhandenen "##"-Überschriften, z. B. "Benefits & Arbeitsmodell", "Offene Stellen & gesuchte Profile", "Kultur, Philosophie & Strategie", "Überblick"). Passt keiner, wähle einen kurzen, treffenden neuen Abschnittstitel.

Antworte AUSSCHLIESSLICH mit JSON (KEIN Markdown-Codeblock, kein Text drumherum) in genau diesem Format:
{"section": "<Abschnittstitel ohne ##>", "answer": "<knappe Antwort in Markdown, ohne eigene Überschrift>"}

Wenn die Antwort nicht aus dem Briefing hervorgeht, setze "answer" auf einen kurzen Hinweis, dass diese Information im aktuellen Briefing nicht enthalten ist. Erfinde nichts.`

export async function runFollowup(
  input: FollowupInput,
): Promise<{ section: string; answer: string; costUsd: number }> {
  const question = input?.question?.trim()
  if (!question) {
    throw new ApiError(400, 'Bitte gib eine Frage ein.')
  }

  const client = getClient()
  const context = input.summary
    ? `\n\nFirmen-Briefing:\n\n${input.summary}`
    : ''
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Frage zur Firma ${input.name ?? ''}:\n\n"${question}"${context}`,
    },
  ]

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: FOLLOWUP_SYSTEM,
    messages,
  })

  const raw = extractText(response.content)
  if (!raw) {
    throw new ApiError(
      502,
      'Es konnte keine Antwort ermittelt werden. Bitte formuliere die Frage anders.',
    )
  }

  // JSON {section, answer} parsen (mit Fallback auf reinen Text).
  let section = 'Weitere Informationen'
  let answer = raw
  try {
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned
        .replace(/^```[a-z]*\s*/i, '')
        .replace(/```$/, '')
        .trim()
    }
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed.answer === 'string') {
      answer = parsed.answer
      if (typeof parsed.section === 'string' && parsed.section.trim()) {
        section = parsed.section.trim()
      }
    }
  } catch {
    // Fallback: kein gültiges JSON → ganzer Text als Antwort
  }

  return { section, answer, costUsd: estimateCostUSD(response.usage) }
}
