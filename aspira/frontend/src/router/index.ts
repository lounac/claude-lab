// Die Seiten-Navigation (Router) inkl. Schutz für eingeloggte Bereiche.

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { startetMitPasswortLink } from '../lib/supabase'
import AuthView from '../views/AuthView.vue'
import PasswortNeuView from '../views/PasswortNeuView.vue'
import ApplicationList from '../views/ApplicationList.vue'
import ApplicationForm from '../views/ApplicationForm.vue'
import ApplicationDetail from '../views/ApplicationDetail.vue'
import CvView from '../views/CvView.vue'
import UeberAspiraView from '../views/UeberAspiraView.vue'
import AgenturView from '../views/AgenturView.vue'

const router = createRouter({
  // createWebHistory = saubere Adressen ohne # (z. B. /auth statt /#/auth).
  history: createWebHistory(),
  routes: [
    { path: '/auth', name: 'auth', component: AuthView },
    { path: '/passwort-neu', name: 'passwort-neu', component: PasswortNeuView },
    { path: '/', name: 'list', component: ApplicationList },
    { path: '/cv', name: 'cv', component: CvView },
    { path: '/ueber', name: 'ueber', component: UeberAspiraView },
    { path: '/agentur', name: 'agentur', component: AgenturView },
    { path: '/neu', name: 'new', component: ApplicationForm },
    { path: '/:id/bearbeiten', name: 'edit', component: ApplicationForm },
    { path: '/:id', name: 'detail', component: ApplicationDetail },
  ],
})

// Wurde die App über den Link aus der "Passwort vergessen"-Mail geöffnet, geht es
// einmalig direkt zu "Neues Passwort" – auch falls Supabase auf die Startseite geleitet hat.
let passwortLinkOffen = startetMitPasswortLink

// Der "Wächter": läuft vor JEDEM Seitenwechsel.
router.beforeEach((to) => {
  const auth = useAuthStore()
  const istLoginSeite = to.name === 'auth'

  if (passwortLinkOffen && auth.user) {
    passwortLinkOffen = false
    if (to.name !== 'passwort-neu') return { name: 'passwort-neu' }
  }

  // "Neues Passwort" ohne Anmeldung = Link abgelaufen/ungültig → Login mit Hinweis.
  if (!auth.user && to.name === 'passwort-neu') {
    return { name: 'auth', query: { hinweis: 'link-abgelaufen' } }
  }

  // Nicht eingeloggt und will auf eine geschützte Seite? → ab zum Login.
  if (!auth.user && !istLoginSeite) {
    return { name: 'auth' }
  }

  // Schon eingeloggt und will auf die Login-Seite? → direkt zur Liste.
  if (auth.user && istLoginSeite) {
    return { name: 'list' }
  }

  // Sonst: Seitenwechsel erlauben.
  return true
})

export default router
