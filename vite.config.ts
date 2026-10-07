import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      onLog(level, log, handler) {
        if (log.code === 'INVALID_ANNOTATION') return;
        handler(level, log);
      },
      output: {
        // Only pin the stable core; everything else is split by Rollup along lazy
        // route boundaries. A catch-all 'vendor' chunk forces every library onto the
        // initial load (login page included) and defeats React.lazy.
        // Match exact package roots: a loose '/react/' would also catch '@fullcalendar/react/'
        // and '@emotion/react/', and rolldown then drags their dependencies into this chunk.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
        },
      },
    },
  },
})

