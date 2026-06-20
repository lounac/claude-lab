<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApplicationsStore } from '../stores/applications'
import type { Application } from '../types/application'
import StatusChip from '../components/applications/StatusChip.vue'

const route = useRoute()
const router = useRouter()
const store = useApplicationsStore()

const id = route.params.id as string
const bewerbung = ref<Application | null>(null)
const laden = ref(true)

const loeschDialog = ref(false)
const loescht = ref(false)

onMounted(async () => {
  bewerbung.value = await store.getById(id)
  laden.value = false
})

function bearbeiten() {
  router.push({ name: 'edit', params: { id } })
}

async function loeschenBestaetigt() {
  loescht.value = true
  try {
    await store.remove(id)
    router.push('/') // zurück zur Liste
  } finally {
    loescht.value = false
    loeschDialog.value = false
  }
}
</script>

<template>
  <v-container class="py-6" style="max-width: 640px">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4" to="/">
      Zurück zur Liste
    </v-btn>

    <div v-if="laden" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-else-if="bewerbung">
      <v-card-item>
        <v-card-title class="text-h5">{{ bewerbung.company_name }}</v-card-title>
        <v-card-subtitle>{{ bewerbung.position || '—' }}</v-card-subtitle>
      </v-card-item>

      <v-card-text>
        <div
          class="mb-4"
          style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center"
        >
          <StatusChip :status="bewerbung.status" />
          <v-chip
            v-if="bewerbung.priority"
            size="small"
            variant="tonal"
            prepend-icon="mdi-flag-outline"
          >
            Priorität: {{ bewerbung.priority }}
          </v-chip>
        </div>

        <v-list density="compact" class="bg-transparent">
          <v-list-item
            v-if="bewerbung.application_date"
            prepend-icon="mdi-calendar"
            :title="bewerbung.application_date"
            subtitle="Bewerbungsdatum"
          />
          <v-list-item
            v-if="bewerbung.next_deadline"
            prepend-icon="mdi-calendar-clock"
            :title="bewerbung.next_deadline"
            subtitle="Nächste Frist"
          />
          <v-list-item
            v-if="bewerbung.source"
            prepend-icon="mdi-magnify"
            :title="bewerbung.source"
            subtitle="Quelle"
          />
          <v-list-item
            v-if="bewerbung.contact_person"
            prepend-icon="mdi-account"
            :title="bewerbung.contact_person"
            subtitle="Ansprechpartner"
          />
          <v-list-item
            v-if="bewerbung.job_url"
            prepend-icon="mdi-link-variant"
            subtitle="Link zur Stelle"
          >
            <template #title>
              <a :href="bewerbung.job_url" target="_blank" rel="noopener">
                {{ bewerbung.job_url }}
              </a>
            </template>
          </v-list-item>
        </v-list>

        <div v-if="bewerbung.notes" class="mt-4">
          <div class="text-subtitle-2 mb-1">Notizen</div>
          <p style="white-space: pre-wrap">{{ bewerbung.notes }}</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" prepend-icon="mdi-pencil" @click="bearbeiten">
          Bearbeiten
        </v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="text"
          prepend-icon="mdi-delete"
          @click="loeschDialog = true"
        >
          Löschen
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-alert v-else type="warning">Bewerbung nicht gefunden.</v-alert>

    <!-- Sicherheitsabfrage vor dem Löschen -->
    <v-dialog v-model="loeschDialog" max-width="400">
      <v-card>
        <v-card-title>Wirklich löschen?</v-card-title>
        <v-card-text>Diese Bewerbung wird dauerhaft entfernt.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="loeschDialog = false">Abbrechen</v-btn>
          <v-btn color="error" :loading="loescht" @click="loeschenBestaetigt">
            Löschen
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
