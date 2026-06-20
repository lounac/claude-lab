<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { uebersetzeAuthFehler } from '../../lib/authErrors'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const passwort = ref('')
const fehler = ref('')
const laeuft = ref(false)

async function anmelden() {
  if (!email.value || !passwort.value) {
    fehler.value = 'Bitte E-Mail und Passwort eingeben.'
    return
  }
  fehler.value = ''
  laeuft.value = true
  try {
    await auth.signIn(email.value, passwort.value)
    router.push('/') // nach erfolgreichem Login zur Bewerbungsliste
  } catch (e) {
    fehler.value = uebersetzeAuthFehler(e instanceof Error ? e.message : String(e))
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <!-- @submit.prevent: Enter/Klick löst anmelden() aus, ohne die Seite neu zu laden. -->
  <v-form @submit.prevent="anmelden">
    <v-text-field
      v-model="email"
      label="E-Mail"
      type="email"
      autocomplete="email"
      prepend-inner-icon="mdi-email-outline"
    />
    <v-text-field
      v-model="passwort"
      label="Passwort"
      type="password"
      autocomplete="current-password"
      prepend-inner-icon="mdi-lock-outline"
    />

    <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
      {{ fehler }}
    </v-alert>

    <v-btn type="submit" color="primary" block :loading="laeuft"> Anmelden </v-btn>
  </v-form>
</template>
