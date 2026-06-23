<script setup lang="ts">
// Statische Info-Seite: Was bedeutet „Aspira" und was kann die App?
// Liste der Kernfunktionen – bewusst kurz gehalten.
const funktionen = [
  {
    icon: 'mdi-briefcase-search-outline',
    titel: 'Stellen im Blick',
    text: 'Alle Stellen mit Status-Pipeline, Prioritäten und Wunschfirmen an einem Ort.',
  },
  {
    icon: 'mdi-lightbulb-on-outline',
    titel: 'KI-Stärken-Analyse',
    text: 'Dein Lebenslauf wird gegen eine konkrete Stelle abgeglichen – Stärken, Lücken, Talking-Points.',
  },
  {
    icon: 'mdi-file-account-outline',
    titel: 'Dein CV, überall dabei',
    text: 'Der Lebenslauf-Text liegt sicher in deinem Konto und ist auf jedem Gerät verfügbar.',
  },
  {
    icon: 'mdi-trending-up',
    titel: 'Wächst mit dir',
    text: 'Vom Arbeitsagentur-Fahrplan bis zu Coaching-Ideen – Aspira begleitet den ganzen Weg.',
  },
]
</script>

<template>
  <v-container class="py-8" style="max-width: 760px">
    <div class="text-center mb-8">
      <h1 class="text-h3 font-weight-medium mb-1">Aspira</h1>
      <p class="text-medium-emphasis text-body-1">
        <em>aspirare</em> – anstreben, aufstreben.
      </p>
    </div>

    <v-card class="pa-5 mb-4">
      <h2 class="text-h6 mb-2">Was bedeutet „Aspira"?</h2>
      <p class="text-body-1" style="line-height: 1.7">
        Der Name kommt vom lateinischen <strong>aspirare</strong> – „nach etwas streben,
        aufsteigen". Er steckt auch im Wort <em>Aspiration</em>. Genau darum geht es hier:
        Aspira hilft dir, dein nächstes Ziel anzusteuern – strukturiert, mit Klarheit über
        deine Stärken und mit Rückenwind statt Bauchgefühl.
      </p>
    </v-card>

    <v-card class="pa-5 mb-4">
      <h2 class="text-h6 mb-3">Mehr als ein Bewerbungs-Tracker</h2>
      <v-list lines="two" density="comfortable" class="bg-transparent pa-0">
        <v-list-item
          v-for="f in funktionen"
          :key="f.titel"
          :prepend-icon="f.icon"
          :title="f.titel"
          :subtitle="f.text"
          class="px-0"
        />
      </v-list>
    </v-card>

    <p class="text-center text-medium-emphasis text-body-2">
      Aspira ist ein laufendes Projekt – und wächst Schritt für Schritt weiter.
    </p>
  </v-container>
</template>
