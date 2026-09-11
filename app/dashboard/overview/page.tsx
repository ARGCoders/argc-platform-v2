import { requireRole } from '@/lib/auth'
import { fetchDashboardApi } from '@/lib/dashboard-fetch'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'
import { OverviewContent, type OverviewEvent } from './overview-content'
import type {
  AdvancementCycleRecord,
  EvalStage,
  EvalStatus,
  Tier,
  UserStatsRecord,
} from '@/types/pocketbase'

export const dynamic = 'force-dynamic'

interface StatsResponse {
  cycle: AdvancementCycleRecord | null
  stats: UserStatsRecord | null
  progress: { current: Tier; next: Tier | null; required: number | null }
}

interface NodeMeMember {
  user: { id: string; display_name: string; avatar_url: string } | null
  role: 'member' | 'leader'
  tier: string
  xp_total: number
  evals: { stage: EvalStage; status: EvalStatus; score: number | undefined }[]
}

interface NodeMeResponse {
  node: { id: string; name: string; slug: string; cohort: string; status: string }
  members: NodeMeMember[]
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetchDashboardApi('/api/dashboard/me/stats')
  if (!res.ok) throw new Error(`me/stats answered ${res.status}`)
  const body = (await res.json()) as { data: StatsResponse }
  return body.data
}

/**
 * `null` return means "not in a node yet" — a legitimate state (MEMBER-07
 * answers 404 not_found), not a failure. Any other non-OK status still
 * throws, same as the other two fetches.
 */
async function fetchNode(): Promise<NodeMeResponse | null> {
  const res = await fetchDashboardApi('/api/dashboard/node/me')
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`node/me answered ${res.status}`)
  const body = (await res.json()) as { data: NodeMeResponse }
  return body.data
}

async function fetchUpcomingEvents(): Promise<OverviewEvent[]> {
  const res = await fetchDashboardApi('/api/dashboard/events?perPage=3')
  if (!res.ok) throw new Error(`events answered ${res.status}`)
  const body = (await res.json()) as { data: OverviewEvent[] }
  return body.data
}

/**
 * Personal summary (MEMBER-03): XP/tier/cycle progress, evaluation status,
 * upcoming events, node name. Three internal fetches, each independently
 * tolerant of its own "nothing yet" state — a missing node never blanks the
 * XP section, an empty events list never blanks the evaluation section.
 *
 * `requireRole` runs here directly (not through an API route) purely to
 * learn the caller's own id, so `node/me`'s member list — which has no
 * "this one is you" flag — can be matched to the right row. The actual data
 * reads still go through fetchDashboardApi() per DASHBOARD_CONTRACT §5;
 * this call never touches PocketBase itself.
 */
export default async function DashboardOverviewPage() {
  const { user } = await requireRole('node_peer')
  const [stats, node, events] = await Promise.all([
    fetchStats(),
    fetchNode(),
    fetchUpcomingEvents(),
  ])

  const myEntry = node?.members.find((m) => m.user?.id === user.id) ?? null

  return (
    <>
      <DashboardHeader title="Overview" />
      <OverviewContent
        nodeName={node?.node.name ?? null}
        xp={stats.stats?.xp_total ?? null}
        evals={
          myEntry ? myEntry.evals.map(({ stage, status }) => ({ stage, status })) : null
        }
        events={events}
      />
    </>
  )
}
