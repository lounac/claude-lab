// Die Seiten-Navigation (Router) inkl. Schutz für eingeloggte Bereiche.

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthView from '../views/AuthView.vue'
import ApplicationList from '../views/ApplicationList.vue'
import ApplicationForm from '../views/ApplicationForm.vue'

const router = createRouter({
  // createWebHistory = saubere Adressen ohne # (z. B. /auth statt /#/auth).
  history: createWebHistory(),
  routes: [
    { path: '/auth', name: 'auth', component: AuthView },
    { path: '/', name: 'list', component: ApplicationList },
    { path: '/neu', name: 'new', component: ApplicationForm },
    { path: '/:id/bearbeiten', name: 'edit', component: ApplicationForm },
    // Die Detailansicht (/:id) kommt in Schritt 16 dazu.
  ],
})

// Der "Wächter": läuft vor JEDEM Seitenwechsel.
router.beforeEach((to) => {
  const auth = useAuthStore()
  const istLoginSeite = to.name === 'auth'

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
