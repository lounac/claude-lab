// Kleiner Helfer, um das Backend (/api/*) aufzurufen.
// Wirft bei Fehlern eine aussagekräftige Exception.

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

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
