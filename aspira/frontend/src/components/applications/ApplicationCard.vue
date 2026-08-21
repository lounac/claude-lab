<script setup lang="ts">
import type { Application } from '../../types/application'
import StatusChip from './StatusChip.vue'

// Diese Karte bekommt eine Bewerbung übergeben und zeigt sie an.
defineProps<{ application: Application }>()
</script>

<template>
  <!-- :to macht die ganze Karte zu einem Link auf die Detailansicht. -->
  <v-card
    variant="outlined"
    hover
    :to="{ name: 'detail', params: { id: application.id } }"
  >
    <v-card-item>
      <v-card-title>{{ application.company_name }}</v-card-title>
      <v-card-subtitle>{{ application.position || '—' }}</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center">
        <StatusChip :status="application.status" />

        <span
          v-if="application.next_deadline"
          class="text-caption text-medium-emphasis"
        >
          Frist: {{ application.next_deadline }}
        </span>

        <span
          v-if="application.interview_chance !== null"
          class="text-caption text-medium-emphasis"
        >
          Chance: {{ application.interview_chance }}%
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>
