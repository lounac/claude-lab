<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { uebersetzeAuthFehler } from '../../lib/authErrors'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// Kommt man von einem abgelaufenen Link aus der "Passwort vergessen"-Mail,
// schickt der Router hierher mit ?hinweis=link-abgelaufen.
const linkAbgelaufen = route.query.hinweis === 'link-abgelaufen'

const email = ref('')
const passwort = ref('')
const fehler = ref('')
const hinweis = ref(
  linkAbgelaufen
    ? 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere hier einfach einen neuen an.'
    : '',
)
const laeuft = ref(false)

// false = Anmelden, true = "Passwort vergessen" (Link per E-Mail anfordern).
const vergessen = ref(linkAbgelaufen)

function modusWechseln() {
  vergessen.value = !vergessen.value
  fehler.value = ''
  hinweis.value = ''
}

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

async function linkSenden() {
  if (!email.value) {
    fehler.value = 'Bitte gib deine E-Mail-Adresse ein.'
    return
  }
  fehler.value = ''
  hinweis.value = ''
  laeuft.value = true
  try {
    await auth.passwortLinkSenden(email.value)
    // Bewusst neutral formuliert: verrät nicht, ob es zu der Adresse ein Konto gibt.
    hinweis.value =
      'Falls es zu dieser E-Mail ein Konto gibt, ist jetzt ein Link unterwegs. ' +
      'Schau auch im Spam-Ordner nach.'
  } catch (e) {
    fehler.value = uebersetzeAuthFehler(e instanceof Error ? e.message : String(e))
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <!-- @submit.prevent: Enter/Klick löst die Aktion aus, ohne die Seite neu zu laden. -->
  <v-form @submit.prevent="vergessen ? linkSenden() : anmelden()">
    <v-text-field
      v-model="email"
      label="E-Mail"
      type="email"
      autocomplete="email"
      prepend-inner-icon="mdi-email-outline"
    />
    <v-text-field
      v-if="!vergessen"
      v-model="passwort"
      label="Passwort"
      type="password"
      autocomplete="current-password"
      prepend-inner-icon="mdi-lock-outline"
    />
    <p v-else class="text-body-2 text-medium-emphasis mb-4">
      Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.
    </p>

    <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
      {{ fehler }}
    </v-alert>
    <v-alert v-if="hinweis" type="info" density="compact" class="mb-3">
      {{ hinweis }}
    </v-alert>

    <v-btn type="submit" color="primary" block :loading="laeuft">
      {{ vergessen ? 'Link senden' : 'Anmelden' }}
    </v-btn>
    <v-btn variant="text" block class="mt-2" @click="modusWechseln">
      {{ vergessen ? 'Zurück zur Anmeldung' : 'Passwort vergessen?' }}
    </v-btn>
  </v-form>
</template>
