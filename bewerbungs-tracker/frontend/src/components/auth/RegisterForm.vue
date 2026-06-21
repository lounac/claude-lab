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
const hinweis = ref('')
const laeuft = ref(false)

async function registrieren() {
  if (!email.value || !passwort.value) {
    fehler.value = 'Bitte E-Mail und Passwort eingeben.'
    return
  }
  fehler.value = ''
  hinweis.value = ''
  laeuft.value = true
  try {
    await auth.signUp(email.value, passwort.value)
    if (auth.user) {
      router.push('/') // direkt eingeloggt → zur Liste
    } else {
      // Falls die E-Mail-Bestätigung doch aktiv sein sollte:
      hinweis.value =
        'Fast geschafft! Bitte bestätige deine E-Mail-Adresse und melde dich dann an.'
    }
  } catch (e) {
    fehler.value = uebersetzeAuthFehler(e instanceof Error ? e.message : String(e))
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <v-form @submit.prevent="registrieren">
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
      autocomplete="new-password"
      prepend-inner-icon="mdi-lock-outline"
      hint="Mindestens 6 Zeichen"
      persistent-hint
      class="mb-2"
    />

    <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
      {{ fehler }}
    </v-alert>
    <v-alert v-if="hinweis" type="info" density="compact" class="mb-3">
      {{ hinweis }}
    </v-alert>

    <v-btn type="submit" color="primary" block :loading="laeuft"> Registrieren </v-btn>
  </v-form>
</template>
