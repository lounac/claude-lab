import Markdown from './Markdown'

interface Section {
  title: string
  body: string
}

// Zerlegt das Markdown-Briefing in seine "##"-Abschnitte (Unterpunkte).
function splitSections(summary: string): { title: string; sections: Section[] } {
  const titleMatch = summary.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : ''

  const sections: Section[] = []
  let current: Section | null = null
  for (const line of summary.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/)
    if (heading) {
      if (current) sections.push(current)
      current = { title: heading[1].trim(), body: '' }
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line
    }
  }
  if (current) sections.push(current)

  return { title, sections }
}

// Zeigt das Firmen-Briefing als einklappbare Unterpunkte an.
export default function Briefing({ summary }: { summary: string }) {
  const { title, sections } = splitSections(summary)

  // Fallback: keine "##"-Abschnitte gefunden → komplettes Markdown anzeigen.
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Markdown>{summary}</Markdown>
      </div>
    )
  }

  return (
    <div>
      {title && <h3 className="mb-3 text-2xl font-bold">{title}</h3>}
      <div className="space-y-2">
        {sections.map((section, i) => (
          <details
            key={i}
            open
            className="rounded-lg border border-slate-200 bg-white"
          >
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50">
              {section.title}
            </summary>
            <div className="border-t border-slate-100 px-4 py-3">
              <Markdown>{section.body.trim()}</Markdown>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
