import { useState } from 'react'
import { Link } from 'react-router-dom'
import { postJSON } from '../lib/api'
import { loadCompany } from '../lib/storage'

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

const QUIZ_SYSTEM = `Du erstellst ein Quiz zur Vorbereitung auf ein Vorstellungsgespräch. Erstelle anhand des Firmen-Briefings genau 5 Multiple-Choice-Fragen auf Deutsch, die Wissen über die Firma abfragen.

Antworte AUSSCHLIESSLICH mit einem JSON-Array (kein Markdown, kein Text davor oder danach) in genau diesem Format:
[
  {
    "question": "Fragetext",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Kurze Begründung der richtigen Antwort"
  }
]

Genau 4 Optionen pro Frage. "correctIndex" ist der 0-basierte Index der richtigen Option. Nutze nur Fakten aus dem Briefing.`

function parseQuestions(text: string): QuizQuestion[] {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```$/, '')
      .trim()
  }
  const data: unknown = JSON.parse(cleaned)
  if (!Array.isArray(data)) throw new Error('Antwort war kein JSON-Array')
  return data as QuizQuestion[]
}

export default function QuizMode() {
  const company = loadCompany()
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!company) {
    return (
      <div>
        <h2 className="mb-2 text-2xl font-bold">❓ Quiz</h2>
        <p className="text-slate-600">
          Für das Quiz brauchst du zuerst eine recherchierte Firma.{' '}
          <Link to="/learn" className="text-violet-700 underline">
            Jetzt im Firmenwissen-Modus recherchieren →
          </Link>
        </p>
      </div>
    )
  }

  const companySummary = company.summary

  async function startQuiz() {
    setLoading(true)
    setError(null)
    setSubmitted(false)
    setAnswers({})
    setQuestions(null)
    try {
      const res = await postJSON<{ text: string }>('/api/chat', {
        system: QUIZ_SYSTEM,
        messages: [
          { role: 'user', content: `Firmen-Briefing:\n\n${companySummary}` },
        ],
        maxTokens: 1800,
      })
      setQuestions(parseQuestions(res.text))
    } catch {
      setError('Das Quiz konnte nicht erstellt werden. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const allAnswered =
    questions !== null && questions.every((_, i) => answers[i] !== undefined)
  const score =
    questions === null
      ? 0
      : questions.reduce(
          (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
          0,
        )

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">❓ Quiz</h2>
      <p className="mb-4 text-slate-600">
        Teste dein Wissen über{' '}
        <span className="font-medium text-slate-700">{company.name}</span>.
      </p>

      {!questions && (
        <button
          onClick={startQuiz}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Erstelle Quiz…' : 'Quiz starten'}
        </button>
      )}
      {loading && !questions && (
        <p className="mt-3 text-slate-500">⏳ Claude erstellt deine Fragen …</p>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {questions && (
        <div className="space-y-5">
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 font-medium">
                {qi + 1}. {q.question}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi
                  const isCorrect = q.correctIndex === oi
                  let style = 'border-slate-200'
                  if (submitted) {
                    if (isCorrect) style = 'border-green-400 bg-green-50'
                    else if (selected) style = 'border-red-400 bg-red-50'
                  } else if (selected) {
                    style = 'border-violet-400 bg-violet-50'
                  }
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${style}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={selected}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((a) => ({ ...a, [qi]: oi }))
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  )
                })}
              </div>
              {submitted && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Erklärung:</span>{' '}
                  {q.explanation}
                </p>
              )}
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              Auswerten
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-semibold">
                Ergebnis: {score} / {questions.length} richtig
              </div>
              <button
                onClick={startQuiz}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Neues Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
