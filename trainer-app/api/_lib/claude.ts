import Anthropic from '@anthropic-ai/sdk'

// Gemeinsame Backend-Logik für lokalen Dev-Server UND Vercel.
// Dateien/Ordner in /api, die mit "_" beginnen, werden von Vercel NICHT
// als eigener Endpunkt behandelt – ideal für geteilten Code.

// Verwendetes Modell (spiegelt src/lib/models.ts).
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
// Recherche (für Firmenwissen-Modus) – nutzt die Web-Suche von Claude
// ---------------------------------------------------------------------------

export interface ResearchInput {
  url: string
}

export interface ResearchResult {
  name: string
  summary: string
  url: string
  fetchedAt: string
}

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen auf Vorstellungsgespräche vorbereitet. Du erhältst die Website-URL einer Firma. Recherchiere die Firma mit der Web-Suche und erstelle ein kompaktes, faktenbasiertes Briefing auf Deutsch.

Gib AUSSCHLIESSLICH Markdown in genau dieser Struktur zurück:

# <Firmenname>

## Überblick
Was macht die Firma? Branche, Tätigkeit, ggf. Größe/Standort.

## Produkte & Dienstleistungen
Wichtigste Angebote.

## Werte & Kultur
Leitbild, Werte, Arbeitsweise – soweit auffindbar.

## Aktuelles
Relevante Neuigkeiten/Entwicklungen, falls vorhanden – sonst diesen Abschnitt weglassen.

## Mögliche Interview-Themen
3–5 Stichpunkte, die im Gespräch relevant sein könnten.

## Quellen
Liste der genutzten Webseiten als Aufzählung.

Regeln:
- Nutze nur Informationen aus den Suchergebnissen. Erfinde nichts.
- Wenn du etwas nicht findest, schreibe kurz, dass dazu keine verlässlichen Infos gefunden wurden.
- Die allererste Zeile MUSS die Überschrift mit dem reinen Firmennamen sein: "# Firmenname".`

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const url = input?.url?.trim()
  if (!url) {
    throw new ApiError(400, 'Bitte gib eine Firmen-URL an.')
  }

  const client = getClient()
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Recherchiere diese Firma und erstelle das Briefing. Firmen-Website: ${url}`,
    },
  ]

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: RESEARCH_SYSTEM,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages,
  })

  // Server-seitige Tool-Schleife kann pausieren ("pause_turn") – dann fortsetzen.
  let guard = 0
  while (response.stop_reason === 'pause_turn' && guard < 6) {
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: RESEARCH_SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages,
    })
    guard++
  }

  const summary = extractText(response.content)
  if (!summary) {
    throw new ApiError(
      502,
      'Die Recherche lieferte kein Ergebnis. Bitte prüfe die URL und versuche es erneut.',
    )
  }

  const headingMatch = summary.match(/^#\s+(.+)$/m)
  const name = headingMatch ? headingMatch[1].trim() : url

  return { name, summary, url, fetchedAt: new Date().toISOString() }
}
