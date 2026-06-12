import { useState, type FormEvent } from 'react'
import { postJSON } from '../lib/api'
import { loadCompany, saveCompany, clearCompany } from '../lib/storage'
import type { CompanyKnowledge } from '../types'
import Markdown from '../components/Markdown'

export default function LearnMode() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanyKnowledge | null>(() =>
    loadCompany(),
  )

  async function handleResearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    try {
      const result = await postJSON<CompanyKnowledge>('/api/research', {
        url: trimmed,
      })
      saveCompany(result)
      setCompany(result)
      setUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    clearCompany()
    setCompany(null)
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">📚 Firmenwissen lernen</h2>
      <p className="mb-4 text-slate-600">
        Gib die Website deiner Wunsch-Firma ein. Die App recherchiert
        automatisch die wichtigsten Infos für dein Interview.
      </p>

      <form onSubmit={handleResearch} className="mb-6 flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.firma.de"
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
        <p className="text-slate-500">
          ⏳ Claude durchsucht das Web – das dauert ca. 20–60 Sekunden …
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {company && !loading && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-500">
              Aktive Firma:{' '}
              <span className="font-medium text-slate-700">{company.name}</span>
              {' · '}recherchiert am{' '}
              {new Date(company.fetchedAt).toLocaleString('de-DE')}
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-slate-500 hover:text-red-600"
            >
              zurücksetzen
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <Markdown>{company.summary}</Markdown>
          </div>
        </div>
      )}
    </div>
  )
}
