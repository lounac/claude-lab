import Anthropic from '@anthropic-ai/sdk'

// Gemeinsame Backend-Logik für lokalen Dev-Server UND Vercel.
// Dateien/Ordner in /api, die mit "_" beginnen, sind kein eigener Endpunkt.

const MODEL = 'claude-sonnet-4-6'

/** Fehler mit HTTP-Statuscode. */
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

// --- Kostenschätzung (modellgenau) -----------------------------------------
const PRICES: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3 / 1_000_000, out: 15 / 1_000_000 },
  'claude-haiku-4-5': { in: 1 / 1_000_000, out: 5 / 1_000_000 },
  'claude-opus-4-8': { in: 5 / 1_000_000, out: 25 / 1_000_000 },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateCostUSD(usage: any, model: string): number {
  if (!usage) return 0
  const p = PRICES[model] ?? PRICES['claude-sonnet-4-6']
  return (
    (usage.input_tokens ?? 0) * p.in +
    (usage.output_tokens ?? 0) * p.out +
    (usage.cache_read_input_tokens ?? 0) * p.in * 0.1 +
    (usage.cache_creation_input_tokens ?? 0) * p.in * 1.25
  )
}

// ---------------------------------------------------------------------------
// Chat (für Quiz)
// ---------------------------------------------------------------------------

export interface ChatInput {
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
  model?: string
}

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

  return {
    text: extractText(response.content),
    costUsd: estimateCostUSD(response.usage, model),
  }
}

// ---------------------------------------------------------------------------
// Recherche: App lädt selbst gezielt Unterseiten der Firmenwebsite und fasst
// sie in EINEM Claude-Aufruf zusammen. Dadurch sind Kosten & Zeit fest gedeckelt
// (kein unkontrollierbarer server-seitiger Web-Such-Loop).
// ---------------------------------------------------------------------------

export interface ResearchInput {
  url: string
}

export interface ResearchResult {
  name: string
  summary: string
  url: string
  fetchedAt: string
  costUsd: number
  truncated: boolean
}

const FETCH_TIMEOUT_MS = 8000 // pro Seite
const MAX_PAGES = 14 // Startseite + bis zu 13 Unterseiten
const MAX_CHARS_PER_PAGE = 7000
const MAX_TOTAL_CHARS = 80000 // begrenzt die Kosten (~10–15 Cent), egal wie viele Seiten

function domainFromUrl(u: string): string | undefined {
  try {
    return new URL(u).hostname.replace(/^www\./i, '') || undefined
  } catch {
    return undefined
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Interview-Trainer Recherche)' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    const accepted =
      contentType === '' ||
      contentType.includes('html') ||
      contentType.includes('xml') ||
      contentType.includes('text')
    if (!accepted) return null
    return await res.text()
  } catch {
    return null
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const PAGE_KEYWORDS = [
  'ueber', 'über', 'about', 'unternehmen', 'company', 'karriere', 'career',
  'jobs', 'stelle', 'news', 'presse', 'press', 'blog', 'leistung', 'produkt',
  'service', 'kultur', 'culture', 'mission', 'werte', 'value', 'strateg',
  'team', 'standort', 'geschichte', 'history',
]

const NON_CONTENT_EXT =
  /\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|mp3|css|js|ico|xml|json|woff2?|ttf)$/i

function isContentUrl(u: URL): boolean {
  return !NON_CONTENT_EXT.test(u.pathname)
}

function scoreUrl(u: string): number {
  const lower = u.toLowerCase()
  let score = 0
  for (const k of PAGE_KEYWORDS) if (lower.includes(k)) score += 1
  return score
}

// Interne Links (gleiche Domain) aus HTML extrahieren.
function extractInternalLinks(
  html: string,
  base: string,
  domain: string,
): string[] {
  const out = new Set<string>()
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue
    }
    let abs: URL
    try {
      abs = new URL(href, base)
    } catch {
      continue
    }
    if (abs.hostname.replace(/^www\./i, '') !== domain) continue
    if (!isContentUrl(abs)) continue
    abs.hash = ''
    abs.search = ''
    out.add(abs.toString())
  }
  return [...out]
}

// URLs aus der sitemap.xml sammeln (mit einfacher Sitemap-Index-Auflösung).
async function collectSitemapUrls(
  origin: string,
  domain: string,
): Promise<string[]> {
  const out = new Set<string>()
  async function read(sitemapUrl: string, depth: number): Promise<void> {
    if (depth > 1 || out.size > 300) return
    const xml = await fetchHtml(sitemapUrl)
    if (!xml) return
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((x) => x[1])
    for (const loc of locs) {
      if (/\.xml$/i.test(loc)) {
        if (depth < 1) await read(loc, depth + 1)
        continue
      }
      let abs: URL
      try {
        abs = new URL(loc)
      } catch {
        continue
      }
      if (abs.hostname.replace(/^www\./i, '') !== domain) continue
      if (!isContentUrl(abs)) continue
      abs.hash = ''
      abs.search = ''
      out.add(abs.toString())
    }
  }
  await read(`${origin}/sitemap.xml`, 0)
  return [...out]
}

const RESEARCH_SYSTEM = `Du bist ein Recherche-Assistent, der Menschen hilft, eine Firma für ihre Bewerbung und ihr Vorstellungsgespräch wirklich zu verstehen. Du erhältst den Textinhalt mehrerer Seiten der FIRMENEIGENEN Website. Erstelle daraus ein fundiertes, faktenbasiertes Briefing auf Deutsch.

Regeln:
- Nutze NUR die bereitgestellten Seiteninhalte. Erfinde nichts.
- Verlinke bei wichtigen Informationen die Seite, von der sie stammen (die "### Seite:"-URLs), z. B. ([Quelle](https://…)).
- News: nur Meldungen aus den letzten 6 Monaten, sofern im Text vorhanden.
- Gib KEINE Vorrede aus. Die erste Zeile MUSS "# Firmenname" sein.

Struktur (Abschnitte ohne Inhalt weglassen):

# <Firmenname>

## Überblick
Branche, Gründung, Größe, Standorte.

## Produkte & Dienstleistungen
Wichtigste Angebote – mit etwas Detail.

## Abteilungen & Bereiche
Abteilungen/Teams.

## Aktuelle Projekte & Technologien
Projekte, Referenzen, Tech-Stack.

## Kultur, Philosophie & Strategie
Unternehmenskultur, Leitbild/Philosophie und strategische Ausrichtung – fundiert.

## Benefits & Arbeitsmodell
Arbeitsmodell (Remote/Hybrid/Büro), Benefits, Einstiegsmöglichkeiten, Bewerbungsprozess.

## News
Meldungen aus den letzten 6 Monaten (neueste zuerst, höchstens 10). Format:
- **JJJJ-MM:** Kurzbeschreibung ([Quelle](https://…))

## Offene Stellen & gesuchte Profile
Fokus auf Softwareentwicklung/IT. Verlinke die Karriere-Übersichtsseite (keine einzelnen, bald ungültigen Stellen-URLs).

## Mögliche Interview-Themen
3–6 Stichpunkte.

## Quellen
Liste der genutzten Seiten als Aufzählung mit Links.`

export async function runResearch(input: ResearchInput): Promise<ResearchResult> {
  const raw = input?.url?.trim()
  if (!raw) {
    throw new ApiError(400, 'Bitte gib eine Firmen-URL an.')
  }
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const domain = domainFromUrl(url)
  if (!domain) {
    throw new ApiError(400, 'Ungültige URL.')
  }

  // 1) Startseite laden
  const homeHtml = await fetchHtml(url)
  if (!homeHtml) {
    throw new ApiError(
      502,
      'Die Firmen-Website konnte nicht geladen werden. Bitte prüfe die URL.',
    )
  }

  // 2) Kandidaten-Seiten aus Startseiten-Links UND sitemap.xml sammeln,
  //    nach Stichwort-Relevanz sortieren und die besten parallel laden.
  const origin = new URL(url).origin
  const homeNorm = (() => {
    const x = new URL(url)
    x.hash = ''
    x.search = ''
    return x.toString()
  })()
  const sitemapUrls = await collectSitemapUrls(origin, domain)
  const candidates = new Set<string>([
    ...extractInternalLinks(homeHtml, url, domain),
    ...sitemapUrls,
  ])
  candidates.delete(homeNorm)
  const subUrls = [...candidates]
    .sort((a, b) => scoreUrl(b) - scoreUrl(a))
    .slice(0, MAX_PAGES - 1)

  const pages: { url: string; text: string }[] = [
    { url, text: htmlToText(homeHtml).slice(0, MAX_CHARS_PER_PAGE) },
  ]
  const subHtml = await Promise.all(subUrls.map((s) => fetchHtml(s)))
  subUrls.forEach((s, i) => {
    const h = subHtml[i]
    if (h) pages.push({ url: s, text: htmlToText(h).slice(0, MAX_CHARS_PER_PAGE) })
  })

  // 3) Gesamttext begrenzen
  let combined = pages
    .map((p) => `### Seite: ${p.url}\n${p.text}`)
    .join('\n\n')
  if (combined.length > MAX_TOTAL_CHARS) {
    combined = combined.slice(0, MAX_TOTAL_CHARS)
  }

  // 4) EIN Claude-Aufruf (ohne Web-Tool) → Briefing
  const client = getClient()
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3500,
    system: RESEARCH_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Firma: ${url} (Domain: ${domain})\n\nNachfolgend der Textinhalt mehrerer Seiten der firmeneigenen Website. Erstelle daraus das Briefing:\n\n${combined}`,
      },
    ],
  })

  const fullText = extractText(response.content)
  const headingIndex = fullText.search(/^#\s+/m)
  const summary =
    headingIndex >= 0 ? fullText.slice(headingIndex).trim() : fullText
  if (!summary) {
    throw new ApiError(
      502,
      'Die Recherche lieferte kein Ergebnis. Bitte erneut versuchen.',
    )
  }
  const headingMatch = summary.match(/^#\s+(.+)$/m)
  const name = headingMatch ? headingMatch[1].trim() : domain

  return {
    name,
    summary,
    url,
    fetchedAt: new Date().toISOString(),
    costUsd: estimateCostUSD(response.usage, MODEL),
    truncated: false,
  }
}

// ---------------------------------------------------------------------------
// Nachfrage OHNE Web-Suche: nur anhand des vorhandenen Briefings (~1–2 Cent),
// die Antwort wird dem passenden Abschnitt zugeordnet.
// ---------------------------------------------------------------------------

export interface FollowupInput {
  question: string
  name?: string
  url?: string
  summary?: string
}

const FOLLOWUP_SYSTEM = `Du beantwortest eine Frage zu einer Firma – für eine Person, die sich dort bewirbt – AUSSCHLIESSLICH anhand des bereitgestellten Firmen-Briefings. Es wird KEINE neue Web-Recherche durchgeführt (um Kosten zu sparen).

Ordne die Antwort dem thematisch am besten passenden Abschnitt des Briefings zu (nutze exakt eine der vorhandenen "##"-Überschriften). Passt keiner, wähle einen kurzen, treffenden neuen Abschnittstitel.

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

  return { section, answer, costUsd: estimateCostUSD(response.usage, MODEL) }
}
