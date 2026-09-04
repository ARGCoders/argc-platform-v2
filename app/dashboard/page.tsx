import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'

/**
 * Temporary scaffolding to view/test the Dashboard Shell in the browser.
 * Real dashboard pages (MEMBER-03 etc.) replace this.
 */
export default function DashboardPage() {
  return (
    <>
      <DashboardHeader title="Dashboard" />
      <div className="px-6 py-8">
        <p className="text-sm text-hero-ink-muted">Dashboard content goes here.</p>
      </div>
    </>
  )
}
