// Zentraler Speicher für die Bewerbungen (Pinia-Store).
// Redet mit der Supabase-Tabelle "applications" und hält die Liste im Speicher bereit.

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { Application, ApplicationInput } from '../types/application'

export const useApplicationsStore = defineStore('applications', () => {
  const items = ref<Application[]>([]) // die geladenen Bewerbungen
  const loading = ref(false) // true, während geladen wird
  const error = ref('') // letzte Fehlermeldung (für Anzeige)

  // Alle Bewerbungen laden. Dank der Schutzregel (RLS) sind das automatisch nur deine.
  async function fetchAll() {
    loading.value = true
    error.value = ''
    const { data, error: err } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false }) // neueste zuerst
    if (err) error.value = err.message
    else items.value = data as Application[]
    loading.value = false
  }

  // Eine einzelne Bewerbung holen (für Detail- und Bearbeiten-Seite).
  async function getById(id: string): Promise<Application | null> {
    const { data, error: err } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single()
    if (err) {
      error.value = err.message
      return null
    }
    return data as Application
  }

  // Neue Bewerbung anlegen. user_id wird automatisch ergänzt (verlangt die Schutzregel).
  async function create(input: ApplicationInput): Promise<Application> {
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('applications')
      .insert({ ...input, user_id: auth.user?.id })
      .select()
      .single()
    if (err) throw err
    items.value.unshift(data as Application) // sofort vorne in die Liste
    return data as Application
  }

  // Bestehende Bewerbung ändern.
  async function update(id: string, input: ApplicationInput): Promise<Application> {
    const { data, error: err } = await supabase
      .from('applications')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const index = items.value.findIndex((a) => a.id === id)
    if (index !== -1) items.value[index] = data as Application // Liste aktualisieren
    return data as Application
  }

  // Bewerbung löschen.
  async function remove(id: string): Promise<void> {
    const { error: err } = await supabase.from('applications').delete().eq('id', id)
    if (err) throw err
    items.value = items.value.filter((a) => a.id !== id) // aus der Liste entfernen
  }

  return { items, loading, error, fetchAll, getById, create, update, remove }
})
