<script setup lang="ts">
import type { ApplicationStatus } from '../../types/application'

const props = defineProps<{ status: ApplicationStatus }>()

// Jeder Status bekommt eine eigene Farbe (Vuetify-Farbnamen).
// Record<ApplicationStatus, string> sorgt dafür, dass TypeScript meckert,
// falls mal ein Status ohne Farbe vergessen wird.
const farben: Record<ApplicationStatus, string> = {
  interessant: 'blue-grey',
  'in vorbereitung': 'orange',
  beworben: 'blue',
  'antwort erhalten': 'cyan',
  interview: 'deep-purple',
  zusage: 'green',
  absage: 'red',
}
</script>

<template>
  <v-chip
    :color="farben[props.status]"
    size="small"
    variant="flat"
    label
    class="text-capitalize"
  >
    {{ props.status }}
  </v-chip>
</template>
