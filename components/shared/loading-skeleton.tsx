import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Skeleton shapes matching the real layouts, so loading does not shift content.
 * Built on the shadcn Skeleton primitive rather than re-declaring the pulse.
 */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border border-border', className)}>
      <Skeleton className="aspect-[16/7] w-full" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** One bordered row — matches the height of a populated table/list row. */
export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 border-b border-border px-4 py-4',
        className,
      )}
    >
      <Skeleton className="h-9 w-9 shrink-0" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="ml-auto h-4 w-20" />
    </div>
  )
}

export function RowListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="border border-border">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} className={i === count - 1 ? 'border-b-0' : undefined} />
      ))}
    </div>
  )
}

/** Article/detail view: title, byline, then body lines. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-10 w-4/5" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="aspect-[16/7] w-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}
