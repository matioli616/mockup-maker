import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Testes de unidade pra lógica pura de lib/ (sem DOM/canvas) — ver
// vitest.config.ts / package.json "test". Componentes React e código que
// depende de canvas/localStorage/IndexedDB ficam fora do escopo por ora
// (exigiriam mocks pesados pra pouco retorno); o valor está em travar a
// lógica de negócio (migração de estado, geometria de export, CSV).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
