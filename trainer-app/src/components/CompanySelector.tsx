import type { CompanyKnowledge } from '../types'

interface Props {
  companies: CompanyKnowledge[]
  activeUrl: string | null
  onChange: (url: string) => void
}

// Auswahl-Menü für die gespeicherten Firmen. Wird in allen Modi genutzt.
export default function CompanySelector({
  companies,
  activeUrl,
  onChange,
}: Props) {
  if (companies.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label
        htmlFor="company-select"
        className="text-sm font-medium text-slate-600"
      >
        Firma:
      </label>
      <select
        id="company-select"
        value={activeUrl ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {companies.map((company) => (
          <option key={company.url} value={company.url}>
            {company.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-400">
        {companies.length} / 10 gespeichert
      </span>
    </div>
  )
}
