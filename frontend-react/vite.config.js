import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone top-level deployment (its own Vercel project/domain) — auth
// handoff from the old frontend arrives via a URL query param instead of
// shared same-origin localStorage. See src/config/urls.js.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000, // already whitelisted in backend CORS
    strictPort: true,
  },
})
