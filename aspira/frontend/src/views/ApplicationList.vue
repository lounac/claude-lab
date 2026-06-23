<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicationsStore } from '../stores/applications'
import { APPLICATION_STATUSES } from '../types/application'
import type { ApplicationStatus } from '../types/application'
import ApplicationCard from '../components/applications/ApplicationCard.vue'

const store = useApplicationsStore()
// storeToRefs hält items/loading/error reaktiv (sie aktualisieren sich automatisch).
const { items, loading, error } = storeToRefs(store)

const router = useRouter()

// Aktiver Filter: 'alle' oder ein bestimmter Status.
const filter = ref<'alle' | ApplicationStatus>('alle')
const statusListe = [...APPLICATION_STATUSES]

// Anzahl Bewerbungen je Status (für die Zahlen im Dropdown).
const anzahlProStatus = computed(() => {
  const zaehler: Record<string, number> = {}
  for (const s of statusListe) zaehler[s] = 0
  for (const a of items.value) zaehler[a.status] = (zaehler[a.status] ?? 0) + 1
  return zaehler
})

// Ersten Buchstaben groß schreiben (für die Anzeige im Menü).
function grossAnfang(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Die Einträge des Filter-Dropdowns: "Alle (n)" plus jeder Status mit Anzahl.
const filterOptionen = computed(() => [
  { title: `Alle (${items.value.length})`, value: 'alle' },
  ...statusListe.map((s) => ({
    title: `${grossAnfang(s)} (${anzahlProStatus.value[s]})`,
    value: s,
  })),
])

// Die tatsächlich angezeigte (gefilterte) Liste.
const gefiltert = computed(() =>
  filter.value === 'alle'
    ? items.value
    : items.value.filter((a) => a.status === filter.value),
)

// Beim Öffnen der Seite die Bewerbungen laden.
onMounted(() => {
  store.fetchAll()
})

function neueBewerbung() {
  // Ist ein Status-Filter aktiv? Dann diesen ans Formular mitgeben (Vorauswahl).
  const query = filter.value !== 'alle' ? { status: filter.value } : undefined
  router.push({ name: 'new', query })
}
</script>

<template>
  <v-container class="py-6">
    <h2 class="text-h5 mb-4">Meine Stellen</h2>

    <v-btn color="primary" prepend-icon="mdi-plus" class="mb-4" @click="neueBewerbung">
      Stelle hinzufügen
    </v-btn>

    <!-- Filter: Auswahlmenü (platzsparend auch auf dem Handy) -->
    <v-select
      v-model="filter"
      :items="filterOptionen"
      label="Filter nach Status"
      density="comfortable"
      variant="outlined"
      hide-details
      class="mb-4"
      style="max-width: 320px"
    />

    <!-- Während des Ladens -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Falls ein Fehler auftritt -->
    <v-alert v-else-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <!-- Noch gar keine Bewerbungen -->
    <v-card v-else-if="items.length === 0" variant="tonal" class="pa-6 text-center">
      <v-icon size="48" class="mb-2">mdi-clipboard-text-outline</v-icon>
      <p class="text-h6 mb-1">Noch keine Stellen</p>
      <p class="text-medium-emphasis">Leg mit „Stelle hinzufügen" deine erste an.</p>
    </v-card>

    <!-- Es gibt Bewerbungen, aber keine im gewählten Filter -->
    <v-card
      v-else-if="gefiltert.length === 0"
      variant="tonal"
      class="pa-6 text-center"
    >
      <p class="text-medium-emphasis">
        Keine Stellen mit Status „{{ filter }}".
      </p>
    </v-card>

    <!-- Die gefilterte Liste -->
    <div v-else style="display: flex; flex-direction: column; gap: 12px">
      <ApplicationCard
        v-for="app in gefiltert"
        :key="app.id"
        :application="app"
      />
    </div>
  </v-container>
</template>
