<script setup lang="ts">
// Abschnitt „ALG-Fahrplan": feste Schritte zum Arbeitslosengeld, abhakbar.
// Der Zustand (erledigt) liegt in Supabase (agentur_aufgaben, typ 'fahrplan').
import { ref, onMounted } from 'vue'
import { useAgenturStore } from '../../stores/agentur'
import type { AufgabeDefinition } from '../../types/agentur'

const store = useAgenturStore()
const fehler = ref('')

// Fester Ablauf (Quelle: arbeitsagentur.de). Reihenfolge = Reihenfolge im echten Prozess.
const schritte: AufgabeDefinition[] = [
  {
    schluessel: 'arbeitssuchend_gemeldet',
    titel: 'Arbeitssuchend gemeldet',
    hinweis: 'Sobald die Kündigung absehbar ist (mind. 3 Monate vorher bzw. binnen 3 Tagen).',
  },
  {
    schluessel: 'arbeitsbescheinigung_anfordern',
    titel: 'Arbeitsbescheinigung anfordern',
    hinweis: 'Beim Arbeitgeber anfordern – er muss sie binnen 1 Woche ausstellen (elektronisch/BEA).',
  },
  {
    schluessel: 'arbeitslos_melden',
    titel: 'Arbeitslos melden',
    hinweis: 'Spätestens am 1. Tag der Arbeitslosigkeit – sonst droht eine Sperrzeit!',
    dringend: true,
  },
  {
    schluessel: 'alg_beantragen',
    titel: 'ALG I beantragen',
    hinweis: 'Direkt nach der Arbeitslosmeldung. Bearbeitung dauert 2–6 Wochen.',
  },
]

onMounted(() => store.fetchAufgaben())

async function umschalten(s: AufgabeDefinition, val: boolean | null) {
  fehler.value = ''
  try {
    await store.setErledigt(s.schluessel, 'fahrplan', !!val)
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  }
}
</script>

<template>
  <v-card class="pa-4 mb-4">
    <div class="d-flex align-center mb-1">
      <v-icon class="me-2">mdi-map-marker-path</v-icon>
      <span class="text-subtitle-1 font-weight-medium">ALG-Fahrplan</span>
    </div>
    <p class="text-medium-emphasis text-body-2 mb-2">
      Die wichtigsten Schritte zum Arbeitslosengeld – der Reihe nach abhaken.
    </p>

    <v-alert v-if="fehler" type="error" density="compact" class="mb-2">{{ fehler }}</v-alert>

    <v-checkbox
      v-for="s in schritte"
      :key="s.schluessel"
      :model-value="store.aufgaben[s.schluessel]?.erledigt ?? false"
      color="primary"
      hide-details
      density="comfortable"
      @update:model-value="(val) => umschalten(s, val)"
    >
      <template #label>
        <div>
          <div>{{ s.titel }}</div>
          <div
            v-if="s.hinweis"
            class="text-body-2"
            :class="s.dringend ? 'text-error' : 'text-medium-emphasis'"
          >
            {{ s.hinweis }}
          </div>
        </div>
      </template>
    </v-checkbox>
  </v-card>
</template>
