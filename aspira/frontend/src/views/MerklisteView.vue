<script setup lang="ts">
// Merkliste: Wunschfirmen und -stellen (Status "interessant"), getrennt von "Meine Stellen".
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicationsStore } from '../stores/applications'
import { MERKLISTEN_STATUS } from '../types/application'
import type { Application } from '../types/application'
import { fehlerText } from '../lib/fehler'

const store = useApplicationsStore()
const { items, loading, error } = storeToRefs(store)
const router = useRouter()

// Nur die gemerkten Einträge.
const gemerkt = computed(() => items.value.filter((a) => a.status === MERKLISTEN_STATUS))

// Zweite Zeile: Position (oder Hinweis) plus Termin/Chance, falls vorhanden.
function untertitel(a: Application): string {
  const teile = [a.position || 'Firma – noch keine konkrete Stelle']
  if (a.next_deadline) teile.push(`Termin: ${a.next_deadline}`)
  if (a.interview_chance !== null) teile.push(`Chance: ${a.interview_chance}%`)
  return teile.join(' · ')
}

const meldung = ref('') // Text der Snackbar
const zeigeMeldung = ref(false)
const verschiebeId = ref<string | null>(null) // welcher "Bewerben"-Button gerade lädt

onMounted(() => {
  store.fetchAll()
})

function merken() {
  router.push({ name: 'new', query: { status: MERKLISTEN_STATUS } })
}

// "Bewerben": Eintrag wandert mit allen Angaben nach "Meine Stellen".
async function bewerben(a: Application) {
  verschiebeId.value = a.id
  try {
    await store.statusAendern(a.id, 'in vorbereitung')
    meldung.value = `${a.company_name} ist jetzt in „Meine Stellen" (in vorbereitung).`
  } catch (e) {
    meldung.value = fehlerText(e)
  } finally {
    verschiebeId.value = null
    zeigeMeldung.value = true
  }
}
</script>

<template>
  <v-container class="py-6">
    <h2 class="text-h5 mb-1">Merkliste</h2>
    <p class="text-medium-emphasis mb-4">Firmen und Stellen, die dich interessieren.</p>

    <v-btn color="primary" prepend-icon="mdi-star-plus-outline" class="mb-4" @click="merken">
      Merken
    </v-btn>

    <!-- Während des Ladens -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Falls ein Fehler auftritt -->
    <v-alert v-else-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <!-- Noch nichts gemerkt -->
    <v-card v-else-if="gemerkt.length === 0" variant="tonal" class="pa-6 text-center">
      <v-icon size="48" class="mb-2">mdi-star-outline</v-icon>
      <p class="text-h6 mb-1">Noch nichts gemerkt</p>
      <p class="text-medium-emphasis">Mit „Merken" legst du eine Wunschfirma oder -stelle an.</p>
    </v-card>

    <!-- Die kompakte Liste: eine Zeile pro Eintrag -->
    <v-card v-else variant="outlined">
      <v-list lines="two" class="py-0">
        <template v-for="(a, i) in gemerkt" :key="a.id">
          <v-divider v-if="i > 0" />
          <v-list-item
            :to="{ name: 'detail', params: { id: a.id } }"
            :title="a.company_name"
            :subtitle="untertitel(a)"
            prepend-icon="mdi-star-outline"
          >
            <template #append>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-send-outline"
                :loading="verschiebeId === a.id"
                @click.prevent.stop="bewerben(a)"
              >
                Bewerben
              </v-btn>
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>

    <v-snackbar v-model="zeigeMeldung" timeout="4000">{{ meldung }}</v-snackbar>
  </v-container>
</template>
