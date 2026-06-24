// Zentraler Speicher für die Bewerbungen (Pinia-Store).
// Redet mit Supabase und hält zusätzlich eine lokale Kopie für den Offline-Fall.

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { cacheLesen, cacheSchreiben } from '../lib/applicationsCache'
import type { Application, ApplicationInput } from '../types/application'
import { freundlicherFehler } from '../lib/fehler'

export const useApplicationsStore = defineStore('applications', () => {
  // Start: direkt die lokale Kopie laden → Liste ist sofort da (auch offline).
  const items = ref<Application[]>(cacheLesen())
  const loading = ref(false)
  const error = ref('')
  const ausCache = ref(false) // true = wir zeigen gerade die Offline-Kopie

  async function fetchAll() {
    loading.value = true
    error.value = ''
    ausCache.value = false
    try {
      const { data, error: err } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false }) // neueste zuerst
      if (err) throw err
      items.value = data as Application[]
      cacheSchreiben(items.value) // lokale Kopie aktualisieren
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (!navigator.onLine) {
        // Offline: zuletzt gespeicherte Kopie anzeigen.
        const kopie = cacheLesen()
        items.value = kopie
        ausCache.value = kopie.length > 0
        error.value = kopie.length
          ? ''
          : 'Keine Internetverbindung – es sind noch keine Daten gespeichert.'
      } else {
        error.value = freundlicherFehler(message)
      }
    } finally {
      loading.value = false
    }
  }

  async function getById(id: string): Promise<Application | null> {
    try {
      const { data, error: err } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single()
      if (err) throw err
      return data as Application
    } catch (e) {
      // Offline/Fehler: in der bereits geladenen Liste (= Kopie) nachsehen.
      const ausListe = items.value.find((a) => a.id === id)
      if (ausListe) return ausListe
      error.value = freundlicherFehler(e instanceof Error ? e.message : String(e))
      return null
    }
  }

  async function create(input: ApplicationInput): Promise<Application> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('applications')
      .insert({ ...input, user_id: auth.user?.id })
      .select()
      .single()
    if (err) throw err
    items.value.unshift(data as Application)
    cacheSchreiben(items.value)
    return data as Application
  }

  async function update(id: string, input: ApplicationInput): Promise<Application> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const { data, error: err } = await supabase
      .from('applications')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const index = items.value.findIndex((a) => a.id === id)
    if (index !== -1) items.value[index] = data as Application
    cacheSchreiben(items.value)
    return data as Application
  }

  async function remove(id: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Löschen ist gerade nicht möglich.')
    }
    const { error: err } = await supabase.from('applications').delete().eq('id', id)
    if (err) throw err
    items.value = items.value.filter((a) => a.id !== id)
    cacheSchreiben(items.value)
  }

  // Speichert die letzte KI-Analyse + Lücken + Zeitstempel an einer Bewerbung.
  async function analyseSpeichern(
    id: string,
    analyse: string,
    gaps: string,
  ): Promise<string> {
    const analyzed_at = new Date().toISOString()
    const { error: err } = await supabase
      .from('applications')
      .update({ last_analysis: analyse, analyzed_at, gaps })
      .eq('id', id)
    if (err) throw err
    const index = items.value.findIndex((a) => a.id === id)
    if (index !== -1) {
      items.value[index] = {
        ...items.value[index],
        last_analysis: analyse,
        analyzed_at,
        gaps,
      }
      cacheSchreiben(items.value)
    }
    return analyzed_at
  }

  return {
    items,
    loading,
    error,
    ausCache,
    fetchAll,
    getById,
    create,
    update,
    remove,
    analyseSpeichern,
  }
})
