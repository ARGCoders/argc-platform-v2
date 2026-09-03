import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvaluationStageRow } from './evaluation-stage-row'
import { EVAL_STAGE_LABELS } from '@/lib/constants'

const base = {
  stage: 'standard_1' as const,
  status: 'scheduled' as const,
  evaluatorName: 'Sam Rivera',
  scheduledAt: '2026-08-19T00:00:00.000Z',
  score: null,
}

describe('EvaluationStageRow', () => {
  it.each(Object.entries(EVAL_STAGE_LABELS))(
    'renders the label for %s',
    (stage, label) => {
      render(<EvaluationStageRow {...base} stage={stage as typeof base.stage} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    },
  )

  // Regression guard: stage classifies which of 3 fixed pipeline stages
  // this is — Mono-Reports territory, the same job RoleBadge/TierBadge/
  // StatusChip do — not the row's "headline" content, however prominent
  // its position. Being enum-sourced doesn't put it on the sans side.
  it('renders the stage label in mono, not sans', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByText('Stage 1').className).toContain('font-mono')
  })

  it('renders the evaluator name when assigned', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument()
  })

  it('falls back to "Unassigned" when there is no evaluator', () => {
    render(<EvaluationStageRow {...base} evaluatorName={null} />)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('formats the scheduled date as YYYY-MM-DD', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByText('2026-08-19')).toBeInTheDocument()
  })

  it('renders a dash when there is no scheduled date', () => {
    render(<EvaluationStageRow {...base} scheduledAt={null} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders the score when the stage is complete', () => {
    render(<EvaluationStageRow {...base} status="completed" score={82} />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  it('renders a dash for the score before completion', () => {
    render(<EvaluationStageRow {...base} score={null} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders the eval StatusChip with the given status', () => {
    render(<EvaluationStageRow {...base} status="missed" />)
    expect(screen.getByLabelText('Status: missed')).toBeInTheDocument()
  })

  // Regression guard for the P0 finding: every field but StatusChip (which
  // already labels itself) needs its own accessible name, matching how
  // RoleBadge/TierBadge/StatusChip disambiguate themselves in a dense row.
  it('labels every field for assistive tech, distinguishing the two null states', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByLabelText('Stage: Stage 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Evaluator: Sam Rivera')).toBeInTheDocument()
    expect(screen.getByLabelText('Scheduled: 2026-08-19')).toBeInTheDocument()
    expect(screen.getByLabelText('Not yet scored')).toBeInTheDocument()
  })

  it('labels the two null states distinctly instead of two bare dashes', () => {
    render(
      <EvaluationStageRow
        {...base}
        evaluatorName={null}
        scheduledAt={null}
        score={null}
      />,
    )
    expect(screen.getByLabelText('Evaluator: unassigned')).toBeInTheDocument()
    expect(screen.getByLabelText('Not yet scheduled')).toBeInTheDocument()
    expect(screen.getByLabelText('Not yet scored')).toBeInTheDocument()
  })

  // Regression guard: the mobile column degrades to a shorter format
  // instead of disappearing — a node leader needs the date on their phone.
  it('renders an abbreviated date for narrow viewports instead of hiding it', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByText('2026-08-19')).toBeInTheDocument()
    expect(screen.getByText('08-19')).toBeInTheDocument()
  })

  // Regression guard: a UTC-midnight date must not shift a day in a
  // non-UTC test environment.
  it('formats the date in UTC regardless of the local timezone', () => {
    render(<EvaluationStageRow {...base} scheduledAt="2026-01-01T00:00:00.000Z" />)
    expect(screen.getByText('2026-01-01')).toBeInTheDocument()
  })

  // Regression guard: verified against RoleBadge/TierBadge, whose identical
  // label spans both carry whitespace-nowrap — this row's own JSDoc claims
  // the same construction, so it needs the same protection.
  it('never wraps the stage label, matching RoleBadge/TierBadge', () => {
    render(<EvaluationStageRow {...base} stage="eval_plus_node_leader" />)
    expect(screen.getByText('Stage 3 · Node Leader').className).toContain(
      'whitespace-nowrap',
    )
  })

  // Regression guard: verified against DashboardSidebar's Identity name,
  // which this row's JSDoc claims to match.
  it('renders the evaluator name at the same weight as Identity', () => {
    render(<EvaluationStageRow {...base} />)
    expect(screen.getByText('Sam Rivera').className).toContain('font-medium')
  })

  // Regression guard for the reusable bordered-row template this establishes:
  // a fixed height a future LoadingRow skeleton can match exactly.
  it('holds the calibrated 46px row height', () => {
    const { container } = render(<EvaluationStageRow {...base} />)
    expect(container.firstChild).toHaveClass('h-[46px]')
  })

  // Regression guard: a bottom-only divider, not a full box — the outer
  // edges belong to whatever wraps a list of these, not the row itself.
  it('draws only a bottom border, never a full box', () => {
    const { container } = render(<EvaluationStageRow {...base} />)
    const row = container.firstChild as HTMLElement
    const classTokens = row.className.split(/\s+/)
    expect(classTokens).toContain('border-b')
    expect(classTokens).not.toContain('border')
  })

  it('is read-only: no interactive role or handler', () => {
    const { container } = render(<EvaluationStageRow {...base} />)
    const row = container.firstChild as HTMLElement
    expect(row.tagName).toBe('DIV')
    expect(row.getAttribute('role')).toBeNull()
  })

  it('switches border/text tokens for the light surface', () => {
    const { container } = render(<EvaluationStageRow {...base} surface="light" />)
    const row = container.firstChild as HTMLElement
    expect(row.className).toContain('border-border')
    expect(row.className).not.toContain('border-sidebar-border')
  })
})
