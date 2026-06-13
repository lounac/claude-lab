import { useState, useEffect, type FormEvent } from 'react'
import { postJSON } from '../lib/api'
import {
  loadCompanies,
  saveCompany,
  removeCompany,
  loadActiveCompany,
  setActiveCompanyUrl,
  addSpend,
} from '../lib/storage'
import type { CompanyKnowledge } from '../types'
import Briefing from '../components/Briefing'
import CompanySelector from '../components/CompanySelector'
import Spinner from '../components/Spinner'

// USD grob in (Euro-)Cent für die Anzeige.
function toCents(usd?: number): number | null {
  return typeof usd === 'number' ? Math.round(usd * 100) : null
}

// Vorschläge für gezielte Nachfragen (füllen das Eingabefeld).
const QUICK_QUESTIONS = [
  'Welche offenen Stellen gibt es für Softwareentwicklung?',
  'Bietet die Firma Werkstudenten- oder Praktikumsstellen an?',
  'Wie läuft der Bewerbungsprozess ab?',
  'Welche Benefits und welches Arbeitsmodell (Remote/Hybrid) gibt es?',
]

export default function LearnMode() {
  const [companies, setCompanies] = useState<CompanyKnowledge[]>(() =>
    loadCompanies(),
  )
  const [activeUrl, setActiveUrl] = useState<string | null>(
    () => loadActiveCompany()?.url ?? null,
  )
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askInfo, setAskInfo] = useState<string | null>(null)

  const active = companies.find((c) => c.url === activeUrl) ?? null

  // Sekunden-Zähler während einer laufenden Recherche.
  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      500,
    )
    return () => clearInterval(id)
  }, [loading])

  async function handleResearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const result = await postJSON<CompanyKnowledge & { truncated?: boolean }>(
        '/api/research',
        { url: normalized },
      )
      const { truncated, ...company } = result
      addSpend(company.costUsd ?? 0)
      saveCompany(company)
      setCompanies(loadCompanies())
      setActiveUrl(company.url)
      setUrl('')
      if (truncated) {
        setNotice(
          'Hinweis: Die Recherche wurde aus Kostengründen vorzeitig gestoppt – das Briefing ist evtl. unvollständig.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(nextUrl: string) {
    setActiveCompanyUrl(nextUrl)
    setActiveUrl(nextUrl)
    setAskInfo(null)
    setNotice(null)
  }

  function handleRemove() {
    if (!active) return
    removeCompany(active.url)
    setCompanies(loadCompanies())
    setActiveUrl(loadActiveCompany()?.url ?? null)
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !active) return

    setAsking(true)
    setAskError(null)
    setAskInfo(null)
    try {
      const res = await postJSON<{ answer: string; costUsd?: number }>(
        '/api/ask',
        {
          url: active.url,
          name: active.name,
          summary: active.summary,
          question: trimmed,
        },
      )
      addSpend(res.costUsd ?? 0)
      const block = `**Frage:** ${trimmed}\n\n${res.answer.trim()}`
      const base = active.summary.trimEnd()
      const newSummary = base.includes('## Angefragte Informationen')
        ? `${base}\n\n${block}`
        : `${base}\n\n## Angefragte Informationen\n\n${block}`
      const updated: CompanyKnowledge = { ...active, summary: newSummary }
      saveCompany(updated)
      setCompanies(loadCompanies())
      setActiveUrl(updated.url)
      setQuestion('')
      const cents = toCents(res.costUsd)
      if (cents !== null) setAskInfo(`Letzte Nachfrage: ~${cents} Cent`)
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setAsking(false)
    }
  }

  function handleDownload() {
    if (!active) return
    const blob = new Blob([active.summary], {
      type: 'text/markdown;charset=utf-8',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const safeName = active.name.replace(/[^\wäöüÄÖÜß-]+/g, '_')
    link.download = `${safeName}_Briefing.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const activeCents = toCents(active?.costUsd)

  return (
    <div>
      {/* Bedien-Elemente – beim Drucken/PDF ausgeblendet, sodass nur das Briefing erscheint */}
      <div className="print:hidden">
        <h2 className="mb-2 text-2xl font-bold">📚 Firmenwissen lernen</h2>
        <p className="mb-4 text-slate-600">
          Gib die Website einer Firma ein – die App recherchiert (nur auf der
          Firmen-Website, um Kosten zu sparen) die wichtigsten Infos für dein
          Interview. Die letzten 10 Firmen werden gespeichert.
        </p>

        <form onSubmit={handleResearch} className="mb-2 flex flex-wrap gap-2">
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="z. B. www.jambit.com"
            disabled={loading}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Recherchiere…' : 'Recherchieren'}
          </button>
        </form>
        <p className="mb-6 text-xs text-slate-400">
          Recherche nur auf der Firmen-Website – kostet i. d. R. nur wenige Cent
          (Stopp bei ca. 30 Cent).
        </p>

        {loading && (
          <p className="mb-4">
            <Spinner
              label={`Claude recherchiert auf der Firmen-Website … ${elapsed}s`}
            />
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
            {notice}
          </div>
        )}

        {companies.length > 0 && (
          <>
            <CompanySelector
              companies={companies}
              activeUrl={activeUrl}
              onChange={handleSelect}
            />

            {active && (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-slate-500">
                    recherchiert am{' '}
                    {new Date(active.fetchedAt).toLocaleString('de-DE')}
                    {activeCents !== null && ` · Kosten: ~${activeCents} Cent`}
                  </div>
                  <button
                    onClick={handleRemove}
                    className="text-sm text-slate-500 hover:text-red-600"
                  >
                    diese Firma löschen
                  </button>
                </div>

                <form
                  onSubmit={handleAsk}
                  className="mb-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4"
                >
                  <label
                    htmlFor="ask-input"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Weitere Info zur Firma anfragen
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="ask-input"
                      type="text"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="z. B. Bietet die Firma Werkstudentenstellen an?"
                      disabled={asking}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={asking || !question.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {asking ? 'Frage läuft…' : 'Fragen'}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuestion(q)}
                        disabled={asking}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {asking && (
                    <p className="mt-2">
                      <Spinner label="Claude recherchiert die Antwort …" />
                    </p>
                  )}
                  {askError && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                      {askError}
                    </div>
                  )}
                  {askInfo && (
                    <p className="mt-2 text-xs text-slate-500">{askInfo}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Die Antwort wird unten im Briefing unter „Angefragte
                    Informationen" ergänzt und gespeichert.
                  </p>
                </form>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleDownload}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    ⬇ Als .md speichern
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    🖨 Drucken / als PDF
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {active && <Briefing summary={active.summary} />}
    </div>
  )
}
