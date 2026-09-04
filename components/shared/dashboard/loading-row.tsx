import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingRowProps {
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * A Bordered Rows-shaped skeleton — fixed h-[46px], bottom-only divider,
 * surface-aware — distinct from the generic RowSkeleton in
 * loading-skeleton.tsx, which predates this component family and uses a
 * different height/border convention (border-border, no surface awareness).
 * That one stays for its own non-dashboard consumers; this one exists so a
 * loading XpLedgerTable never shifts layout once real rows arrive, matching
 * the height contract EvaluationStageRow and NodeMemberRow already committed
 * to.
 */
export function LoadingRow({ surface = 'dark', className }: LoadingRowProps) {
  return (
    <div
      className={cn(
        'flex h-[46px] items-center gap-4 border-b px-4',
        surface === 'dark' ? 'border-sidebar-border' : 'border-border',
        className,
      )}
    >
      <Skeleton className="h-3 w-16 shrink-0" />
      <Skeleton className="h-3 min-w-0 flex-1" />
      <Skeleton className="h-3 w-12 shrink-0" />
      <Skeleton className="h-3 w-20 shrink-0" />
    </div>
  )
}
