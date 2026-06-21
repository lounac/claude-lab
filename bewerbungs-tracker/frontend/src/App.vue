<script setup lang="ts">
// Das Grundgerüst der App: durchgehende obere Leiste + die jeweils aktive Seite.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from './stores/auth'
import { useOnline } from './composables/useOnline'

const auth = useAuthStore()
const router = useRouter()
const { online } = useOnline()

// Hell-/Dunkel-Modus. Vuetify bringt die Themes 'light' und 'dark' schon mit.
const theme = useTheme()

// Gespeicherte Wahl beim Start übernehmen (bleibt über Neuladen erhalten).
const gespeichert = localStorage.getItem('bt_theme')
if (gespeichert === 'dark' || gespeichert === 'light') {
  theme.global.name.value = gespeichert
}

const istDunkel = computed(() => theme.global.current.value.dark)

function themeWechseln() {
  const neu = istDunkel.value ? 'light' : 'dark'
  theme.global.name.value = neu
  localStorage.setItem('bt_theme', neu)
}

async function abmelden() {
  await auth.signOut()
  router.push('/auth')
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title>
        <router-link to="/" style="color: inherit; text-decoration: none">
          Bewerbungs-Tracker
        </router-link>
      </v-app-bar-title>

      <!-- Hell/Dunkel umschalten (immer sichtbar) -->
      <v-btn
        :icon="istDunkel ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :title="istDunkel ? 'Heller Modus' : 'Dunkler Modus'"
        @click="themeWechseln"
      />

      <!-- Nur sichtbar, wenn jemand eingeloggt ist -->
      <template v-if="auth.user">
        <v-btn icon="mdi-file-account-outline" title="Mein CV" to="/cv" />
        <span class="text-body-2 mr-2 d-none d-sm-inline">{{ auth.user.email }}</span>
        <v-btn icon="mdi-logout" title="Abmelden" @click="abmelden" />
      </template>
    </v-app-bar>

    <v-main>
      <!-- Offline-Hinweis: erscheint automatisch ohne Internetverbindung -->
      <v-alert
        v-if="!online"
        type="warning"
        density="compact"
        rounded="0"
        icon="mdi-wifi-off"
      >
        Du bist offline – du siehst den zuletzt geladenen Stand. Speichern ist
        gerade nicht möglich.
      </v-alert>

      <router-view />
    </v-main>
  </v-app>
</template>
