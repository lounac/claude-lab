import { defineConfig } from 'vitest/config'

// Test-Konfiguration (getrennt von vite.config.ts, das die App baut).
export default defineConfig({
  test: {
    // jsdom stellt Browser-APIs wie localStorage in den Tests bereit.
    environment: 'jsdom',
  },
})
