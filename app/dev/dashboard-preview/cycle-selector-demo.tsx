'use client'

import { CycleSelector } from '@/components/shared/dashboard/cycle-selector'
import type { AdvancementCycleRecord } from '@/types/pocketbase'

/**
 * Wraps CycleSelector for this dev-only page: hrefFor is a function, and a
 * Server Component (page.tsx) can't pass a function prop across the boundary
 * into a Client Component — it has to be defined in client code instead.
 */
export function CycleSelectorDemo({
  cycles,
  currentCycleId,
  surface,
}: {
  cycles: AdvancementCycleRecord[]
  currentCycleId: string
  surface?: 'dark' | 'light'
}) {
  return (
    <CycleSelector
      cycles={cycles}
      currentCycleId={currentCycleId}
      hrefFor={(c) => `/dev/dashboard-preview?cycle=${c.slug}`}
      surface={surface}
    />
  )
}
