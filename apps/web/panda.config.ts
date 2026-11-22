import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.ts'],
  outdir: 'styled-system',
  conditions: {
    extend: {
      hover: '&:hover',
      focus: '&:focus',
      disabled: '&:disabled',
      placeholder: '&::placeholder',
    },
  },
  theme: {
    extend: {
      breakpoints: { md: '768px' },
      tokens: {
        colors: {
          ink: { value: '#172033' },
          muted: { value: '#5b6b82' },
          paper: { value: '#f6f7f9' },
          surface: { value: '#ffffff' },
          line: { value: '#e1e6ee' },
          accent: { value: '#1f4fd8' },
          accentSoft: { value: '#eef3ff' },
          danger: { value: '#b42318' },
          dangerSoft: { value: '#fef3f2' },
          dangerLine: { value: '#fecdca' },
        },
      },
      fonts: {
        sans: { value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
        mono: { value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
      },
    },
  },
})
