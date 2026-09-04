import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CycleSelector } from './cycle-selector'
import type { AdvancementCycleRecord } from '@/types/pocketbase'

function cycle(overrides: Partial<AdvancementCycleRecord>): AdvancementCycleRecord {
  return {
    id: overrides.id ?? 'c',
    label: 'Cycle',
    slug: 'cycle',
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: '2026-06-01T00:00:00.000Z',
    status: 'active',
    created_by: 'user-1',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const cycles: AdvancementCycleRecord[] = [
  cycle({ id: 'upcoming-1', label: 'Fall 2026', slug: 'fall-2026', status: 'upcoming' }),
  cycle({ id: 'active-1', label: 'Spring 2026', slug: 'spring-2026', status: 'active' }),
  cycle({ id: 'closed-1', label: 'Fall 2025', slug: 'fall-2025', status: 'closed' }),
  cycle({ id: 'closed-2', label: 'Spring 2025', slug: 'spring-2025', status: 'closed' }),
]

function renderSelector(props: Partial<React.ComponentProps<typeof CycleSelector>> = {}) {
  return render(
    <CycleSelector
      cycles={cycles}
      currentCycleId="active-1"
      hrefFor={(c) => `/dashboard/xp?cycle=${c.slug}`}
      {...props}
    />,
  )
}

describe('CycleSelector', () => {
  it("shows the current cycle's label on the closed trigger", () => {
    renderSelector()
    expect(screen.getByRole('button', { name: /Spring 2026/i })).toBeInTheDocument()
  })

  it('opens the panel and lists every cycle with its label and status', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    expect(screen.getByText('Fall 2026')).toBeInTheDocument()
    expect(screen.getByText('Spring 2025')).toBeInTheDocument()
    expect(screen.getAllByText('active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('closed').length).toBe(2)
    expect(screen.getByText('upcoming')).toBeInTheDocument()
  })

  it('renders active/closed cycles as real links to the caller-built href', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    expect(screen.getByRole('link', { name: /Fall 2025/i })).toHaveAttribute(
      'href',
      '/dashboard/xp?cycle=fall-2025',
    )
  })

  it('renders an upcoming cycle as a disabled, non-link button', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    expect(screen.queryByRole('link', { name: /Fall 2026/i })).not.toBeInTheDocument()
    const upcomingButton = screen.getByRole('button', { name: /Fall 2026/i })
    expect(upcomingButton).toBeDisabled()
  })

  it('marks the selected cycle with aria-current', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    expect(screen.getByRole('link', { name: /Spring 2026/i })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('link', { name: /Fall 2025/i })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('moves roving focus down through selectable cycles with ArrowDown, skipping the disabled one', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    // Initial focus lands on the current selection (Spring 2026).
    expect(screen.getByRole('link', { name: /Spring 2026/i })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /Fall 2025/i })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /Spring 2025/i })).toHaveFocus()

    // Wraps back to the first selectable option (upcoming stays unreachable by arrow key too).
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /Spring 2026/i })).toHaveFocus()
  })

  it('jumps to the first and last selectable cycles with Home and End', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))

    await user.keyboard('{End}')
    expect(screen.getByRole('link', { name: /Spring 2025/i })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('link', { name: /Spring 2026/i })).toHaveFocus()
  })

  it('closes the panel when a cycle link is clicked', async () => {
    const user = userEvent.setup()
    renderSelector()
    await user.click(screen.getByRole('button', { name: /Spring 2026/i }))
    await user.click(screen.getByRole('link', { name: /Fall 2025/i }))

    expect(screen.queryByText('Spring 2025')).not.toBeInTheDocument()
  })

  it('switches border/text tokens for the light surface', async () => {
    const user = userEvent.setup()
    renderSelector({ surface: 'light' })
    const trigger = screen.getByRole('button', { name: /Spring 2026/i })
    expect(trigger.className).toContain('border-border')

    await user.click(trigger)
    expect(
      screen.getByRole('link', { name: /Fall 2025/i }).closest('[class*="bg-card"]'),
    ).toBeTruthy()
  })
})
