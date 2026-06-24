// Store für den Arbeitsagentur-Bereich: Termine (CRUD) + Checklisten-Zustand.
// Redet direkt mit Supabase (gleiches Muster wie der applications-Store).

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import type { Termin, TerminInput, AufgabenTyp, AufgabeZustand } from '../types/agentur'
import { freundlicherFehler } from '../lib/fehler'

export const useAgenturStore = defineStore('agentur', () => {
  const termine = ref<Termin[]>([])
  // Checklisten-Zustand als Map: schluessel -> Zustand (für schnellen Zugriff).
  const aufgaben = ref<Record<string, AufgabeZustand>>({})
  const loading = ref(false)
  const error = ref('')

  function sortiereNachDatum() {
    termine.value.sort((a, b) => a.datum.localeCompare(b.datum)) // nächster Termin zuerst
  }

  // --- Termine ---

  async function fetchTermine() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: err } = await supabase
        .from('agentur_termine')
        .select('*')
        .order('datum', { ascending: true })
      if (err) throw err
      termine.value = data as Termin[]
    } catch (e) {
      error.value = freundlicherFehler(e instanceof Error ? e.message : String(e))
    } finally {
      loading.value = false
    }
  }

  async function createTermin(input: TerminInput): Promise<Termin> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const auth = useAuthStore()
    const { data, error: err } = await supabase
      .from('agentur_termine')
      .insert({ ...input, user_id: auth.user?.id })
      .select()
      .single()
    if (err) throw err
    termine.value.push(data as Termin)
    sortiereNachDatum()
    return data as Termin
  }

  async function updateTermin(id: string, input: TerminInput): Promise<Termin> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const { data, error: err } = await supabase
      .from('agentur_termine')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    const i = termine.value.findIndex((t) => t.id === id)
    if (i !== -1) termine.value[i] = data as Termin
    sortiereNachDatum()
    return data as Termin
  }

  async function removeTermin(id: string): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Löschen ist gerade nicht möglich.')
    }
    const { error: err } = await supabase.from('agentur_termine').delete().eq('id', id)
    if (err) throw err
    termine.value = termine.value.filter((t) => t.id !== id)
  }

  // --- Checklisten (Fahrplan + Unterlagen) ---

  async function fetchAufgaben() {
    try {
      const { data, error: err } = await supabase
        .from('agentur_aufgaben')
        .select('schluessel, typ, erledigt, datum, notiz')
      if (err) throw err
      const map: Record<string, AufgabeZustand> = {}
      for (const row of data as AufgabeZustand[]) map[row.schluessel] = row
      aufgaben.value = map
    } catch (e) {
      error.value = freundlicherFehler(e instanceof Error ? e.message : String(e))
    }
  }

  // Hakt einen Checklisten-Punkt ab/wieder an (Upsert, ein Eintrag je Punkt).
  async function setErledigt(
    schluessel: string,
    typ: AufgabenTyp,
    erledigt: boolean,
  ): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Keine Internetverbindung – Speichern ist gerade nicht möglich.')
    }
    const auth = useAuthStore()
    const { error: err } = await supabase.from('agentur_aufgaben').upsert(
      {
        user_id: auth.user?.id,
        schluessel,
        typ,
        erledigt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,schluessel' },
    )
    if (err) throw err
    aufgaben.value[schluessel] = {
      ...(aufgaben.value[schluessel] ?? { schluessel, typ, datum: null, notiz: null }),
      erledigt,
    }
  }

  return {
    termine,
    aufgaben,
    loading,
    error,
    fetchTermine,
    createTermin,
    updateTermin,
    removeTermin,
    fetchAufgaben,
    setErledigt,
  }
})
