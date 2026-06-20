<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicationsStore } from '../stores/applications'
import { useAuthStore } from '../stores/auth'
import ApplicationCard from '../components/applications/ApplicationCard.vue'

const store = useApplicationsStore()
// storeToRefs hält items/loading/error reaktiv (sie aktualisieren sich automatisch).
const { items, loading, error } = storeToRefs(store)

const auth = useAuthStore()
const router = useRouter()

// Beim Öffnen der Seite die Bewerbungen laden.
onMounted(() => {
  store.fetchAll()
})

function neueBewerbung() {
  router.push({ name: 'new' }) // Route kommt in Schritt 15
}

// Vorläufiger Abmelden-Knopf – wandert in Schritt 17 in die App-Leiste.
async function abmelden() {
  await auth.signOut()
  router.push('/auth')
}
</script>

<template>
  <v-container class="py-6">
    <!-- Kopfzeile -->
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Meine Bewerbungen</h2>
      <v-spacer />
      <v-btn
        icon="mdi-logout"
        variant="text"
        title="Abmelden"
        @click="abmelden"
      />
    </div>

    <v-btn color="primary" prepend-icon="mdi-plus" class="mb-4" @click="neueBewerbung">
      Neue Bewerbung
    </v-btn>

    <!-- Während des Ladens -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Falls ein Fehler auftritt -->
    <v-alert v-else-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <!-- Noch keine Bewerbungen -->
    <v-card v-else-if="items.length === 0" variant="tonal" class="pa-6 text-center">
      <v-icon size="48" class="mb-2">mdi-clipboard-text-outline</v-icon>
      <p class="text-h6 mb-1">Noch keine Bewerbungen</p>
      <p class="text-medium-emphasis">Leg mit „Neue Bewerbung" deine erste an.</p>
    </v-card>

    <!-- Die Liste -->
    <div v-else style="display: flex; flex-direction: column; gap: 12px">
      <ApplicationCard
        v-for="app in items"
        :key="app.id"
        :application="app"
      />
    </div>
  </v-container>
</template>
