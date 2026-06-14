import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runResearch, ApiError } from './_lib/claude.js'

// Vercel: Funktion spätestens nach 60 s beenden (Schutz gegen Dauerläufer).
export const maxDuration = 60

// Vercel Serverless Function: POST /api/research
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Nur POST erlaubt' })
    return
  }
  try {
    const result = await runResearch(req.body ?? {})
    res.status(200).json(result)
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    res.status(status).json({ error: message })
  }
}
