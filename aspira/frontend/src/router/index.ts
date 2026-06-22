// Die Seiten-Navigation (Router) inkl. Schutz für eingeloggte Bereiche.

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthView from '../views/AuthView.vue'
import ApplicationList from '../views/ApplicationList.vue'
import ApplicationForm from '../views/ApplicationForm.vue'
import ApplicationDetail from '../views/ApplicationDetail.vue'
import CvView from '../views/CvView.vue'

const router = createRouter({
  // createWebHistory = saubere Adressen ohne # (z. B. /auth statt /#/auth).
  history: createWebHistory(),
  routes: [
    { path: '/auth', name: 'auth', component: AuthView },
    { path: '/', name: 'list', component: ApplicationList },
    { path: '/cv', name: 'cv', component: CvView },
    { path: '/neu', name: 'new', component: ApplicationForm },
    { path: '/:id/bearbeiten', name: 'edit', component: ApplicationForm },
    { path: '/:id', name: 'detail', component: ApplicationDetail },
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
