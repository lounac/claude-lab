<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCv } from '../composables/useCv'
import { pdfZuText } from '../lib/pdfText'

const { cv, laden, speichern, loeschen } = useCv()

// Lokale Bearbeitungsfelder (mit dem gespeicherten CV vorbelegt).
const name = ref(cv.value?.name ?? '')
const text = ref(cv.value?.text ?? '')

const ladet = ref(false) // CV wird gerade aus Supabase geholt
const speichert = ref(false) // wird gerade gespeichert/gelöscht
const liest = ref(false) // PDF wird gerade ausgelesen
const fehler = ref('')
const meldung = ref('')

// Beim Öffnen: aktuellen CV aus Supabase holen und die Felder damit füllen.
onMounted(async () => {
  ladet.value = true
  try {
    await laden()
    name.value = cv.value?.name ?? ''
    text.value = cv.value?.text ?? ''
  } finally {
    ladet.value = false
  }
})

async function dateiGewaehlt(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  liest.value = true
  fehler.value = ''
  meldung.value = ''
  try {
    const t = await pdfZuText(file)
    name.value = file.name
    text.value = t
    if (!t) {
      fehler.value =
        'Aus dieser PDF konnte kein Text gelesen werden (vermutlich ein Scan/Bild). ' +
        'Du kannst den Text unten von Hand einfügen.'
    }
  } catch {
    fehler.value = 'Die PDF konnte nicht gelesen werden.'
  } finally {
    liest.value = false
  }
}

async function speichernKlick() {
  if (!text.value.trim()) {
    fehler.value = 'Bitte zuerst einen CV hochladen oder Text einfügen.'
    return
  }
  speichert.value = true
  fehler.value = ''
  meldung.value = ''
  try {
    await speichern({ name: name.value || 'Lebenslauf', text: text.value })
    meldung.value = 'Lebenslauf gespeichert.'
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Speichern fehlgeschlagen.'
  } finally {
    speichert.value = false
  }
}

async function loeschenKlick() {
  speichert.value = true
  fehler.value = ''
  meldung.value = ''
  try {
    await loeschen()
    name.value = ''
    text.value = ''
    meldung.value = 'Lebenslauf gelöscht.'
  } catch (e) {
    fehler.value = e instanceof Error ? e.message : 'Löschen fehlgeschlagen.'
  } finally {
    speichert.value = false
  }
}
</script>

<template>
  <v-container class="py-6" style="max-width: 720px">
    <h2 class="text-h5 mb-2">Mein Lebenslauf</h2>
    <p class="text-medium-emphasis mb-4">
      Hinterlege hier einmal deinen CV. Er wird sicher in deinem Konto gespeichert und ist
      so auf allen deinen Geräten verfügbar. Verwendet wird er für die Stärken-Analyse.
    </p>

    <div v-if="ladet" class="d-flex align-center mb-4" style="gap: 8px">
      <v-progress-circular indeterminate size="20" color="primary" />
      <span>Lebenslauf wird geladen…</span>
    </div>

    <v-card class="pa-4">
      <p class="mb-2">CV als PDF hochladen (der Text wird automatisch ausgelesen):</p>
      <input type="file" accept="application/pdf" @change="dateiGewaehlt" />
      <div v-if="liest" class="mt-2 d-flex align-center" style="gap: 8px">
        <v-progress-circular indeterminate size="20" color="primary" />
        <span>PDF wird gelesen…</span>
      </div>

      <v-textarea
        v-model="text"
        label="Lebenslauf-Text (bearbeitbar)"
        rows="14"
        variant="outlined"
        auto-grow
        class="mt-4"
      />

      <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
        {{ fehler }}
      </v-alert>
      <v-alert v-if="meldung" type="success" density="compact" class="mb-3">
        {{ meldung }}
      </v-alert>

      <div class="d-flex" style="gap: 8px">
        <v-btn
          color="primary"
          prepend-icon="mdi-content-save"
          :loading="speichert"
          :disabled="speichert || liest"
          @click="speichernKlick"
        >
          Speichern
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="cv"
          color="error"
          variant="text"
          prepend-icon="mdi-delete"
          :disabled="speichert"
          @click="loeschenKlick"
        >
          CV löschen
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>
