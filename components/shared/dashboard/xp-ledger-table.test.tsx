import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { XpLedgerTable, type XpLedgerEntry } from './xp-ledger-table'

const entries: XpLedgerEntry[] = [
  {
    id: '1',
    createdAt: '2026-08-19T00:00:00.000Z',
    category: 'evaluation_on_time',
    amount: 25,
    awardedByName: null,
  },
  {
    id: '2',
    createdAt: '2026-08-11T00:00:00.000Z',
    category: 'event_organized',
    amount: -10,
    awardedByName: 'Priya Nasser',
  },
  {
    id: '3',
    createdAt: '2026-07-30T00:00:00.000Z',
    category: 'event_attended',
    amount: 0,
    awardedByName: null,
  },
]

const base = { entries, rangeLabel: 'Rows 1-3 of 3', prevHref: null, nextHref: null }

describe('XpLedgerTable', () => {
  it('renders a column header for every field', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument()
  })

  it("renders each entry's date, category label, and amount", () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('2026-08-19')).toBeInTheDocument()
    expect(screen.getByText('Evaluation (on time)')).toBeInTheDocument()
    expect(screen.getByText('+25')).toBeInTheDocument()
  })

  it('signs a negative amount with a minus and a zero amount with no sign', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('-10')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('falls back to "System" when there is no awarding user', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getAllByText('System').length).toBe(2)
    expect(screen.getByText('Priya Nasser')).toBeInTheDocument()
  })

  // Regression guard: category values are narrated descriptions
  // ("Evaluation (on time)"), not category tags — Sans-Speaks territory,
  // same reasoning already applied to EvaluationStageRow's classify-vs-
  // narrate split, now documented in DESIGN.md.
  it('renders category in sans, not mono', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('Evaluation (on time)').className).toContain('font-sans')
  })

  it('renders date and amount in mono', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('2026-08-19').closest('td')?.className).toContain('font-mono')
    expect(screen.getByText('+25').className).toContain('font-mono')
  })

  // Regression guard: a real awarding user's name is a person's identity —
  // Sans-Speaks territory, matching Identity and EvaluationStageRow's
  // evaluatorName — while "System" is genuine system-state and stays mono.
  it('renders a real awarding name in sans, but the System token in mono', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('Priya Nasser').className).toContain('font-sans')
    expect(screen.getAllByText('System')[0]?.className).toContain('font-mono')
  })

  // Regression guard: verified against every other mono label in this file,
  // which all use 0.1em or 0.15em tracking within DESIGN.md's documented
  // 0.08-0.15em Label range.
  it("keeps the System token's tracking inside the documented Label range", () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getAllByText('System')[0]?.className).toContain('tracking-[0.1em]')
  })

  // Regression guard: the date column shortens below sm rather than
  // disappearing, the same degrade-don't-drop rule EvaluationStageRow's
  // date field follows — both forms stay in the DOM, toggled by CSS.
  it('renders both the full and abbreviated date for narrow viewports', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('2026-08-19')).toBeInTheDocument()
    expect(screen.getByText('08-19')).toBeInTheDocument()
  })

  // Regression guard: without table-fixed + truncate, one long real
  // category/name value resizes its column across every row and can wrap
  // past the 46px height contract. table-fixed makes column width
  // content-independent; truncate ellipsizes instead of wrapping.
  it('fixes column widths and truncates category/source instead of wrapping', () => {
    const { container } = render(<XpLedgerTable {...base} />)
    expect(container.querySelector('table')?.className).toContain('table-fixed')
    expect(screen.getByText('Evaluation (on time)').className).toContain('truncate')
    expect(screen.getByText('Priya Nasser').closest('td')?.className).toContain(
      'truncate',
    )
  })

  it('scrolls horizontally inside its own container instead of breaking the page', () => {
    const { container } = render(<XpLedgerTable {...base} />)
    expect(container.querySelector('.overflow-x-auto')).toBeTruthy()
  })

  it('renders the caller-formatted range label', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.getByText('Rows 1-3 of 3')).toBeInTheDocument()
  })

  // Regression guard: a native disabled button, not a styled span with
  // aria-disabled — a span carries no disabled-control semantics, so it's
  // invisible to a screen reader browsing by form control.
  it('renders Prev/Next as disabled, non-link buttons when the href is null', () => {
    render(<XpLedgerTable {...base} />)
    expect(screen.queryByRole('link', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('renders Prev/Next as real links when the href is set', () => {
    render(
      <XpLedgerTable
        {...base}
        prevHref="/dashboard/xp?page=1"
        nextHref="/dashboard/xp?page=3"
      />,
    )
    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveAttribute(
      'href',
      '/dashboard/xp?page=1',
    )
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/dashboard/xp?page=3',
    )
  })

  // Regression guard for the Bordered Rows template: same fixed row height,
  // same bottom-only divider on all but the last row.
  it('holds the calibrated 46px row height, undivided on the last row', () => {
    const { container } = render(<XpLedgerTable {...base} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(3)
    rows.forEach((row) => expect(row.className).toContain('h-[46px]'))
    expect(rows[0]?.className).toContain('border-b')
    expect(rows[rows.length - 1]?.className).toContain('border-b-0')
  })

  it('switches border/text tokens for the light surface', () => {
    const { container } = render(<XpLedgerTable {...base} surface="light" />)
    expect(container.querySelector('div')?.className).toContain('border-border')
  })

  // Regression guard: DASHBOARD_CONTRACT.md — every "no records" case
  // renders EmptyState, never prose inline, and the empty state replaces
  // the whole table (no header, no pagination), matching the reference
  // kit's own empty panel.
  it('renders EmptyState instead of the table when there are no entries', () => {
    render(<XpLedgerTable {...base} entries={[]} />)
    expect(screen.getByText('No XP Entries')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Prev')).not.toBeInTheDocument()
  })
})
