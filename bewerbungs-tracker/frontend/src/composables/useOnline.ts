// Kleiner Helfer: meldet reaktiv, ob der Browser gerade online oder offline ist.
import { ref, onMounted, onUnmounted } from 'vue'

export function useOnline() {
  const online = ref(navigator.onLine)

  function aktualisieren() {
    online.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', aktualisieren)
    window.addEventListener('offline', aktualisieren)
  })
  onUnmounted(() => {
    window.removeEventListener('online', aktualisieren)
    window.removeEventListener('offline', aktualisieren)
  })

  return { online }
}
