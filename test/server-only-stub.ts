/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * The real package throws on import outside a React Server Component, which is
 * exactly what we want in the Next build and exactly what breaks tests. The
 * alias is declared in vitest.config.ts and applies only to the test runner.
 */
export {}
