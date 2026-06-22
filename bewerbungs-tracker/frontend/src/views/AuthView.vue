<script setup lang="ts">
import { ref } from 'vue'
import LoginForm from '../components/auth/LoginForm.vue'
import RegisterForm from '../components/auth/RegisterForm.vue'

// Welcher Reiter ist aktiv: 'login' oder 'register'.
const tab = ref('login')
</script>

<template>
  <v-container class="py-8">
    <v-card class="mx-auto pa-4" max-width="440">
      <v-card-title class="text-center text-h6">Aspira</v-card-title>

      <!-- Umschalt-Reiter zwischen Anmelden und Registrieren -->
      <v-tabs v-model="tab" grow class="mb-4">
        <v-tab value="login">Anmelden</v-tab>
        <v-tab value="register">Registrieren</v-tab>
      </v-tabs>

      <!-- Zeigt je nach Reiter das passende Formular -->
      <v-window v-model="tab">
        <v-window-item value="login">
          <LoginForm />
        </v-window-item>
        <v-window-item value="register">
          <RegisterForm />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>
