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

/** One /blog index row: thumbnail, then title lines and a meta block. */
export function PostRowSkeleton() {
  return (
    <div className="flex flex-col gap-6 border-b border-border py-6 md:flex-row md:items-center md:gap-8">
      <Skeleton className="aspect-[16/9] w-full shrink-0 md:w-80" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-3/4" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-4 h-3 w-40" />
      </div>
      <Skeleton className="hidden h-4 w-16 shrink-0 md:block" />
    </div>
  )
}

/** The /blog row list below the index bar. */
export function PostListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <PostRowSkeleton key={i} />
      ))}
    </div>
  )
}

/** Full /blog index shape: header, index bar, then the row list. */
export function BlogIndexSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-5 h-12 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
      </div>
      <div className="flex items-baseline justify-between gap-4 border-y border-border py-3">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
      </div>
      <PostListSkeleton />
    </div>
  )
}

/** One /handbook index row: title + affordance, no thumbnail/byline —
 *  a handbook article carries neither, unlike a blog post. */
export function HandbookRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="hidden h-3 w-14 shrink-0 sm:block" />
    </div>
  )
}

/** One /handbook category group: label, then its article rows. */
export function HandbookGroupSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border-t border-border pt-8">
      <Skeleton className="h-3 w-24" />
      <div className="mt-4">
        {Array.from({ length: rows }, (_, i) => (
          <HandbookRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Full /handbook index shape: header, then two category groups (the
 *  current live catalog is Company + People). */
export function HandbookIndexSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-5 h-12 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
      </div>
      <HandbookGroupSkeleton />
      <HandbookGroupSkeleton />
    </div>
  )
}

/** /handbook article detail shape: kicker, title, then body lines — no
 *  banner or byline block, unlike the blog's `DetailSkeleton`. */
export function HandbookArticleSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-10 w-4/5" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={cn('h-4', i % 3 === 2 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}
