// Kleiner Lade-Indikator (animierter Kreis) mit optionalem Text.
export default function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600"
      />
      {label && <span>{label}</span>}
    </span>
  )
}
