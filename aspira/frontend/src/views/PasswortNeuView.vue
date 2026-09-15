<script setup lang="ts">
// Neues Passwort festlegen – Ziel des Links aus der "Passwort vergessen"-Mail.
// Der Link meldet automatisch an; der Router lässt nur angemeldete Personen hierher.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { uebersetzeAuthFehler } from '../lib/authErrors'

const auth = useAuthStore()
const router = useRouter()

const passwort = ref('')
const wiederholung = ref('')
const fehler = ref('')
const laeuft = ref(false)
const fertig = ref(false)

async function speichern() {
  if (passwort.value.length < 6) {
    fehler.value = 'Das Passwort muss mindestens 6 Zeichen lang sein.'
    return
  }
  if (passwort.value !== wiederholung.value) {
    fehler.value = 'Die beiden Passwörter stimmen nicht überein.'
    return
  }
  fehler.value = ''
  laeuft.value = true
  try {
    await auth.passwortSetzen(passwort.value)
    passwort.value = ''
    wiederholung.value = ''
    fertig.value = true
  } catch (e) {
    fehler.value = uebersetzeAuthFehler(e instanceof Error ? e.message : String(e))
  } finally {
    laeuft.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <v-card class="mx-auto pa-4" max-width="440">
      <v-card-title class="text-center text-h6">Neues Passwort</v-card-title>
      <v-card-text>
        <template v-if="!fertig">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Angemeldet als <strong>{{ auth.user?.email }}</strong>. Lege jetzt dein neues
            Passwort fest.
          </p>
          <v-form @submit.prevent="speichern">
            <v-text-field
              v-model="passwort"
              label="Neues Passwort"
              type="password"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock-outline"
              hint="Mindestens 6 Zeichen"
              persistent-hint
              class="mb-2"
            />
            <v-text-field
              v-model="wiederholung"
              label="Neues Passwort wiederholen"
              type="password"
              autocomplete="new-password"
              prepend-inner-icon="mdi-lock-check-outline"
            />

            <v-alert v-if="fehler" type="error" density="compact" class="mb-3">
              {{ fehler }}
            </v-alert>

            <v-btn type="submit" color="primary" block :loading="laeuft">
              Passwort speichern
            </v-btn>
          </v-form>
        </template>

        <template v-else>
          <v-alert type="success" density="compact" class="mb-4">
            Dein neues Passwort ist gespeichert.
          </v-alert>
          <v-btn color="primary" block @click="router.push('/')">Zu meinen Stellen</v-btn>
        </template>
      </v-card-text>
    </v-card>
  </v-container>
</template>
