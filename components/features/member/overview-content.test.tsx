import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders as renderOverview } from '@/test/render'
import { OverviewContent } from './overview-content'

const EVENTS = [
  {
    id: 'ev-1',
    title: 'Winter Sprint',
    starts_at: '2027-03-14T15:00:00.000Z',
    ends_at: null,
  },
]

describe('OverviewContent', () => {
  it('renders the node name when present', () => {
    renderOverview(
      <OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />,
    )
    expect(screen.getByText('Ignition')).toBeInTheDocument()
  })

  it('omits the node name line entirely when there is no node', () => {
    renderOverview(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.queryByText('Ignition')).not.toBeInTheDocument()
  })

  // Regression guard: a bare node name read like a stray heading with no
  // indication of what it was — the label disambiguates it.
  it('labels the node name instead of showing it bare', () => {
    renderOverview(
      <OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />,
    )
    expect(screen.getByText('Node')).toBeInTheDocument()
    expect(screen.getByText('Ignition')).toBeInTheDocument()
  })

  it('shows the raw XP total as its own large readout above the progress bar', () => {
    renderOverview(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.getByText('240')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders XpBar when xp is a number, including 0', () => {
    renderOverview(<OverviewContent nodeName={null} xp={0} evals={null} events={[]} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows the no-cycle empty state when xp is null', () => {
    renderOverview(<OverviewContent nodeName={null} xp={null} evals={null} events={[]} />)
    expect(screen.getByText('Nothing earned yet')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows all 3 pipeline stages in a fixed order, even with a sparse evals array', () => {
    renderOverview(
      <OverviewContent
        nodeName={null}
        xp={0}
        evals={[{ stage: 'standard_2', status: 'completed' }]}
        events={[]}
      />,
    )
    expect(screen.getByText('Stage 1')).toBeInTheDocument()
    expect(screen.getByText('Stage 2')).toBeInTheDocument()
    expect(screen.getByText('Stage 3 · Node Leader')).toBeInTheDocument()
  })

  // Regression guard: a stage with no evaluations row at all must not be
  // rendered as a real EvalStatus (e.g. "pending") — that would assert a
  // fact node/me never actually confirmed.
  it('shows "No record yet" for a stage with no matching entry, not a fabricated status', () => {
    renderOverview(
      <OverviewContent
        nodeName={null}
        xp={0}
        evals={[{ stage: 'standard_1', status: 'completed' }]}
        events={[]}
      />,
    )
    expect(screen.getByLabelText('Status: completed')).toBeInTheDocument()
    expect(screen.getAllByText('No record yet')).toHaveLength(2)
    expect(screen.queryByLabelText('Status: pending')).not.toBeInTheDocument()
  })

  it('shows the not-in-a-node empty state when evals is null, independent of xp', () => {
    renderOverview(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.getByText('Not in a node yet')).toBeInTheDocument()
    // The XP section is unaffected by the missing node.
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders each upcoming event with a formatted date', () => {
    renderOverview(
      <OverviewContent nodeName={null} xp={0} evals={null} events={EVENTS} />,
    )
    expect(screen.getByText('Winter Sprint')).toBeInTheDocument()
  })

  it('shows the no-events empty state when the list is empty', () => {
    renderOverview(<OverviewContent nodeName={null} xp={0} evals={null} events={[]} />)
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
  })

  // Regression guard: the box-drawing row dividers are decorative structure,
  // not content — a screen reader must never read out individual divider
  // characters. Verified directly, not just asserted in a comment.
  it('excludes the box-drawing row dividers from the accessibility tree', () => {
    renderOverview(
      <OverviewContent
        nodeName={null}
        xp={0}
        evals={[{ stage: 'standard_1', status: 'completed' }]}
        events={EVENTS}
      />,
    )

    const corners = ['┌', '┐', '├', '┤', '└', '┘']
    corners.forEach((glyph) => {
      const matches = screen.getAllByText(glyph)
      expect(matches.length).toBeGreaterThan(0)
      matches.forEach((el) => expect(el.closest('[aria-hidden="true"]')).not.toBeNull())
    })

    const fills = screen.getAllByText('─'.repeat(300))
    expect(fills.length).toBeGreaterThan(0)
    fills.forEach((el) => expect(el.closest('[aria-hidden="true"]')).not.toBeNull())

    const sides = screen.getAllByText('│')
    expect(sides.length).toBeGreaterThan(0)
    sides.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'))

    // The real content next to those dividers stays fully accessible.
    expect(screen.getByLabelText('Stage: Stage 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Event: Winter Sprint')).toBeInTheDocument()
  })

  // Regression guard: the dashboard theme defaults to dark
  // (lib/dashboard-theme-context.tsx), but this component must stay
  // genuinely surface-aware — matching StatusChip/Field/EmptyState — rather
  // than hardcoding dark-only tokens.
  it('defaults to the dark-surface palette', () => {
    renderOverview(
      <OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />,
    )
    expect(screen.getByText('Ignition').className).toContain('text-sidebar-foreground')
    expect(screen.getByText('Ignition').className).not.toContain('text-foreground')
  })

  it('uses the light-surface palette when surface="light" is explicit', () => {
    renderOverview(
      <OverviewContent
        nodeName="Ignition"
        xp={240}
        evals={[{ stage: 'standard_1', status: 'completed' }]}
        events={EVENTS}
        surface="light"
      />,
    )

    expect(screen.getByText('Ignition').className).toContain('text-foreground')
    expect(screen.getByText('Ignition').className).not.toContain('sidebar-foreground')

    // The box-drawing dividers swap tone too, not just the row content.
    const sides = screen.getAllByText('│')
    sides.forEach((el) => expect(el.className).toContain('text-muted-foreground/60'))
  })

  // Regression guard: the real /dashboard/overview page is a Server
  // Component and can never pass an explicit surface prop (it can't know
  // the client's localStorage), so this must fall back to the live
  // dashboard-theme context — not a hardcoded default — or the toggle would
  // have no visible effect on the real page at all.
  it('falls back to the live dashboard theme when no explicit surface is given', async () => {
    localStorage.setItem('argc:dashboard-theme', 'light')

    renderOverview(
      <OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />,
    )

    await waitFor(() =>
      expect(screen.getByText('Ignition').className).toContain('text-foreground'),
    )

    localStorage.clear()
  })
})
