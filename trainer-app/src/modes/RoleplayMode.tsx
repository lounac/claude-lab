import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { postJSON } from '../lib/api'
import { loadCompany } from '../lib/storage'
import type { ChatMessage } from '../types'

export default function RoleplayMode() {
  const company = loadCompany()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  if (!company) {
    return (
      <div>
        <h2 className="mb-2 text-2xl font-bold">🎤 Interview-Rollenspiel</h2>
        <p className="text-slate-600">
          Für das Rollenspiel brauchst du zuerst eine recherchierte Firma.{' '}
          <Link to="/learn" className="text-violet-700 underline">
            Jetzt im Firmenwissen-Modus recherchieren →
          </Link>
        </p>
      </div>
    )
  }

  const system = `Du bist eine erfahrene, freundliche, aber fordernde interviewende Person der Firma ${company.name}. Führe ein realistisches Bewerbungsgespräch auf Deutsch.

Regeln:
- Stelle immer nur EINE Frage pro Nachricht.
- Reagiere zuerst kurz (1–2 Sätze) auf die letzte Antwort, dann stelle die nächste Frage.
- Bleibe durchgehend in deiner Rolle als interviewende Person.
- Halte deine Nachrichten kurz und natürlich.

Nutze dieses Wissen über die Firma als Kontext:

${company.summary}`

  async function runTurn(history: ChatMessage[]) {
    setMessages(history)
    setLoading(true)
    setError(null)
    try {
      const res = await postJSON<{ text: string }>('/api/chat', {
        system,
        messages: history,
        maxTokens: 800,
      })
      setMessages([...history, { role: 'assistant', content: res.text }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function startInterview() {
    setStarted(true)
    await runTurn([
      { role: 'user', content: 'Hallo! Ich bin bereit für das Interview.' },
    ])
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    await runTurn([...messages, { role: 'user', content: trimmed }])
  }

  async function requestFeedback() {
    if (loading || messages.length === 0) return
    await runTurn([
      ...messages,
      {
        role: 'user',
        content:
          'Beende das Interview und gib mir ehrliches, konstruktives Feedback zu meinen Antworten: Stärken, Schwächen und 2–3 konkrete Tipps zur Verbesserung.',
      },
    ])
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">🎤 Interview-Rollenspiel</h2>
      <p className="mb-4 text-slate-600">
        Übe ein Bewerbungsgespräch bei{' '}
        <span className="font-medium text-slate-700">{company.name}</span>.
        Claude spielt die interviewende Person.
      </p>

      {!started ? (
        <button
          onClick={startInterview}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Starte…' : 'Interview starten'}
        </button>
      ) : (
        <div>
          <div className="mb-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'assistant' ? 'flex justify-start' : 'flex justify-end'
                }
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${
                    m.role === 'assistant'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-violet-600 text-white'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-slate-500">⏳ …</div>}
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Deine Antwort…"
              disabled={loading}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              Senden
            </button>
          </form>

          <button
            onClick={requestFeedback}
            disabled={loading || messages.length === 0}
            className="mt-3 text-sm text-slate-500 underline hover:text-violet-700 disabled:opacity-50"
          >
            Interview beenden &amp; Feedback erhalten
          </button>
        </div>
      )}
    </div>
  )
}
