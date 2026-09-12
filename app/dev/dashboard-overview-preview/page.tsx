import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/shared/dashboard/dashboard-shell'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'
import { OverviewContent } from '@/components/features/member/overview-content'
import { MockAuthProvider } from '@/app/dev/dashboard-preview/mock-auth-provider'
import type { UserRecord } from '@/types/pocketbase'

const MOCK_USER: UserRecord = {
  id: 'preview-user',
  email: 'amufleh@student.42amman.com',
  emailVisibility: false,
  verified: true,
  intra_id: '00000',
  intra_login: 'amufleh',
  display_name: 'Amufleh',
  avatar_url: '/mock/amufleh-avatar.jpeg',
  role: 'node_peer',
  last_sync_at: new Date().toISOString(),
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
}

const now = Date.now()
const days = (n: number) => new Date(now + n * 86_400_000).toISOString()

function SwatchLabel({ children }: { children: string }) {
  return (
    <p className="mt-10 mb-3 border-t border-sidebar-border px-6 pt-6 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </p>
  )
}

/**
 * Dev-only: MEMBER-03's real OverviewContent, fed fixture data instead of
 * the 3 live fetches — no session, no PocketBase call. Covers every state
 * the real page has to handle on its own, stacked in one shell so they're
 * all visible without switching routes.
 *
 * The real dashboard theme toggle (lib/dashboard-theme-context.tsx) already
 * lets you flip this whole preview between surfaces live — try it in
 * DashboardSidebar's Identity block. The final swatch below renders on an
 * explicit `surface="light"` regardless of that live toggle, and sits
 * outside <DashboardShell> deliberately: nested inside it, `bg-background`
 * would resolve to whatever the shell's own live `.dark` state currently is
 * (the swappable --sidebar and --background tokens, not a fixed light look).
 */
export default function DashboardOverviewPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <MockAuthProvider user={MOCK_USER}>
      <DashboardShell>
        <DashboardHeader title="Overview (preview)" />

        <SwatchLabel>Populated — including a stage with no record yet</SwatchLabel>
        <OverviewContent
          nodeName="Ignition"
          xp={240}
          evals={[
            { stage: 'standard_1', status: 'completed' },
            { stage: 'standard_2', status: 'scheduled' },
            // Stage 3 deliberately omitted — demonstrates the "no record
            // yet" state for a stage node/me hasn't created a row for.
          ]}
          events={[
            {
              id: 'ev-1',
              title: 'Winter Sprint — Open Registration',
              starts_at: days(20),
              ends_at: null,
            },
            {
              id: 'ev-2',
              title: 'Failure Reviews: Postmortems in Public',
              starts_at: days(5),
              ends_at: null,
            },
          ]}
        />

        <SwatchLabel>No active cycle / no XP logged yet</SwatchLabel>
        <OverviewContent
          nodeName="Ignition"
          xp={null}
          evals={[{ stage: 'standard_1', status: 'pending' }]}
          events={[]}
        />

        <SwatchLabel>Not in a node yet</SwatchLabel>
        <OverviewContent nodeName={null} xp={80} evals={null} events={[]} />

        <SwatchLabel>No upcoming events</SwatchLabel>
        <OverviewContent
          nodeName="Ignition"
          xp={310}
          evals={[
            { stage: 'standard_1', status: 'completed' },
            { stage: 'standard_2', status: 'completed' },
            { stage: 'eval_plus_node_leader', status: 'missed' },
          ]}
          events={[]}
        />
      </DashboardShell>

      <p className="border-t border-border bg-background px-6 pt-10 pb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
        Fixed light surface (surface=&quot;light&quot; pinned, independent of the live
        toggle above)
      </p>
      <div className="bg-background px-6 pb-10">
        <OverviewContent
          nodeName="Ignition"
          xp={240}
          evals={[
            { stage: 'standard_1', status: 'completed' },
            { stage: 'standard_2', status: 'scheduled' },
          ]}
          events={[
            {
              id: 'ev-1',
              title: 'Winter Sprint — Open Registration',
              starts_at: days(20),
              ends_at: null,
            },
            {
              id: 'ev-2',
              title: 'Failure Reviews: Postmortems in Public',
              starts_at: days(5),
              ends_at: null,
            },
          ]}
          surface="light"
        />
      </div>
    </MockAuthProvider>
  )
}
