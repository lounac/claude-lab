<script setup lang="ts">
// Bereich „Arbeitsagentur & Übergang": Termine + drei Checklisten.
import TermineSection from '../components/agentur/TermineSection.vue'
import ChecklisteSection from '../components/agentur/ChecklisteSection.vue'
import type { AufgabeDefinition } from '../types/agentur'

// Feste Checklisten-Inhalte (Quelle: arbeitsagentur.de).
const angebote: AufgabeDefinition[] = [
  { schluessel: 'beratungsgespraech', titel: 'Beratungsgespräch', hinweis: 'Persönliches Gespräch zu Vermittlung und Strategie.' },
  { schluessel: 'vermittlungsvorschlaege', titel: 'Vermittlungsvorschläge', hinweis: 'Konkrete Stellen, die die Agentur dir vorschlägt.' },
  { schluessel: 'bewerbungscoaching', titel: 'Bewerbungscoaching / -training', hinweis: 'Unterstützung bei Unterlagen und Auftreten.' },
  { schluessel: 'avgs', titel: 'Aktivierungs- & Vermittlungsgutschein (AVGS)', hinweis: 'Gutschein für Coaching/Maßnahmen über externe Anbieter.' },
  { schluessel: 'bildungsgutschein', titel: 'Bildungsgutschein', hinweis: 'Förderung einer Weiterbildung/Umschulung – nur nach Beratung.' },
  { schluessel: 'vermittlungsbudget', titel: 'Vermittlungsbudget', hinweis: 'Erstattung von Bewerbungs- und Reisekosten zu Vorstellungsgesprächen.' },
  { schluessel: 'veranstaltungen', titel: 'Jobmessen & Veranstaltungen', hinweis: 'Job- und Karrieremessen der Agentur.' },
]

const fahrplan: AufgabeDefinition[] = [
  { schluessel: 'arbeitssuchend_gemeldet', titel: 'Arbeitssuchend gemeldet', hinweis: 'Sobald die Kündigung absehbar ist (mind. 3 Monate vorher bzw. binnen 3 Tagen).' },
  { schluessel: 'arbeitsbescheinigung_anfordern', titel: 'Arbeitsbescheinigung anfordern', hinweis: 'Beim Arbeitgeber anfordern – er muss sie binnen 1 Woche ausstellen (elektronisch/BEA).' },
  { schluessel: 'arbeitslos_melden', titel: 'Arbeitslos melden', hinweis: 'Spätestens am 1. Tag der Arbeitslosigkeit – sonst droht eine Sperrzeit!', dringend: true },
  { schluessel: 'alg_beantragen', titel: 'ALG I beantragen', hinweis: 'Direkt nach der Arbeitslosmeldung. Bearbeitung dauert 2–6 Wochen.' },
]

const unterlagen: AufgabeDefinition[] = [
  { schluessel: 'arbeitsbescheinigung', titel: 'Arbeitsbescheinigung' },
  { schluessel: 'kuendigung', titel: 'Kündigung / Aufhebungsvertrag' },
  { schluessel: 'lebenslauf', titel: 'Tabellarischer Lebenslauf (5 Jahre)' },
  { schluessel: 'sv_ausweis', titel: 'Sozialversicherungsausweis / RV-Nummer' },
  { schluessel: 'personalausweis', titel: 'Personalausweis' },
  { schluessel: 'steuer_id', titel: 'Steuer-ID' },
  { schluessel: 'iban', titel: 'IBAN / Kontoauszug' },
  { schluessel: 'arbeitszeugnisse', titel: 'Arbeitszeugnisse' },
]
</script>

<template>
  <v-container class="py-6" style="max-width: 760px">
    <h2 class="text-h5 mb-5">Arbeitsagentur &amp; Übergang</h2>

    <TermineSection />

    <ChecklisteSection
      titel="Angebote der Agentur"
      icon="mdi-handshake-outline"
      intro="Was die Agentur anbietet – hak ab, was du schon genutzt bzw. angenommen hast."
      :punkte="angebote"
      typ="angebote"
    />

    <ChecklisteSection
      titel="ALG-Fahrplan"
      icon="mdi-map-marker-path"
      intro="Die wichtigsten Schritte zum Arbeitslosengeld – der Reihe nach abhaken."
      :punkte="fahrplan"
      typ="fahrplan"
    />

    <ChecklisteSection
      titel="Unterlagen"
      icon="mdi-file-document-multiple-outline"
      intro="Was du für den ALG-Antrag brauchst – abhaken, was du schon hast."
      :punkte="unterlagen"
      typ="unterlagen"
      fortschritt
    />
  </v-container>
</template>
