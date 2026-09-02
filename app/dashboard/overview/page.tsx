import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'

/**
 * Temporary scaffolding to view/test the Dashboard Shell in the browser —
 * this is the node_peer route home (PLATFORM.md §2), so it's the one
 * `/dashboard` page reachable without a proxy.ts redirect. Real content
 * (MEMBER-03) replaces this.
 */
export default function DashboardOverviewPage() {
  return (
    <>
      <DashboardHeader title="Overview" />
      <div className="px-6 py-8">
        <p className="text-sm text-hero-ink-muted">Dashboard content goes here.</p>
      </div>
    </>
  )
}
