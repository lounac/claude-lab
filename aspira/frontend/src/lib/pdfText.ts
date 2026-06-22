// Liest den Text aus einer PDF-Datei – direkt im Browser, ohne Server.
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// pdf.js braucht einen "Worker" (Hintergrund-Skript) – hier anmelden.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function pdfZuText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  let text = ''
  for (let seite = 1; seite <= pdf.numPages; seite++) {
    const page = await pdf.getPage(seite)
    const inhalt = await page.getTextContent()
    const zeile = inhalt.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    text += zeile + '\n\n'
  }
  return text.trim()
}
