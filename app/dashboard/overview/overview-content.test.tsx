import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    render(<OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />)
    expect(screen.getByText('Ignition')).toBeInTheDocument()
  })

  it('omits the node name line entirely when there is no node', () => {
    render(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.queryByText('Ignition')).not.toBeInTheDocument()
  })

  // Regression guard: a bare node name read like a stray heading with no
  // indication of what it was — the label disambiguates it.
  it('labels the node name instead of showing it bare', () => {
    render(<OverviewContent nodeName="Ignition" xp={240} evals={[]} events={[]} />)
    expect(screen.getByText('Node')).toBeInTheDocument()
    expect(screen.getByText('Ignition')).toBeInTheDocument()
  })

  it('shows the raw XP total as its own large readout above the progress bar', () => {
    render(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.getByText('240')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders XpBar when xp is a number, including 0', () => {
    render(<OverviewContent nodeName={null} xp={0} evals={null} events={[]} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows the no-cycle empty state when xp is null', () => {
    render(<OverviewContent nodeName={null} xp={null} evals={null} events={[]} />)
    expect(screen.getByText('Nothing earned yet')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows all 3 pipeline stages in a fixed order, even with a sparse evals array', () => {
    render(
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
    render(
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
    render(<OverviewContent nodeName={null} xp={240} evals={null} events={[]} />)
    expect(screen.getByText('Not in a node yet')).toBeInTheDocument()
    // The XP section is unaffected by the missing node.
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders each upcoming event with a formatted date', () => {
    render(<OverviewContent nodeName={null} xp={0} evals={null} events={EVENTS} />)
    expect(screen.getByText('Winter Sprint')).toBeInTheDocument()
  })

  it('shows the no-events empty state when the list is empty', () => {
    render(<OverviewContent nodeName={null} xp={0} evals={null} events={[]} />)
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
  })
})
