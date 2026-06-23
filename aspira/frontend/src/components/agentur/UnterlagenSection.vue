<script setup lang="ts">
// Abschnitt „Unterlagen": Checkliste der für den ALG-Antrag nötigen Dokumente.
// Zustand (erledigt = vorhanden) liegt in Supabase (agentur_aufgaben, typ 'unterlagen').
import { ref, computed, onMounted } from 'vue'
import { useAgenturStore } from '../../stores/agentur'
import type { AufgabeDefinition } from '../../types/agentur'

const store = useAgenturStore()
const fehler = ref('')

const unterlagen: AufgabeDefinition[] = [
  { schluessel: 'arbeitsbescheinigung', titel: 'Arbeitsbescheinigung' },
  { schluessel: 'kuendigung', titel: 'Kündigung / Aufhebungsvertrag' },
  { schluessel: 'lebenslauf', titel: 'Tabellarischer Lebenslauf (5 Jahre)' },
  { schluessel: 'sv_ausweis', titel: 'Sozialversicherungsausweis / RV-Nummer' },
  { schluessel: 'personalausweis', titel: 'Personalausweis' },
  { schluessel: 'steuer_id', titel: 'Steuer-ID' },
  { schluessel: 'iban', titel: 'IBAN / Kontoauszug' },
  { schluessel: 'arbeitszeugnisse', titel: 'Arbeitszeugnisse' },
]

const erledigtAnzahl = computed(
  () => unterlagen.filter((u) => store.aufgaben[u.schluessel]?.erledigt).length,
)

onMounted(() => store.fetchAufgaben())

async function umschalten(s: AufgabeDefinition, val: boolean | null) {
  fehler.value = ''
  try {
    await store.setErledigt(s.schluessel, 'unterlagen', !!val)
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  }
}
</script>

<template>
  <v-card class="pa-4">
    <div class="d-flex align-center mb-1">
      <v-icon class="me-2">mdi-file-document-multiple-outline</v-icon>
      <span class="text-subtitle-1 font-weight-medium">Unterlagen</span>
      <v-spacer />
      <v-chip size="small" label variant="tonal">{{ erledigtAnzahl }} / {{ unterlagen.length }}</v-chip>
    </div>
    <p class="text-medium-emphasis text-body-2 mb-2">
      Was du für den ALG-Antrag brauchst – abhaken, was du schon hast.
    </p>

    <v-alert v-if="fehler" type="error" density="compact" class="mb-2">{{ fehler }}</v-alert>

    <v-checkbox
      v-for="s in unterlagen"
      :key="s.schluessel"
      :model-value="store.aufgaben[s.schluessel]?.erledigt ?? false"
      :label="s.titel"
      color="primary"
      hide-details
      density="comfortable"
      @update:model-value="(val) => umschalten(s, val)"
    />
  </v-card>
</template>
