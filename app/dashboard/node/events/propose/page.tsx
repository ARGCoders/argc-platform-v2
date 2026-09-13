import { requireRole } from '@/lib/auth'
import { nodeEvents as nodeEventsCopy } from '@/lib/content'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'
import { ProposeEventClient } from '@/components/features/node/propose-event-client'

export const dynamic = 'force-dynamic'

/**
 * /dashboard/node/events/propose (MEMBER-14). NL-gated at the page boundary —
 * not just on the route — so a node_peer handed this URL gets a 403 error
 * boundary instead of a proposal form that can only ever fail. The form is a
 * client island that owns its own submit; the page owns nothing else. There
 * is no data read here: proposals are listed and approved by Role 4, filing
 * is the node's whole job for this page.
 */
export default async function ProposeEventPage() {
  await requireRole('node_leader')

  return (
    <>
      <DashboardHeader title={nodeEventsCopy.propose.title} />
      <div className="px-6 py-8">
        <div className="max-w-lg">
          <ProposeEventClient />
        </div>
      </div>
    </>
  )
}
