import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runChat, ApiError } from './_lib/claude.js'

// Vercel: Funktion spätestens nach 30 s beenden.
export const maxDuration = 30

// Vercel Serverless Function: POST /api/chat
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Nur POST erlaubt' })
    return
  }
  try {
    const result = await runChat(req.body ?? {})
    res.status(200).json(result)
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    res.status(status).json({ error: message })
  }
}
