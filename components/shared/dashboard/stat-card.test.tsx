import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard, deltaFor } from './stat-card'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="XP this cycle" value={418} />)
    expect(screen.getByText('XP this cycle')).toBeInTheDocument()
    expect(screen.getByText('418')).toBeInTheDocument()
  })

  it('renders no delta row when delta is omitted', () => {
    render(<StatCard label="XP this cycle" value={418} />)
    expect(screen.queryByText(/vs /)).not.toBeInTheDocument()
  })

  // Regression guard: an explicit neutral delta is a real, asserted state
  // ("no change"), distinct from omitting delta entirely.
  it('renders an explicit "no delta" state distinctly from omitting delta', () => {
    render(
      <StatCard
        label="Node members"
        value={7}
        delta={{ direction: 'flat', tone: 'neutral', text: 'No delta' }}
      />,
    )
    expect(screen.getByText('No delta')).toBeInTheDocument()
  })

  it('colors a positive-toned delta with Signal Green and shows the given arrow', () => {
    render(
      <StatCard
        label="XP this cycle"
        value={418}
        delta={{ direction: 'up', tone: 'positive', text: '12.4% vs C-11' }}
      />,
    )
    const delta = screen.getByText(/12.4% vs C-11/)
    expect(delta.className).toContain('text-signal-green')
    expect(delta.textContent).toContain('▲')
  })

  it('colors a negative-toned delta with Coral and shows the given arrow', () => {
    render(
      <StatCard
        label="Missed evaluations"
        value={4}
        delta={{ direction: 'up', tone: 'negative', text: '2 vs C-11' }}
      />,
    )
    const delta = screen.getByText(/2 vs C-11/)
    expect(delta.className).toContain('text-coral')
    expect(delta.textContent).toContain('▲')
  })

  // Regression guard for the exact bug this split was built to prevent:
  // direction and tone are independent. A metric where lower is better
  // (missed evaluations) going down is POSITIVE (green), not negative,
  // even though "down" would be coral for a metric like XP.
  it('colors a downward move green when the metric improves by going down', () => {
    render(
      <StatCard
        label="Missed evaluations"
        value={1}
        delta={{ direction: 'down', tone: 'positive', text: '1 vs C-11' }}
      />,
    )
    const delta = screen.getByText(/1 vs C-11/)
    expect(delta.className).toContain('text-signal-green')
    expect(delta.className).not.toContain('text-coral')
    expect(delta.textContent).toContain('▼')
  })

  it('labels the delta direction for assistive tech, distinct from the neutral case', () => {
    render(
      <StatCard
        label="XP this cycle"
        value={418}
        delta={{ direction: 'up', tone: 'positive', text: '12.4% vs C-11' }}
      />,
    )
    expect(screen.getByLabelText('Up 12.4% vs C-11')).toBeInTheDocument()

    render(
      <StatCard
        label="Node members"
        value={7}
        delta={{ direction: 'flat', tone: 'neutral', text: 'No delta' }}
      />,
    )
    expect(screen.getByLabelText('No delta')).toBeInTheDocument()
  })

  it('labels the card as one unit for assistive tech', () => {
    render(<StatCard label="XP this cycle" value={418} />)
    expect(screen.getByLabelText('XP this cycle: 418')).toBeInTheDocument()
  })

  it('stays flat and border-only on the dark surface, ring-bordered on light', () => {
    const { container: dark } = render(<StatCard label="XP" value={1} surface="dark" />)
    const { container: light } = render(<StatCard label="XP" value={1} surface="light" />)
    expect((dark.firstChild as HTMLElement).className).toContain('border-sidebar-border')
    expect((light.firstChild as HTMLElement).className).toContain('ring-1')
  })

  // Regression guard: Signal Green and Coral share lightness/chroma — the
  // delta needs a non-color cue, not hue alone, the same reasoning already
  // applied to StatusChip's border style and NodeMemberRow's dot ring.
  it('gives a positive or negative delta extra weight, not just color', () => {
    render(
      <StatCard
        label="XP"
        value={1}
        delta={{ direction: 'up', tone: 'positive', text: 'x' }}
      />,
    )
    expect(screen.getByText(/x$/).className).toContain('font-semibold')

    render(
      <StatCard
        label="XP"
        value={1}
        delta={{ direction: 'flat', tone: 'neutral', text: 'y' }}
      />,
    )
    expect(screen.getByText(/y$/).className).not.toContain('font-semibold')
  })

  it('falls back to an em dash for an empty string value', () => {
    render(<StatCard label="Status" value="" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('truncates the label and value instead of overflowing a narrow card', () => {
    render(<StatCard label="A very long stat label that could overflow" value={1} />)
    expect(
      screen.getByText('A very long stat label that could overflow').className,
    ).toContain('truncate')
  })
})

describe('deltaFor', () => {
  it('marks a higher-better metric increasing as positive', () => {
    expect(deltaFor('higher-better', 100, 140, 'x')).toEqual({
      direction: 'up',
      tone: 'positive',
      text: 'x',
    })
  })

  it('marks a higher-better metric decreasing as negative', () => {
    expect(deltaFor('higher-better', 140, 100, 'x')).toMatchObject({
      direction: 'down',
      tone: 'negative',
    })
  })

  // Regression guard for the exact bug the direction/tone split fixed:
  // a lower-better metric (missed evaluations) decreasing is POSITIVE,
  // even though it's a "down" direction.
  it('marks a lower-better metric decreasing as positive', () => {
    expect(deltaFor('lower-better', 4, 1, 'x')).toEqual({
      direction: 'down',
      tone: 'positive',
      text: 'x',
    })
  })

  it('marks a lower-better metric increasing as negative', () => {
    expect(deltaFor('lower-better', 1, 4, 'x')).toMatchObject({
      direction: 'up',
      tone: 'negative',
    })
  })

  it('marks no change as flat and neutral regardless of polarity', () => {
    expect(deltaFor('higher-better', 5, 5, 'x')).toEqual({
      direction: 'flat',
      tone: 'neutral',
      text: 'x',
    })
    expect(deltaFor('lower-better', 5, 5, 'x')).toMatchObject({
      direction: 'flat',
      tone: 'neutral',
    })
  })
})
