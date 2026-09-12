import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DASHBOARD_THEME_KEY,
  DashboardThemeProvider,
  useDashboardTheme,
} from './dashboard-theme-context'

function Consumer() {
  const { surface, toggle } = useDashboardTheme()
  return (
    <div>
      <span data-testid="surface">{surface}</span>
      <button onClick={toggle}>Toggle</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('DashboardThemeProvider', () => {
  it('defaults to dark on first render, matching the server-rendered default', () => {
    render(
      <DashboardThemeProvider>
        <Consumer />
      </DashboardThemeProvider>,
    )
    expect(screen.getByTestId('surface')).toHaveTextContent('dark')
  })

  it('corrects to light after mount when localStorage already says so', async () => {
    localStorage.setItem(DASHBOARD_THEME_KEY, 'light')

    render(
      <DashboardThemeProvider>
        <Consumer />
      </DashboardThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('surface')).toHaveTextContent('light'))
  })

  it('toggles and persists the new value', async () => {
    const user = userEvent.setup()
    render(
      <DashboardThemeProvider>
        <Consumer />
      </DashboardThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle' }))

    expect(screen.getByTestId('surface')).toHaveTextContent('light')
    expect(localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Toggle' }))

    expect(screen.getByTestId('surface')).toHaveTextContent('dark')
    expect(localStorage.getItem(DASHBOARD_THEME_KEY)).toBe('dark')
  })

  it('throws when used outside the provider, surfacing the mistake immediately', () => {
    // Expected: React logs an error boundary-style message for this render;
    // suppress the console noise for this one assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(
      'useDashboardTheme must be used within a <DashboardThemeProvider>',
    )
    spy.mockRestore()
  })
})
