<script setup lang="ts">
// Login-Seite. Eine Registrierung gibt es bewusst nicht:
// Konten werden im Supabase-Dashboard angelegt (Projekt wird mit Sapora geteilt).
import LoginForm from '../components/auth/LoginForm.vue'
</script>

<template>
  <v-container class="py-8">
    <v-card class="mx-auto pa-4" max-width="440">
      <v-card-title class="text-center text-h6 mb-2">Aspira</v-card-title>
      <LoginForm />
    </v-card>
  </v-container>
</template>
