import { Link } from 'react-router-dom'
import { modes } from '../modes/registry'

export default function Home() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Interview-Trainer</h1>
      <p className="mb-8 text-slate-600">
        Bereite dich auf dein Vorstellungsgespräch vor – Schritt für Schritt mit
        Claude. Wähle einen Modus:
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {modes.map((mode) => (
          <Link
            key={mode.id}
            to={mode.path}
            className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-md"
          >
            <div className="mb-2 text-3xl">{mode.icon}</div>
            <div className="mb-1 font-semibold">{mode.title}</div>
            <div className="text-sm text-slate-500">{mode.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
