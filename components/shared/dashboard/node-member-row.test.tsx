import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NodeMemberRow } from './node-member-row'

const base = {
  name: 'Sam Rivera',
  avatarUrl: '',
  tier: 'Contributor' as const,
  xp: 240,
  evaluationStages: ['completed', 'completed', 'missed'] as const,
}

describe('NodeMemberRow', () => {
  it('renders the member name', () => {
    render(<NodeMemberRow {...base} />)
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument()
  })

  it('renders the avatar fallback with the alt text set to the name', () => {
    render(<NodeMemberRow {...base} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders the TierBadge for the given tier', () => {
    render(<NodeMemberRow {...base} />)
    expect(screen.getByLabelText('Tier: Contributor')).toBeInTheDocument()
  })

  it('renders the XP number, labeled for assistive tech', () => {
    render(<NodeMemberRow {...base} />)
    expect(screen.getAllByText('240').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('XP: 240')).toBeInTheDocument()
  })

  // Regression guard: XP shortens below sm rather than disappearing, the
  // same degrade-don't-drop rule EvaluationStageRow's date field follows —
  // both the full and abbreviated forms stay in the DOM, toggled by CSS.
  it('renders both the full and abbreviated XP for narrow viewports', () => {
    render(<NodeMemberRow {...base} xp={1240} />)
    expect(screen.getByText('1240')).toBeInTheDocument()
    expect(screen.getByText('1.2k')).toBeInTheDocument()
    expect(screen.getByLabelText('XP: 1240')).toBeInTheDocument()
  })

  it('labels the member identity group', () => {
    render(<NodeMemberRow {...base} />)
    expect(screen.getByLabelText('Member: Sam Rivera')).toBeInTheDocument()
  })

  // Regression guard: a missed stage must never be indistinguishable from a
  // rollup completed-count — the summary names each stage's own status.
  it('summarizes every stage status, including a missed one, for assistive tech', () => {
    render(<NodeMemberRow {...base} />)
    expect(
      screen.getByLabelText(
        'Evaluations: Stage 1 completed, Stage 2 completed, Stage 3 · Node Leader missed',
      ),
    ).toBeInTheDocument()
  })

  it('renders exactly 3 evaluation-stage dots', () => {
    const { container } = render(<NodeMemberRow {...base} />)
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(3)
  })

  // Regression guard: the eval indicator must read as visually distinct
  // from TierBadge's tick bars sitting in the same row — dots, not bars.
  it('colors each dot by its own stage status, not a single rollup color', () => {
    const { container } = render(<NodeMemberRow {...base} />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots[0]?.className).toContain('bg-signal-green')
    expect(dots[1]?.className).toContain('bg-signal-green')
    expect(dots[2]?.className).toContain('bg-coral')
  })

  it('renders a neutral dot for a pending or scheduled stage', () => {
    const { container } = render(
      <NodeMemberRow
        {...base}
        evaluationStages={['pending', 'scheduled', 'completed']}
      />,
    )
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots[0]?.className).not.toContain('bg-signal-green')
    expect(dots[0]?.className).not.toContain('bg-coral')
  })

  // Regression guard: Signal Green and Coral share lightness/chroma — the
  // missed dot needs a non-color cue, not hue alone, at a size too small
  // for StatusChip's own dashed-border treatment to read cleanly.
  it('gives only the missed-stage dot a ring, not the completed or pending ones', () => {
    const { container } = render(<NodeMemberRow {...base} />)
    const dots = container.querySelectorAll('.rounded-full')
    expect(dots[0]?.className).not.toContain('ring-')
    expect(dots[1]?.className).not.toContain('ring-')
    expect(dots[2]?.className).toContain('ring-2')
  })

  it('renders as a plain div, not a link, when no href is given', () => {
    const { container } = render(<NodeMemberRow {...base} />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('renders as a link when href is given', () => {
    render(<NodeMemberRow {...base} href="/dashboard/admin/members/u1" />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/dashboard/admin/members/u1',
    )
  })

  it('only applies the hover treatment when the row is a link', () => {
    const { container: staticRow } = render(<NodeMemberRow {...base} />)
    expect((staticRow.firstChild as HTMLElement).className).not.toContain('hover:')

    const { container: linkedRow } = render(
      <NodeMemberRow {...base} href="/dashboard/admin/members/u1" />,
    )
    expect((linkedRow.firstChild as HTMLElement).className).toContain('hover:')
  })

  it('only shows a focus ring when the row is a link', () => {
    const { container: staticRow } = render(<NodeMemberRow {...base} />)
    expect((staticRow.firstChild as HTMLElement).className).not.toContain(
      'focus-visible:',
    )

    const { container: linkedRow } = render(
      <NodeMemberRow {...base} href="/dashboard/admin/members/u1" />,
    )
    expect((linkedRow.firstChild as HTMLElement).className).toContain('focus-visible:')
  })

  // Regression guard: without an explicit label, a link's accessible name
  // concatenates every descendant's own aria-label into one run-on string,
  // repeated for every row in a list — the row needs its own concise name.
  it('gives the linked row its own concise accessible name instead of concatenating every field', () => {
    render(<NodeMemberRow {...base} href="/dashboard/admin/members/u1" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAccessibleName('Sam Rivera, Contributor, 240 XP, view member')
  })

  it('threads the surface prop through to the avatar fallback', () => {
    const { container } = render(<NodeMemberRow {...base} surface="light" />)
    const initial = screen.getByText('S')
    expect(initial.className).toContain('bg-muted')
    expect(container).toBeTruthy()
  })

  // Regression guard for the Bordered Rows template EvaluationStageRow
  // established: same fixed height, same bottom-only divider.
  it('holds the calibrated 46px row height and a bottom-only border', () => {
    const { container } = render(<NodeMemberRow {...base} />)
    const row = container.firstChild as HTMLElement
    expect(row.className).toContain('h-[46px]')
    const classTokens = row.className.split(/\s+/)
    expect(classTokens).toContain('border-b')
    expect(classTokens).not.toContain('border')
  })

  it('switches border/text tokens for the light surface', () => {
    const { container } = render(<NodeMemberRow {...base} surface="light" />)
    const row = container.firstChild as HTMLElement
    expect(row.className).toContain('border-border')
    expect(row.className).not.toContain('border-sidebar-border')
  })
})
