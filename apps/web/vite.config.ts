import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
  resolve: { dedupe: ['effect', 'foldkit'] },
  // The dev server cannot forward a request body through the Website Worker's
  // local service binding. Send API and socket traffic to the API Worker
  // directly; production still uses the binding.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
