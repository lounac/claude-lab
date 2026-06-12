import { NavLink, Outlet } from 'react-router-dom'
import { modes } from '../modes/registry'

const linkClass =
  'px-3 py-2 rounded-lg text-sm font-medium transition-colors'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-2 font-semibold text-violet-700">
            🎯 Interview-Trainer
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            {modes.map((mode) => (
              <NavLink
                key={mode.id}
                to={mode.path}
                className={({ isActive }) =>
                  `${linkClass} ${
                    isActive
                      ? 'bg-violet-100 text-violet-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="mr-1">{mode.icon}</span>
                {mode.title}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
