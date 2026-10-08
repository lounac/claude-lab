<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicationsStore } from '../stores/applications'
import { APPLICATION_STATUSES, MERKLISTEN_STATUS } from '../types/application'
import type { ApplicationStatus } from '../types/application'
import ApplicationCard from '../components/applications/ApplicationCard.vue'
import { SORTIER_OPTIONEN, sortiert } from '../lib/sortierung'
import type { Sortierfeld } from '../lib/sortierung'

const store = useApplicationsStore()
// storeToRefs hält items/loading/error reaktiv (sie aktualisieren sich automatisch).
const { items, loading, error } = storeToRefs(store)

const router = useRouter()

// Gemerkte Einträge ("interessant") stehen auf der eigenen Merkliste, nicht hier.
const bewerbungen = computed(() =>
  items.value.filter((a) => a.status !== MERKLISTEN_STATUS),
)

// Aktiver Filter: 'alle' oder ein bestimmter Status.
const filter = ref<'alle' | ApplicationStatus>('alle')
const statusListe = APPLICATION_STATUSES.filter((s) => s !== MERKLISTEN_STATUS)

// Anzahl Bewerbungen je Status (für die Zahlen im Dropdown).
const anzahlProStatus = computed(() => {
  const zaehler: Record<string, number> = {}
  for (const s of statusListe) zaehler[s] = 0
  for (const a of bewerbungen.value) zaehler[a.status] = (zaehler[a.status] ?? 0) + 1
  return zaehler
})

// Ersten Buchstaben groß schreiben (für die Anzeige im Menü).
function grossAnfang(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Die Einträge des Filter-Dropdowns: "Alle (n)" plus jeder Status mit Anzahl.
const filterOptionen = computed(() => [
  { title: `Alle (${bewerbungen.value.length})`, value: 'alle' },
  ...statusListe.map((s) => ({
    title: `${grossAnfang(s)} (${anzahlProStatus.value[s]})`,
    value: s,
  })),
])

// Wonach sortiert wird (immer neueste zuerst).
const sortierung = ref<Sortierfeld>('created_at')

// Die tatsächlich angezeigte Liste: erst gefiltert, dann sortiert.
const gefiltert = computed(() =>
  sortiert(
    filter.value === 'alle'
      ? bewerbungen.value
      : bewerbungen.value.filter((a) => a.status === filter.value),
    sortierung.value,
  ),
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

    <!-- Filter + Sortierung: Auswahlmenüs (platzsparend auch auf dem Handy) -->
    <div class="d-flex flex-wrap mb-4" style="gap: 12px">
      <v-select
        v-model="filter"
        :items="filterOptionen"
        label="Filter nach Status"
        density="comfortable"
        variant="outlined"
        hide-details
        style="max-width: 320px; min-width: 220px"
      />
      <v-select
        v-model="sortierung"
        :items="SORTIER_OPTIONEN"
        label="Sortieren nach"
        density="comfortable"
        variant="outlined"
        hide-details
        style="max-width: 240px; min-width: 180px"
      />
    </div>

    <!-- Während des Ladens -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Falls ein Fehler auftritt -->
    <v-alert v-else-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <!-- Noch gar keine Bewerbungen -->
    <v-card v-else-if="bewerbungen.length === 0" variant="tonal" class="pa-6 text-center">
      <v-icon size="48" class="mb-2">mdi-clipboard-text-outline</v-icon>
      <p class="text-h6 mb-1">Noch keine Stellen</p>
      <p class="text-medium-emphasis">
        Leg mit „Stelle hinzufügen" deine erste an – oder starte eine Bewerbung aus der Merkliste.
      </p>
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
