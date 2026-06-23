<script setup lang="ts">
// Bereich „Arbeitsagentur & Übergang": Termine, ALG-Fahrplan, Unterlagen.
import TermineSection from '../components/agentur/TermineSection.vue'
import AngeboteSection from '../components/agentur/AngeboteSection.vue'
import FahrplanSection from '../components/agentur/FahrplanSection.vue'
import UnterlagenSection from '../components/agentur/UnterlagenSection.vue'
</script>

<template>
  <v-container class="py-6" style="max-width: 760px">
    <h2 class="text-h5 mb-5">Arbeitsagentur &amp; Übergang</h2>

    <TermineSection />

    <AngeboteSection />

    <FahrplanSection />

    <UnterlagenSection />
  </v-container>
</template>
