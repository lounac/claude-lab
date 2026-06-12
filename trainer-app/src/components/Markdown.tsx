import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Zeigt Markdown-Text schön formatiert an (Überschriften, Listen, Links …).
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-a:text-violet-700 prose-headings:scroll-mt-20">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
