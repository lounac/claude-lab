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
      <!-- Haupt-Bereiche: Stellen | Agentur (nur eingeloggt) -->
      <template v-if="auth.user">
        <v-btn icon="mdi-clipboard-text-outline" title="Meine Stellen" to="/" exact />
        <v-divider vertical class="mx-1 my-3" />
        <v-btn icon="mdi-bank-outline" title="Arbeitsagentur" to="/agentur" />
      </template>

      <v-spacer />

      <!-- App-Name, mittig -->
      <router-link
        to="/"
        class="flex-shrink-0 mx-2 text-decoration-none"
        style="color: inherit; font-size: 1.2rem; font-weight: 500"
      >
        Aspira
      </router-link>

      <v-spacer />

      <!-- Hell/Dunkel umschalten (immer sichtbar) -->
      <v-btn
        :icon="istDunkel ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :title="istDunkel ? 'Heller Modus' : 'Dunkler Modus'"
        @click="themeWechseln"
      />

      <!-- Weitere Funktionen, nur eingeloggt -->
      <template v-if="auth.user">
        <!-- Ab Tablet/Desktop: einzelne Icons -->
        <v-btn
          icon="mdi-file-account-outline"
          title="Mein CV"
          to="/cv"
          class="d-none d-sm-inline-flex"
        />
        <v-btn
          icon="mdi-information-outline"
          title="Über Aspira"
          to="/ueber"
          class="d-none d-sm-inline-flex"
        />
        <span class="text-body-2 mr-2 d-none d-md-inline">{{ auth.user.email }}</span>
        <v-btn
          icon="mdi-logout"
          title="Abmelden"
          class="d-none d-sm-inline-flex"
          @click="abmelden"
        />

        <!-- Auf dem Handy: Überlauf-Menü – spart Platz für den Namen -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" title="Mehr" class="d-sm-none" v-bind="props" />
          </template>
          <v-list density="comfortable">
            <v-list-item to="/cv" prepend-icon="mdi-file-account-outline" title="Mein CV" />
            <v-list-item to="/ueber" prepend-icon="mdi-information-outline" title="Über Aspira" />
            <v-list-item prepend-icon="mdi-logout" title="Abmelden" @click="abmelden" />
          </v-list>
        </v-menu>
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

<style scoped>
/* Aktiven Haupt-Bereich in der App-Leiste hervorheben. */
.v-app-bar .v-btn--active {
  background-color: rgba(0, 0, 0, 0.16);
}
</style>
