import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the "@/*" -> "./*" mapping in tsconfig.json.
      '@': root,
      /**
       * `server-only` throws by design when imported outside a React Server
       * Component, which would fail every test touching lib/auth, lib/env,
       * lib/pocketbase-server or lib/sanitize. Point it at an empty module so
       * those files are importable under the test runner. The real guard still
       * applies to the Next build — this alias is scoped to Vitest.
       */
      'server-only': fileURLToPath(
        new URL('./test/server-only-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only measure code we author; generated and config files add noise.
      include: ['app/**', 'components/**', 'lib/**', 'proxy.ts'],
      exclude: ['components/ui/**', 'lib/shape-1.ts', 'lib/shape-2.ts', '**/*.d.ts'],
    },
  },
})
