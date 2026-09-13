import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { AuthContextTestProvider } from './auth-harness'
import { DashboardThemeProvider } from '@/lib/dashboard-theme-context'
import type { UserRecord } from '@/types/pocketbase'

/**
 * Shared render helper. Every component test should use this rather than
 * calling Testing Library's `render` directly, so providers are wired the same
 * way everywhere and adding a future provider is a one-line change here.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    user = null,
    isLoading = false,
    ...options
  }: RenderOptions & { user?: UserRecord | null; isLoading?: boolean } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContextTestProvider user={user} isLoading={isLoading}>
        <DashboardThemeProvider>{children}</DashboardThemeProvider>
      </AuthContextTestProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

export * from '@testing-library/react'
