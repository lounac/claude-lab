<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Application } from '../../types/application'
import { useCv } from '../../composables/useCv'
import { useApplicationsStore } from '../../stores/applications'
import { supabase } from '../../lib/supabase'

const props = defineProps<{ application: Application }>()

const router = useRouter()
const store = useApplicationsStore()
const { cv, laden } = useCv() // nur lesen – verwaltet wird der CV unter „Mein CV"

// Beim Öffnen den CV aus Supabase holen (wichtig auf einem neuen Gerät,
// falls vorher nicht extra die „Mein CV"-Seite besucht wurde).
onMounted(() => {
  laden()
})

const hatStellentext = computed(() => !!props.application.job_description)
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Baut die Header für einen Backend-Aufruf inkl. deinem aktuellen Login-Token.
// Das Backend (Türsteher) lässt nur Anfragen mit gültigem Token durch.
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

const dialog = ref(false)
const laeuft = ref(false)
const fehler = ref('')
const ergebnis = ref<{
  analyse: string
  luecken: string
  kosten: { usd: number; eingabeTokens: number; ausgabeTokens: number }
} | null>(null)

// Bereits gespeicherte Analyse (aus der Bewerbung) – wird ohne neue Kosten angezeigt.
const gespeichert = ref<{ text: string; datum: string } | null>(
  props.application.last_analysis
    ? { text: props.application.last_analysis, datum: props.application.analyzed_at ?? '' }
    : null,
)

// Antworten der Bewerberin auf die Rückfragen (für die Verfeinerung).
const antworten = ref('')

// "Was mir noch fehlt für die Stelle" (Lücken) – wird auf der Karte gezeigt.
const gaps = ref<string>(props.application.gaps ?? '')

// Jede Lücken-Zeile "Wichtigkeit|Text" in ein Objekt zerlegen (für die Badges).
const gapItems = computed(() =>
  gaps.value
    .split('\n')
    .map((zeile) => zeile.trim())
    .filter(Boolean)
    .map((zeile) => {
      const i = zeile.indexOf('|')
      if (i === -1) return { prioritaet: '', text: zeile }
      return {
        prioritaet: zeile.slice(0, i).trim().toLowerCase(),
        text: zeile.slice(i + 1).trim(),
      }
    }),
)

function datumDeutsch(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

function zumCv() {
  dialog.value = false
  router.push('/cv')
}

async function analysieren() {
  if (!cv.value) return
  laeuft.value = true
  fehler.value = ''
  ergebnis.value = null
  try {
    const res = await fetch(`${apiUrl}/analyse/staerken`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        cvText: cv.value.text,
        firma: props.application.company_name,
        position: props.application.position,
        stellentext: props.application.job_description ?? '',
        notizen: props.application.notes ?? undefined,
      }),
    })
    if (!res.ok) throw new Error(`Server-Fehler (${res.status})`)
    ergebnis.value = await res.json()
    // Ergebnis dauerhaft an der Bewerbung speichern.
    try {
      const datum = await store.analyseSpeichern(
        props.application.id,
        ergebnis.value!.analyse,
        ergebnis.value!.luecken,
      )
      gespeichert.value = { text: ergebnis.value!.analyse, datum }
      gaps.value = ergebnis.value!.luecken
    } catch {
      // Speichern fehlgeschlagen – das Ergebnis wird trotzdem angezeigt.
    }
  } catch (e) {
    fehler.value =
      e instanceof Error ? e.message : 'Backend nicht erreichbar – läuft es auf Port 3000?'
  } finally {
    laeuft.value = false
  }
}

async function verfeinern() {
  const basis = ergebnis.value?.analyse ?? gespeichert.value?.text
  if (!cv.value || !basis || !antworten.value.trim()) return
  laeuft.value = true
  fehler.value = ''
  try {
    const res = await fetch(`${apiUrl}/analyse/verfeinern`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        cvText: cv.value.text,
        firma: props.application.company_name,
        position: props.application.position,
        stellentext: props.application.job_description ?? '',
        vorherigeAnalyse: basis,
        antworten: antworten.value,
      }),
    })
    if (!res.ok) throw new Error(`Server-Fehler (${res.status})`)
    ergebnis.value = await res.json()
    try {
      const datum = await store.analyseSpeichern(
        props.application.id,
        ergebnis.value!.analyse,
        ergebnis.value!.luecken,
      )
      gespeichert.value = { text: ergebnis.value!.analyse, datum }
      gaps.value = ergebnis.value!.luecken
    } catch {
      // Speichern fehlgeschlagen – Ergebnis wird trotzdem angezeigt.
    }
    antworten.value = ''
  } catch (e) {
    fehler.value =
      e instanceof Error ? e.message : 'Backend nicht erreichbar – läuft es auf Port 3000?'
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <v-btn
    color="primary"
    variant="tonal"
    prepend-icon="mdi-brain"
    @click="dialog = true"
  >
    Stärken-Analyse (KI)
  </v-btn>
  <p v-if="gespeichert" class="text-caption text-medium-emphasis mt-1">
    Zuletzt analysiert: {{ datumDeutsch(gespeichert.datum) }}
  </p>

  <!-- Was mir noch fehlt für die Stelle – direkt auf der Karte, unter dem Button -->
  <v-card v-if="gapItems.length" variant="outlined" class="mt-3 pa-3">
    <div class="text-subtitle-2 mb-2">Was mir noch fehlt für die Stelle</div>
    <div class="d-flex flex-column" style="gap: 8px">
      <div
        v-for="(g, idx) in gapItems"
        :key="idx"
        class="d-flex align-center"
        style="gap: 8px"
      >
        <v-chip v-if="g.prioritaet === 'wichtig'" color="error" size="x-small" label>
          Wichtig
        </v-chip>
        <v-chip
          v-else-if="g.prioritaet === 'nice-to-have'"
          color="grey"
          size="x-small"
          label
        >
          Nice-to-have
        </v-chip>
        <span class="text-body-2">{{ g.text }}</span>
      </div>
    </div>
  </v-card>

  <v-dialog v-model="dialog" max-width="640" scrollable>
    <v-card>
      <v-card-title>Stärken-Analyse</v-card-title>
      <v-card-text>
        <!-- CV-Status (verwaltet wird er unter „Mein CV") -->
        <v-alert v-if="!cv" type="info" density="compact" class="mb-3">
          Du hast noch keinen Lebenslauf hinterlegt.
          <a href="#" @click.prevent="zumCv">Jetzt unter „Mein CV" anlegen</a>.
        </v-alert>
        <div v-else class="mb-3 d-flex align-center" style="gap: 8px">
          <v-icon color="success">mdi-file-check-outline</v-icon>
          <span>Lebenslauf: <strong>{{ cv.name }}</strong></span>
          <v-spacer />
          <v-btn size="small" variant="text" @click="zumCv">verwalten</v-btn>
        </div>

        <!-- Hinweis, wenn keine Stellenbeschreibung hinterlegt ist -->
        <v-alert v-if="!hatStellentext" type="info" density="compact" class="mb-3">
          Für diese Stelle ist noch keine <strong>Stellenbeschreibung</strong> hinterlegt.
          Trag sie über „Bearbeiten" ein – nur dann kann Claude deinen CV dagegen vergleichen.
        </v-alert>

        <v-btn
          color="primary"
          :disabled="!cv || !hatStellentext || laeuft"
          :loading="laeuft"
          prepend-icon="mdi-creation"
          @click="analysieren"
        >
          {{ gespeichert ? 'Neu analysieren' : 'Analyse starten' }}
        </v-btn>
        <p class="text-caption text-medium-emphasis mt-2">
          Jede Analyse kostet ein paar Cent (Claude-API).
        </p>

        <v-alert v-if="fehler" type="error" density="compact" class="mt-4">
          {{ fehler }}
        </v-alert>

        <!-- Frisches Ergebnis (mit Kosten) -->
        <div v-if="ergebnis" class="mt-4">
          <v-divider class="mb-3" />
          <div style="white-space: pre-wrap">{{ ergebnis.analyse }}</div>
          <v-chip size="small" variant="tonal" class="mt-3" prepend-icon="mdi-cash">
            Kosten: ${{ ergebnis.kosten.usd.toFixed(4) }} ·
            {{ ergebnis.kosten.eingabeTokens }}+{{ ergebnis.kosten.ausgabeTokens }} Tokens
          </v-chip>
        </div>

        <!-- Sonst: gespeicherte Analyse (kostenlos angezeigt) -->
        <div v-else-if="gespeichert" class="mt-4">
          <v-divider class="mb-3" />
          <p class="text-caption text-medium-emphasis mb-2">
            Gespeicherte Analyse vom {{ datumDeutsch(gespeichert.datum) }}:
          </p>
          <div style="white-space: pre-wrap">{{ gespeichert.text }}</div>
        </div>

        <!-- Rückfragen beantworten → Claude verfeinert -->
        <div v-if="ergebnis || gespeichert" class="mt-4">
          <v-divider class="mb-3" />
          <p class="text-subtitle-2 mb-1">Rückfragen beantworten / Infos ergänzen</p>
          <v-textarea
            v-model="antworten"
            placeholder="Beantworte hier die offenen Rückfragen oder ergänze fehlende Infos…"
            rows="3"
            variant="outlined"
            auto-grow
          />
          <v-btn
            color="primary"
            variant="tonal"
            :disabled="!antworten.trim() || laeuft"
            :loading="laeuft"
            prepend-icon="mdi-refresh"
            @click="verfeinern"
          >
            Mit meinen Antworten verfeinern
          </v-btn>
          <p class="text-caption text-medium-emphasis mt-2">
            Erzeugt eine neue, aktualisierte Analyse (kostet wieder ein paar Cent).
          </p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Schließen</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
