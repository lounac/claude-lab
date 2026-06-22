// Zentraler "Speicher" für den Login-Zustand (Pinia-Store).
// Merkt sich, wer eingeloggt ist, und bietet die Login-Aktionen an.

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { cacheLeeren } from '../lib/applicationsCache'
import { cvCacheLeeren } from '../composables/useCv'

export const useAuthStore = defineStore('auth', () => {
  // Die aktuell eingeloggte Person – oder null, wenn niemand eingeloggt ist.
  const user = ref<User | null>(null)

  // true, solange wir beim Start noch prüfen, ob eine Session existiert.
  const loading = ref(true)

  // Beim App-Start aufrufen: bestehende Session laden und auf Änderungen lauschen.
  async function init() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    loading.value = false

    // Reagiert automatisch auf Login/Logout (auch in anderen Tabs).
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  // Registrieren mit E-Mail + Passwort.
  // (E-Mail-Bestätigung ist aus → es entsteht direkt eine Session.)
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    user.value = data.session?.user ?? null
  }

  // Einloggen mit E-Mail + Passwort.
  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.session?.user ?? null
  }

  // Ausloggen.
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    cacheLeeren() // lokale Bewerbungs-Kopie entfernen
    cvCacheLeeren() // lokale CV-Kopie entfernen
  }

  return { user, loading, init, signUp, signIn, signOut }
})
