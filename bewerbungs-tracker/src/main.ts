import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Vuetify (UI-Framework) einrichten
import 'vuetify/styles' // Grund-Styles von Vuetify
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css' // Icon-Schriftart (mdi-...)

// Pinia (zentrale Speicher) + Login-Speicher
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth'

// Router (Seiten-Navigation)
import router from './router'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
  },
})

const app = createApp(App)
app.use(createPinia()) // muss VOR der ersten Store-Nutzung passieren
app.use(vuetify)

// Aktuelle Login-Session laden, BEVOR der Router den ersten Schutz prüft.
await useAuthStore().init()

app.use(router)
app.mount('#app')
