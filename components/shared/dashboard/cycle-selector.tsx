'use client'

import * as React from 'react'
import Link from 'next/link'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { ChevronDownIcon } from 'lucide-react'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { cn } from '@/lib/utils'
import type { AdvancementCycleRecord } from '@/types/pocketbase'

export interface CycleSelectorProps {
  /** Expected most-recent-first, matching XpLedgerTable's pre-ordered/pre-paginated entries convention. */
  cycles: AdvancementCycleRecord[]
  currentCycleId: string
  /** Builds each row's href — the query-param key (slug vs id) is a page-level decision, not this component's. */
  hrefFor: (cycle: AdvancementCycleRecord) => string
  surface?: 'dark' | 'light'
  className?: string
}

type OptionRef = HTMLAnchorElement | HTMLButtonElement

/**
 * A real navigation menu of links, not an ARIA listbox/option widget — that
 * role pair exists for value-selection controls that report into a form,
 * and this control's outcome is always a page navigation. Overriding a
 * native <a>'s role to "option" would fight the element's own semantics for
 * no reason; arrow-key roving focus below is layered on top of ordinary
 * link/button elements instead, so every row stays a real, Tab-reachable
 * control even with JavaScript disabled.
 */
export function CycleSelector({
  cycles,
  currentCycleId,
  hrefFor,
  surface = 'dark',
  className,
}: CycleSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const optionRefs = React.useRef<Array<OptionRef | null>>([])

  const current = cycles.find((c) => c.id === currentCycleId) ?? cycles[0]

  const focusableIndices = cycles.reduce<number[]>((acc, cycle, i) => {
    if (cycle.status !== 'upcoming') acc.push(i)
    return acc
  }, [])

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (focusableIndices.length === 0) return
    const currentIdx = optionRefs.current.findIndex((el) => el === document.activeElement)
    const pos = focusableIndices.indexOf(currentIdx)

    let nextPos: number
    if (e.key === 'ArrowDown')
      nextPos = pos === -1 ? 0 : (pos + 1) % focusableIndices.length
    else if (e.key === 'ArrowUp')
      nextPos =
        pos === -1
          ? focusableIndices.length - 1
          : (pos - 1 + focusableIndices.length) % focusableIndices.length
    else if (e.key === 'Home') nextPos = 0
    else if (e.key === 'End') nextPos = focusableIndices.length - 1
    else return

    e.preventDefault()
    const targetIndex = focusableIndices[nextPos]
    if (targetIndex !== undefined) optionRefs.current[targetIndex]?.focus()
  }

  const selectedIndex = cycles.findIndex((c) => c.id === currentCycleId)
  const initialFocusIndex = focusableIndices.includes(selectedIndex)
    ? selectedIndex
    : (focusableIndices[0] ?? -1)

  const triggerBase =
    'inline-flex items-center gap-2 border px-3 py-1 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase outline-none transition-colors'
  const panelBg = surface === 'dark' ? 'bg-eng-navy' : 'bg-card'
  const border = surface === 'dark' ? 'border-sidebar-border' : 'border-border'

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          triggerBase,
          surface === 'dark'
            ? 'border-sidebar-border text-sidebar-foreground hover:bg-sidebar-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring data-[state=open]:bg-sidebar-foreground/5'
            : 'border-border text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-muted',
          className,
        )}
      >
        Cycle {current?.label}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            if (initialFocusIndex !== -1) optionRefs.current[initialFocusIndex]?.focus()
          }}
          className={cn(
            'z-50 max-h-64 w-(--radix-popover-trigger-width) min-w-56 overflow-y-auto',
            'origin-(--radix-popover-content-transform-origin) shadow-lg ring-1 ring-foreground/10 duration-100',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            panelBg,
          )}
        >
          <nav aria-label="Advancement cycles" onKeyDown={handleListKeyDown}>
            {cycles.map((cycle, i) => {
              const selected = cycle.id === currentCycleId
              const disabled = cycle.status === 'upcoming'
              const rowClass = cn(
                'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors',
                i !== cycles.length - 1 && cn('border-b', border),
                selected
                  ? surface === 'dark'
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'bg-primary text-primary-foreground'
                  : surface === 'dark'
                    ? 'text-sidebar-foreground'
                    : 'text-foreground',
              )
              const labelClass =
                'font-mono text-[0.72rem] font-medium tracking-[0.1em] uppercase'

              if (disabled) {
                return (
                  <button
                    key={cycle.id}
                    type="button"
                    disabled
                    ref={(el) => {
                      optionRefs.current[i] = el
                    }}
                    className={cn(rowClass, 'cursor-default opacity-40')}
                  >
                    <span className={labelClass}>{cycle.label}</span>
                    <StatusChip domain="cycle" status={cycle.status} surface={surface} />
                  </button>
                )
              }

              return (
                <Link
                  key={cycle.id}
                  href={hrefFor(cycle)}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                  ref={(el) => {
                    optionRefs.current[i] = el
                  }}
                  className={cn(
                    rowClass,
                    'outline-none',
                    !selected &&
                      (surface === 'dark'
                        ? 'hover:bg-sidebar-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring'
                        : 'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'),
                    selected &&
                      (surface === 'dark'
                        ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring'
                        : 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'),
                  )}
                >
                  <span className={labelClass}>{cycle.label}</span>
                  <StatusChip domain="cycle" status={cycle.status} surface={surface} />
                </Link>
              )
            })}
          </nav>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
