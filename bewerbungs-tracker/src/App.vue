<script setup lang="ts">
// Das Grundgerüst der App: durchgehende obere Leiste + die jeweils aktive Seite.
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useOnline } from './composables/useOnline'

const auth = useAuthStore()
const router = useRouter()
const { online } = useOnline()

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

      <!-- Nur sichtbar, wenn jemand eingeloggt ist -->
      <template v-if="auth.user">
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
