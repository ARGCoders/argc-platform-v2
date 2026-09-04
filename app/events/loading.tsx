import { Skeleton } from '@/components/ui/skeleton'

function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden bg-card ring-1 ring-foreground/10">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-5 w-3/4 rounded-none" />
        <Skeleton className="h-4 w-full rounded-none" />
        <Skeleton className="mt-1.5 h-4 w-1/3 rounded-none" />
      </div>
    </div>
  )
}

/** Matches the real filter row's dimensions (`min-h-11` tab buttons) so
 *  hydration doesn't shift the grid down once EventsList mounts. */
function TabRowSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-11 w-16 rounded-none" />
      <Skeleton className="h-11 w-28 rounded-none" />
      <Skeleton className="h-11 w-20 rounded-none" />
    </div>
  )
}

export default function EventsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-nav pb-16 sm:px-8 lg:px-12">
      <div className="mt-12 mb-10 flex flex-col gap-3 border-b border-border pb-8">
        <Skeleton className="h-10 w-48 rounded-none" />
        <Skeleton className="h-5 w-96 max-w-full rounded-none" />
      </div>
      <div className="flex flex-col gap-8">
        <TabRowSkeleton />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}
