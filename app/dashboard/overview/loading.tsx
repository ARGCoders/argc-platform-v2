import { Skeleton } from '@/components/ui/skeleton'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'
import { LoadingRow } from '@/components/shared/dashboard/loading-row'

export default function OverviewLoading() {
  return (
    <>
      <DashboardHeader title="Overview" />
      <div className="flex flex-col gap-8 px-6 py-8">
        <Skeleton className="h-3 w-24 rounded-none" />

        <div className="flex max-w-md flex-col gap-3">
          <Skeleton className="h-9 w-24 rounded-none" />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-3 w-28 rounded-none" />
              <Skeleton className="h-3 w-16 rounded-none" />
            </div>
            <Skeleton className="h-2 w-full rounded-none" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32 rounded-none" />
          <div className="border border-sidebar-border">
            {Array.from({ length: 3 }, (_, i) => (
              <LoadingRow key={i} className={i === 2 ? 'border-b-0' : undefined} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32 rounded-none" />
          <div className="border border-sidebar-border">
            {Array.from({ length: 2 }, (_, i) => (
              <LoadingRow key={i} className={i === 1 ? 'border-b-0' : undefined} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
