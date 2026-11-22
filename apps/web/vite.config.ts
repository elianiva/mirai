import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
  resolve: { dedupe: ['effect', 'foldkit'] },
})
