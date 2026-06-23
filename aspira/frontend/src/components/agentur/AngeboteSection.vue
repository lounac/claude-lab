<script setup lang="ts">
// Abschnitt „Angebote der Agentur": Übersicht über mögliche Unterstützungs-
// angebote der Agentur für Arbeit – abhaken, was schon genutzt/angenommen ist.
// Zustand in Supabase (agentur_aufgaben, typ 'angebote').
import { ref, onMounted } from 'vue'
import { useAgenturStore } from '../../stores/agentur'
import type { AufgabeDefinition } from '../../types/agentur'

const store = useAgenturStore()
const fehler = ref('')

// Gängige Angebote (Quelle: arbeitsagentur.de).
const angebote: AufgabeDefinition[] = [
  {
    schluessel: 'beratungsgespraech',
    titel: 'Beratungsgespräch',
    hinweis: 'Persönliches Gespräch zu Vermittlung und Strategie.',
  },
  {
    schluessel: 'vermittlungsvorschlaege',
    titel: 'Vermittlungsvorschläge',
    hinweis: 'Konkrete Stellen, die die Agentur dir vorschlägt.',
  },
  {
    schluessel: 'bewerbungscoaching',
    titel: 'Bewerbungscoaching / -training',
    hinweis: 'Unterstützung bei Unterlagen und Auftreten.',
  },
  {
    schluessel: 'avgs',
    titel: 'Aktivierungs- & Vermittlungsgutschein (AVGS)',
    hinweis: 'Gutschein für Coaching/Maßnahmen über externe Anbieter.',
  },
  {
    schluessel: 'bildungsgutschein',
    titel: 'Bildungsgutschein',
    hinweis: 'Förderung einer Weiterbildung/Umschulung – nur nach Beratung.',
  },
  {
    schluessel: 'vermittlungsbudget',
    titel: 'Vermittlungsbudget',
    hinweis: 'Erstattung von Bewerbungs- und Reisekosten zu Vorstellungsgesprächen.',
  },
  {
    schluessel: 'veranstaltungen',
    titel: 'Jobmessen & Veranstaltungen',
    hinweis: 'Job- und Karrieremessen der Agentur.',
  },
]

onMounted(() => store.fetchAufgaben())

async function umschalten(s: AufgabeDefinition, val: boolean | null) {
  fehler.value = ''
  try {
    await store.setErledigt(s.schluessel, 'angebote', !!val)
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  }
}
</script>

<template>
  <v-card class="pa-4 mb-4">
    <div class="d-flex align-center mb-1">
      <v-icon class="me-2">mdi-handshake-outline</v-icon>
      <span class="text-subtitle-1 font-weight-medium">Angebote der Agentur</span>
    </div>
    <p class="text-medium-emphasis text-body-2 mb-2">
      Was die Agentur anbietet – hak ab, was du schon genutzt bzw. angenommen hast.
    </p>

    <v-alert v-if="fehler" type="error" density="compact" class="mb-2">{{ fehler }}</v-alert>

    <v-checkbox
      v-for="s in angebote"
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
          <div v-if="s.hinweis" class="text-body-2 text-medium-emphasis">{{ s.hinweis }}</div>
        </div>
      </template>
    </v-checkbox>
  </v-card>
</template>
