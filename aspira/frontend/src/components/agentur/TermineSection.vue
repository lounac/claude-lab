<script setup lang="ts">
// Abschnitt „Termine" im Arbeitsagentur-Bereich: anlegen/bearbeiten/löschen.
// Anstehende Termine werden hervorgehoben, vergangene abgeblendet.
import { ref, onMounted } from 'vue'
import { useAgenturStore } from '../../stores/agentur'
import type { Termin } from '../../types/agentur'

const store = useAgenturStore()
const jetzt = new Date().toISOString()

onMounted(() => store.fetchTermine())

const dialog = ref(false)
const bearbeiteId = ref<string | null>(null)
const speichert = ref(false)
const fehler = ref('') // Fehler im Dialog
const aktionsFehler = ref('') // Fehler beim Löschen
const form = ref({ titel: '', datum: '', ort: '', notiz: '' })

function neu() {
  bearbeiteId.value = null
  form.value = { titel: '', datum: '', ort: '', notiz: '' }
  fehler.value = ''
  dialog.value = true
}

function bearbeiten(t: Termin) {
  bearbeiteId.value = t.id
  form.value = {
    titel: t.titel,
    datum: isoZuLocalInput(t.datum),
    ort: t.ort ?? '',
    notiz: t.notiz ?? '',
  }
  fehler.value = ''
  dialog.value = true
}

async function speichern() {
  if (!form.value.titel.trim() || !form.value.datum) {
    fehler.value = 'Bitte Titel und Datum angeben.'
    return
  }
  speichert.value = true
  fehler.value = ''
  try {
    const eingabe = {
      titel: form.value.titel.trim(),
      datum: new Date(form.value.datum).toISOString(),
      ort: form.value.ort.trim() || null,
      notiz: form.value.notiz.trim() || null,
    }
    if (bearbeiteId.value) await store.updateTermin(bearbeiteId.value, eingabe)
    else await store.createTermin(eingabe)
    dialog.value = false
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  } finally {
    speichert.value = false
  }
}

async function loeschen(t: Termin) {
  if (!confirm(`Termin „${t.titel}" wirklich löschen?`)) return
  aktionsFehler.value = ''
  try {
    await store.removeTermin(t.id)
  } catch (e) {
    aktionsFehler.value = e instanceof Error ? e.message : 'Löschen fehlgeschlagen.'
  }
}

// ISO-Zeitstempel -> Wert für <input type="datetime-local"> (lokale Zeit).
function isoZuLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function datumLang(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

function istKuenftig(iso: string): boolean {
  return iso >= jetzt
}
</script>

<template>
  <v-card class="pa-4 mb-4">
    <div class="d-flex align-center mb-2">
      <v-icon class="me-2">mdi-calendar-clock</v-icon>
      <span class="text-subtitle-1 font-weight-medium">Termine</span>
      <v-spacer />
      <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="neu">Termin</v-btn>
    </div>

    <v-alert
      v-if="store.error || aktionsFehler"
      type="error"
      density="compact"
      class="mb-3"
    >
      {{ store.error || aktionsFehler }}
    </v-alert>

    <div v-if="store.loading" class="text-center py-4">
      <v-progress-circular indeterminate size="22" color="primary" />
    </div>

    <p v-else-if="store.termine.length === 0" class="text-medium-emphasis text-body-2 mb-0">
      Noch keine Termine – leg deinen ersten an (z. B. das Erstgespräch).
    </p>

    <v-list v-else class="bg-transparent pa-0">
      <v-list-item
        v-for="t in store.termine"
        :key="t.id"
        class="px-0"
        :class="{ 'opacity-60': !istKuenftig(t.datum) }"
      >
        <template #prepend>
          <v-chip
            size="small"
            :color="istKuenftig(t.datum) ? 'primary' : 'grey'"
            label
            class="me-3"
          >
            {{ datumLang(t.datum) }}
          </v-chip>
        </template>
        <v-list-item-title>{{ t.titel }}</v-list-item-title>
        <v-list-item-subtitle v-if="t.ort || t.notiz">
          {{ [t.ort, t.notiz].filter(Boolean).join(' · ') }}
        </v-list-item-subtitle>
        <template #append>
          <v-btn icon="mdi-pencil" variant="text" size="small" @click="bearbeiten(t)" />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="loeschen(t)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="dialog" max-width="480">
      <v-card>
        <v-card-title>{{ bearbeiteId ? 'Termin bearbeiten' : 'Neuer Termin' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.titel" label="Titel *" prepend-inner-icon="mdi-text" />
          <v-text-field v-model="form.datum" label="Datum & Uhrzeit *" type="datetime-local" />
          <v-text-field v-model="form.ort" label="Ort" prepend-inner-icon="mdi-map-marker" />
          <v-textarea v-model="form.notiz" label="Notiz" rows="2" auto-grow />
          <v-alert v-if="fehler" type="error" density="compact">{{ fehler }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Abbrechen</v-btn>
          <v-btn color="primary" :loading="speichert" @click="speichern">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
