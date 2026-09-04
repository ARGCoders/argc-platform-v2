import Link from 'next/link'
import { EmptyState } from '@/components/shared/empty-state'
import { XP_CATEGORY_LABELS } from '@/lib/constants'
import { formatDate, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { XpCategory } from '@/types/pocketbase'

export interface XpLedgerEntry {
  id: string
  /** ISO date string — the ledger's `created` field. */
  createdAt: string
  category: XpCategory
  /** Can be negative — a real ledger state (penalty/adjustment), not an edge case. */
  amount: number
  /** The awarding user's display name, or null for a system-awarded entry. */
  awardedByName: string | null
}

interface XpLedgerTableProps {
  entries: XpLedgerEntry[]
  /** Caller-formatted, e.g. "Rows 1-20 of 38" — this component doesn't compute pagination math. */
  rangeLabel: string
  /** Null when there's no previous page — renders a disabled control, not a broken link. */
  prevHref: string | null
  nextHref: string | null
  surface?: 'dark' | 'light'
  className?: string
}

function formatAmount(amount: number): string {
  return amount > 0 ? `+${amount}` : String(amount)
}

function PaginationLink({
  href,
  label,
  ariaLabel,
  surface,
}: {
  href: string | null
  label: string
  ariaLabel: string
  surface: 'dark' | 'light'
}) {
  const base =
    'border px-3 py-1 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase'

  if (!href) {
    // A native disabled button, not a styled span — a span carries no
    // disabled-control semantics, so it's invisible to a screen reader
    // browsing by form control even though it visually reads as "grayed out."
    return (
      <button
        type="button"
        disabled
        aria-label={ariaLabel}
        className={cn(
          base,
          'cursor-default opacity-40',
          surface === 'dark'
            ? 'border-sidebar-border text-sidebar-foreground'
            : 'border-border text-foreground',
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        base,
        'outline-none transition-colors',
        surface === 'dark'
          ? 'border-sidebar-border text-sidebar-foreground hover:bg-sidebar-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring'
          : 'border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
    >
      {label}
    </Link>
  )
}

/**
 * The Bordered Rows template, carried forward as real `<table>` markup
 * rather than styled divs — this is the first component in the family with
 * a real header row, and `<th scope="col">` is the correct native mechanism
 * for column identity now that one exists, rather than a third repetition
 * of the per-field `aria-label` pattern the bare rows use.
 *
 * Typography follows the same classify-vs-narrate split as the rest of the
 * family: category is Space Grotesk (XP_CATEGORY_LABELS values are narrated
 * descriptions, e.g. "Evaluation (on time)", not category tags), date and
 * amount stay mono. Amount carries an explicit sign either way (+40, -15)
 * and stays plain mono — no color — negative is a normal ledger state here,
 * not a status tone. Source splits further still: a real awarding user's
 * name is sans (a person's name is always sans, matching Identity and
 * EvaluationStageRow's evaluatorName), and only the literal "System" token
 * — genuine system-state, not narrated content — stays mono/uppercase.
 *
 * `table-fixed` with explicit column widths, plus `truncate` on Category
 * and Source, keeps the 46px row height a hard contract even against a
 * long real category label or name — an HTML table without `table-fixed`
 * sizes columns to their widest cell across every row, so one long value
 * would otherwise resize the whole column and wrap every row's height past
 * the contract. The date column shortens to MM-DD below `sm` rather than
 * disappearing (the same degrade-don't-drop rule StatCard's XP field and
 * EvaluationStageRow's date already follow), and the whole table scrolls
 * horizontally inside its own container rather than breaking the page if
 * content still doesn't fit at the narrowest widths.
 *
 * Empty state reuses the shared `EmptyState` component per
 * DASHBOARD_CONTRACT.md and replaces the whole table (header + pagination
 * included), matching how the reference kit's own empty panel carries no
 * header either. Pagination is link-based (`prevHref`/`nextHref`), no
 * client state, matching this app's server-component-first architecture.
 */
export function XpLedgerTable({
  entries,
  rangeLabel,
  prevHref,
  nextHref,
  surface = 'dark',
  className,
}: XpLedgerTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No XP Entries"
        description="Nothing has posted to your ledger for this cycle yet."
        className={className}
      />
    )
  }

  const bright = surface === 'dark' ? 'text-sidebar-foreground' : 'text-foreground'
  const dim = surface === 'dark' ? 'text-sidebar-foreground/60' : 'text-muted-foreground'
  const dimHeader =
    surface === 'dark' ? 'text-sidebar-foreground/40' : 'text-muted-foreground/70'
  const border = surface === 'dark' ? 'border-sidebar-border' : 'border-border'

  const headerCell = cn(
    'px-4 py-2 font-mono text-[0.6rem] font-medium tracking-[0.15em] uppercase',
    dimHeader,
  )

  return (
    <div className={cn('border', border, className)}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">Historical XP ledger entries</caption>
          <colgroup>
            <col className="w-24" />
            <col />
            <col className="w-20" />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className={cn('border-b', border)}>
              <th scope="col" className={cn(headerCell, 'text-left')}>
                Date
              </th>
              <th scope="col" className={cn(headerCell, 'text-left')}>
                Category
              </th>
              <th scope="col" className={cn(headerCell, 'text-right')}>
                Amount
              </th>
              <th scope="col" className={cn(headerCell, 'text-right')}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.id}
                className={cn(
                  'h-[46px] border-b',
                  border,
                  i === entries.length - 1 && 'border-b-0',
                )}
              >
                <td
                  className={cn('px-4 align-middle font-mono text-sm tabular-nums', dim)}
                >
                  <span className="hidden sm:inline">{formatDate(entry.createdAt)}</span>
                  <span className="sm:hidden">{formatDateShort(entry.createdAt)}</span>
                </td>
                <td
                  className={cn('truncate px-4 align-middle font-sans text-sm', bright)}
                >
                  {XP_CATEGORY_LABELS[entry.category]}
                </td>
                <td
                  className={cn(
                    'px-4 text-right align-middle font-mono text-sm tabular-nums',
                    bright,
                  )}
                >
                  {formatAmount(entry.amount)}
                </td>
                <td className={cn('truncate px-4 text-right align-middle text-sm', dim)}>
                  {entry.awardedByName ? (
                    <span className="font-sans">{entry.awardedByName}</span>
                  ) : (
                    <span className="font-mono text-[0.68rem] tracking-[0.1em] uppercase">
                      System
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn('flex items-center justify-between border-t px-4 py-3', border)}>
        <span className={cn('font-mono text-[0.68rem] tracking-[0.1em] uppercase', dim)}>
          {rangeLabel}
        </span>
        <div className="flex gap-2">
          <PaginationLink
            href={prevHref}
            label="Prev"
            ariaLabel="Previous page"
            surface={surface}
          />
          <PaginationLink
            href={nextHref}
            label="Next"
            ariaLabel="Next page"
            surface={surface}
          />
        </div>
      </div>
    </div>
  )
}
