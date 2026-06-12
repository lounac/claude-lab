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

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen bei der Jobsuche und der Vorbereitung auf Vorstellungsgespräche unterstützt. Du erhältst die Website-URL einer Firma. Recherchiere die Firma gründlich mit der Web-Suche – nutze ausdrücklich auch die Karriere-/Job-Seite der Firma (z. B. /karriere, /jobs, /stellenangebote) sowie Job-Portale (LinkedIn, StepStone, Indeed, Glassdoor) – und erstelle ein ausführliches, faktenbasiertes Briefing auf Deutsch.

Gib AUSSCHLIESSLICH Markdown in genau dieser Struktur zurück (Abschnitte ohne Inhalt weglassen):

# <Firmenname>

## Überblick
Was macht die Firma? Branche, Gründung, Größe, Umsatz, Standorte.

## Produkte & Dienstleistungen
Wichtigste Angebote und Leistungen.

## Abteilungen & Bereiche
Welche Abteilungen, Fachbereiche oder Teams gibt es (z. B. Entwicklung, Beratung, Design, Data/AI, Vertrieb, HR …)?

## Aktuelle Projekte & Technologien
Aktuelle (Software-)Projekte, Kundenprojekte und Referenzen. Welche Technologien, Programmiersprachen und Tools setzt die Firma ein (Tech-Stack)?

## Offene Stellen & gesuchte Profile
Welche Stellen sind aktuell ausgeschrieben? Liste konkrete Jobtitel auf – mit besonderem Fokus auf Softwareentwicklung/IT. In welchen Bereichen oder Projekten werden Entwickler:innen gesucht? Welche Anforderungen/Technologien werden genannt? Wenn möglich, mit Link zur Stellenanzeige.

## Für Bewerber:innen relevant
Arbeitsmodell (Remote/Hybrid/Büro), Benefits, Einstiegsmöglichkeiten (Praktikum/Werkstudent/Junior), Bewerbungsprozess und an welchen Standorten gesucht wird – alles, was für eine bewerbende Person nützlich ist.

## Werte & Kultur
Leitbild, Werte, Arbeitsweise.

## Mögliche Interview-Themen
3–6 Stichpunkte, die im Gespräch relevant sein könnten.

## Quellen
Liste der genutzten Webseiten als Aufzählung (inkl. Karriere-/Job-Seiten).

Regeln:
- Nutze nur Informationen aus den Suchergebnissen. Erfinde nichts – besonders keine erfundenen Stellenausschreibungen.
- Stellenangebote ändern sich häufig: Wenn du keine aktuellen Stellen findest, sage das offen und verweise auf die Karriere-Seite.
- Gib KEINE Vorrede und keine Erklärung deines Vorgehens aus.
- Die allererste Zeile MUSS die Überschrift mit dem reinen Firmennamen sein: "# Firmenname".`

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const raw = input?.url?.trim()
  if (!raw) {
    throw new ApiError(400, 'Bitte gib eine Firmen-URL an.')
  }
  // "www.jambit.com" oder "jambit.com" um https:// ergänzen
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  const client = getClient()
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Recherchiere diese Firma und erstelle das Briefing. Firmen-Website: ${url}`,
    },
  ]

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
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
      max_tokens: 4000,
      system: RESEARCH_SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages,
    })
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

  return { name, summary, url, fetchedAt: new Date().toISOString() }
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

const FOLLOWUP_SYSTEM = `Du beantwortest eine konkrete Frage zu einer Firma – für eine Person, die sich dort bewirbt. Nutze die Web-Suche, wenn die Antwort dadurch genauer oder aktueller wird. Antworte knapp, sachlich und faktenbasiert auf Deutsch in Markdown.

Wichtig:
- Verwende KEINE eigene Hauptüberschrift (die Antwort wird in ein bestehendes Dokument eingefügt).
- Wenn du etwas nicht sicher findest, sage das ehrlich. Erfinde nichts.`

export async function runFollowup(
  input: FollowupInput,
): Promise<{ answer: string }> {
  const question = input?.question?.trim()
  if (!question) {
    throw new ApiError(400, 'Bitte gib eine Frage ein.')
  }

  const client = getClient()
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
    max_tokens: 1500,
    system: FOLLOWUP_SYSTEM,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages,
  })

  let guard = 0
  while (response.stop_reason === 'pause_turn' && guard < 6) {
    messages.push({ role: 'assistant', content: response.content })
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: FOLLOWUP_SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages,
    })
    guard++
  }

  const answer = extractText(response.content)
  if (!answer) {
    throw new ApiError(
      502,
      'Es konnte keine Antwort ermittelt werden. Bitte formuliere die Frage anders.',
    )
  }

  return { answer }
}
