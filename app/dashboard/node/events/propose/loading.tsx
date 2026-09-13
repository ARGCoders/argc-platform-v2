import { Skeleton } from '@/components/ui/skeleton'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'

export default function ProposeEventLoading() {
  return (
    <>
      <DashboardHeader title="Propose an event" />
      <div className="flex max-w-lg flex-col gap-8 px-6 py-8">
        <Skeleton className="h-3 w-24 rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-[120px] w-full rounded-none" />
        <Skeleton className="h-8 w-40 rounded-none" />
      </div>
    </>
  )
}
