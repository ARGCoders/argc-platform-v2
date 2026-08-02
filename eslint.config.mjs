import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated ASCII art data — thousands of lines, nothing to lint.
    'lib/shape-1.ts',
    'lib/shape-2.ts',
    'coverage/**',
  ]),
  // MUST be last: turns off every stylistic rule that would fight Prettier.
  prettier,
])

export default eslintConfig
