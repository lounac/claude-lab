<script setup lang="ts">
// Wiederverwendbarer Checklisten-Abschnitt (ALG-Fahrplan, Unterlagen, Angebote).
// Punkte kommen per Prop; der Erledigt-Zustand liegt in Supabase (agentur_aufgaben).
import { ref, computed, onMounted } from 'vue'
import { useAgenturStore } from '../../stores/agentur'
import type { AufgabeDefinition, AufgabenTyp } from '../../types/agentur'

const props = defineProps<{
  titel: string
  icon: string
  intro: string
  punkte: AufgabeDefinition[]
  typ: AufgabenTyp
  fortschritt?: boolean // optional: „x / n" im Kopf anzeigen
}>()

const store = useAgenturStore()
const fehler = ref('')

const erledigtAnzahl = computed(
  () => props.punkte.filter((p) => store.aufgaben[p.schluessel]?.erledigt).length,
)

onMounted(() => store.fetchAufgaben())

async function umschalten(s: AufgabeDefinition, val: boolean | null) {
  fehler.value = ''
  try {
    await store.setErledigt(s.schluessel, props.typ, !!val)
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  }
}
</script>

<template>
  <v-card class="pa-4 mb-4">
    <div class="d-flex align-center mb-1">
      <v-icon class="me-2">{{ icon }}</v-icon>
      <span class="text-subtitle-1 font-weight-medium">{{ titel }}</span>
      <template v-if="fortschritt">
        <v-spacer />
        <v-chip size="small" label variant="tonal">
          {{ erledigtAnzahl }} / {{ punkte.length }}
        </v-chip>
      </template>
    </div>
    <p class="text-medium-emphasis text-body-2 mb-2">{{ intro }}</p>

    <v-alert v-if="fehler" type="error" density="compact" class="mb-2">{{ fehler }}</v-alert>

    <v-checkbox
      v-for="s in punkte"
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
