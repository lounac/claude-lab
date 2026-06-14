// Kleiner Helfer, um das Backend (/api/*) aufzurufen.
// Mit App-seitigem Timeout, damit die Oberfläche nie endlos hängt,
// falls der Server nicht (rechtzeitig) antwortet.
// Hinweis: Der Timeout bricht nur die ANZEIGE ab – die eigentliche
// Kostenbegrenzung passiert serverseitig (begrenzte Recherche + Funktions-Timeout).

const DEFAULT_TIMEOUT_MS = 80_000

export async function postJSON<T>(
  path: string,
  body: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Zeitüberschreitung – der Server hat nicht rechtzeitig geantwortet. Bitte erneut versuchen.',
      )
    }
    throw new Error(
      'Verbindungsfehler – bitte Internetverbindung prüfen und erneut versuchen.',
    )
  }
  clearTimeout(timer)

  if (!res.ok) {
    let message = `Anfrage fehlgeschlagen (HTTP ${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = String(data.error)
    } catch {
      // Antwort war kein JSON – Standardmeldung behalten
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}
