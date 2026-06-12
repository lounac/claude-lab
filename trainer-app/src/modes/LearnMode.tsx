import { useState, type FormEvent } from 'react'
import { postJSON } from '../lib/api'
import {
  loadCompanies,
  saveCompany,
  removeCompany,
  loadActiveCompany,
  setActiveCompanyUrl,
} from '../lib/storage'
import type { CompanyKnowledge } from '../types'
import Markdown from '../components/Markdown'
import CompanySelector from '../components/CompanySelector'

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

  const active = companies.find((c) => c.url === activeUrl) ?? null

  async function handleResearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    // "www.jambit.com" oder "jambit.com" um https:// ergänzen
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`

    setLoading(true)
    setError(null)
    try {
      const result = await postJSON<CompanyKnowledge>('/api/research', {
        url: normalized,
      })
      saveCompany(result)
      setCompanies(loadCompanies())
      setActiveUrl(result.url)
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(nextUrl: string) {
    setActiveCompanyUrl(nextUrl)
    setActiveUrl(nextUrl)
  }

  function handleRemove() {
    if (!active) return
    removeCompany(active.url)
    setCompanies(loadCompanies())
    setActiveUrl(loadActiveCompany()?.url ?? null)
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">📚 Firmenwissen lernen</h2>
      <p className="mb-4 text-slate-600">
        Gib die Website einer Firma ein – die App recherchiert automatisch die
        wichtigsten Infos für dein Interview. Die letzten 10 Firmen werden
        gespeichert und stehen in Quiz &amp; Rollenspiel zur Auswahl.
      </p>

      <form onSubmit={handleResearch} className="mb-6 flex flex-wrap gap-2">
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

      {loading && (
        <p className="mb-4 text-slate-500">
          ⏳ Claude durchsucht das Web – das dauert ca. 20–60 Sekunden …
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
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
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-500">
                  recherchiert am{' '}
                  {new Date(active.fetchedAt).toLocaleString('de-DE')}
                </div>
                <button
                  onClick={handleRemove}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  diese Firma löschen
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <Markdown>{active.summary}</Markdown>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
