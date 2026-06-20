<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApplicationsStore } from '../stores/applications'
import {
  APPLICATION_STATUSES,
  APPLICATION_PRIORITIES,
} from '../types/application'
import type { ApplicationInput, ApplicationStatus } from '../types/application'

const route = useRoute()
const router = useRouter()
const store = useApplicationsStore()

// Hat die Adresse eine id? Dann sind wir im Bearbeiten-Modus, sonst Neu-Modus.
const id = computed(() => route.params.id as string | undefined)
const istBearbeiten = computed(() => !!id.value)

// Auswahllisten für die Dropdowns (als normale Arrays).
const statusOptionen = [...APPLICATION_STATUSES]
const prioOptionen = [...APPLICATION_PRIORITIES]

// Die Eingabefelder. Start-Status: "beworben".
const form = reactive<ApplicationInput>({
  company_name: '',
  position: '',
  status: 'beworben',
  priority: null,
  source: '',
  contact_person: '',
  application_date: null,
  job_url: '',
  notes: '',
  next_deadline: null,
})

// Kommt man von der gefilterten Liste (z. B. Filter "interessant"), wird der
// Status als Vorauswahl übernommen – nur beim Neu-Anlegen.
const statusAusFilter = route.query.status
if (
  !istBearbeiten.value &&
  typeof statusAusFilter === 'string' &&
  (APPLICATION_STATUSES as readonly string[]).includes(statusAusFilter)
) {
  form.status = statusAusFilter as ApplicationStatus
}

const fehler = ref('')
const laeuft = ref(false)
const laden = ref(false)

// Im Bearbeiten-Modus: bestehende Bewerbung laden und ins Formular füllen.
onMounted(async () => {
  if (istBearbeiten.value && id.value) {
    laden.value = true
    const vorhandene = await store.getById(id.value)
    if (vorhandene) {
      form.company_name = vorhandene.company_name
      form.position = vorhandene.position
      form.status = vorhandene.status
      form.priority = vorhandene.priority
      form.source = vorhandene.source ?? ''
      form.contact_person = vorhandene.contact_person ?? ''
      form.application_date = vorhandene.application_date
      form.job_url = vorhandene.job_url ?? ''
      form.notes = vorhandene.notes ?? ''
      form.next_deadline = vorhandene.next_deadline
    }
    laden.value = false
  }
})

// Leere Texte in echte "Leerwerte" (null) umwandeln – wichtig für Datumsfelder.
function bereinigt(): ApplicationInput {
  const leerZuNull = (v: string | null) => (v === '' ? null : v)
  return {
    company_name: form.company_name,
    position: form.position,
    status: form.status,
    priority: form.priority,
    source: leerZuNull(form.source),
    contact_person: leerZuNull(form.contact_person),
    application_date: leerZuNull(form.application_date),
    job_url: leerZuNull(form.job_url),
    notes: leerZuNull(form.notes),
    next_deadline: leerZuNull(form.next_deadline),
  }
}

// Macht aus einem unbekannten Fehler (auch Supabase-Objekten) einen lesbaren Text.
function fehlerText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>
    const teile = [o.message, o.details, o.hint].filter(Boolean)
    if (teile.length) return teile.join(' — ')
    return JSON.stringify(e)
  }
  return String(e)
}

async function speichern() {
  if (!form.company_name) {
    fehler.value = 'Bitte gib mindestens den Firmennamen ein.'
    return
  }
  fehler.value = ''
  laeuft.value = true
  try {
    if (istBearbeiten.value && id.value) {
      await store.update(id.value, bereinigt())
    } else {
      await store.create(bereinigt())
    }
    router.push('/') // zurück zur Liste
  } catch (e) {
    fehler.value = fehlerText(e)
  } finally {
    laeuft.value = false
  }
}

function abbrechen() {
  router.push('/')
}
</script>

<template>
  <v-container class="py-6" style="max-width: 640px">
    <h2 class="text-h5 mb-4">
      {{ istBearbeiten ? 'Bewerbung bearbeiten' : 'Neue Bewerbung' }}
    </h2>

    <div v-if="laden" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-form v-else @submit.prevent="speichern">
      <v-text-field
        v-model="form.company_name"
        label="Firma *"
        prepend-inner-icon="mdi-domain"
      />
      <v-text-field v-model="form.position" label="Position" />

      <v-select v-model="form.status" :items="statusOptionen" label="Status" />
      <v-select
        v-model="form.priority"
        :items="prioOptionen"
        label="Priorität"
        clearable
      />

      <v-text-field
        v-model="form.application_date"
        label="Bewerbungsdatum"
        type="date"
      />
      <v-text-field
        v-model="form.next_deadline"
        label="Nächste Frist"
        type="date"
      />

      <v-text-field v-model="form.source" label="Quelle (wo gefunden)" />
      <v-text-field v-model="form.contact_person" label="Ansprechpartner" />
      <v-text-field v-model="form.job_url" label="Link zur Stelle" type="url" />
      <v-textarea v-model="form.notes" label="Notizen" rows="3" />

      <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
        {{ fehler }}
      </v-alert>

      <div class="d-flex" style="gap: 8px">
        <v-btn type="submit" color="primary" :loading="laeuft">Speichern</v-btn>
        <v-btn variant="text" @click="abbrechen">Abbrechen</v-btn>
      </div>
    </v-form>
  </v-container>
</template>
