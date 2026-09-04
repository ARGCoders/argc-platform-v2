import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DashboardShell } from '@/components/shared/dashboard/dashboard-shell'
import { DashboardHeader } from '@/components/shared/dashboard/dashboard-header'
import { RoleGate } from '@/components/shared/dashboard/role-gate'
import { RoleBadge } from '@/components/shared/dashboard/role-badge'
import { TierBadge } from '@/components/shared/dashboard/tier-badge'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { EvaluationStageRow } from '@/components/shared/dashboard/evaluation-stage-row'
import { NodeMemberRow } from '@/components/shared/dashboard/node-member-row'
import { XpBar } from '@/components/shared/dashboard/xp-bar'
import { StatCard } from '@/components/shared/dashboard/stat-card'
import {
  XpLedgerTable,
  type XpLedgerEntry,
} from '@/components/shared/dashboard/xp-ledger-table'
import { LoadingRow } from '@/components/shared/dashboard/loading-row'
import { CycleSelectorDemo } from './cycle-selector-demo'
import { ROLE_LABELS, TIERS } from '@/lib/constants'
import { ROLES } from '@/types/pocketbase'
import type { AdvancementCycleRecord, Role, UserRecord } from '@/types/pocketbase'
import { MockAuthProvider } from './mock-auth-provider'

const STATUS_SAMPLES = [
  { domain: 'eval', status: 'pending' },
  { domain: 'eval', status: 'scheduled' },
  { domain: 'eval', status: 'completed' },
  { domain: 'eval', status: 'missed' },
  { domain: 'event', status: 'proposed' },
  { domain: 'event', status: 'approved' },
  { domain: 'event', status: 'cancelled' },
  { domain: 'cycle', status: 'active' },
] as const

const XP_LEDGER_SAMPLES: XpLedgerEntry[] = [
  {
    id: '1',
    createdAt: '2026-08-19T00:00:00.000Z',
    category: 'evaluation_on_time',
    amount: 25,
    awardedByName: null,
  },
  {
    id: '2',
    createdAt: '2026-08-11T00:00:00.000Z',
    category: 'event_organized',
    amount: 40,
    awardedByName: null,
  },
  {
    id: '3',
    createdAt: '2026-08-02T00:00:00.000Z',
    category: 'manual_adjustment',
    amount: -10,
    awardedByName: 'Priya Nasser',
  },
  {
    id: '4',
    createdAt: '2026-07-30T00:00:00.000Z',
    category: 'event_attended',
    amount: 0,
    awardedByName: null,
  },
]

const CYCLE_SAMPLES: AdvancementCycleRecord[] = [
  {
    id: 'cycle-fall-2026',
    label: 'Fall 2026',
    slug: 'fall-2026',
    starts_at: '2026-09-01T00:00:00.000Z',
    ends_at: '2027-01-15T00:00:00.000Z',
    status: 'upcoming',
    created_by: 'preview-user',
    created: '2026-08-01T00:00:00.000Z',
    updated: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'cycle-spring-2026',
    label: 'Spring 2026',
    slug: 'spring-2026',
    starts_at: '2026-02-01T00:00:00.000Z',
    ends_at: '2026-08-31T00:00:00.000Z',
    status: 'active',
    created_by: 'preview-user',
    created: '2026-01-15T00:00:00.000Z',
    updated: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'cycle-fall-2025',
    label: 'Fall 2025',
    slug: 'fall-2025',
    starts_at: '2025-09-01T00:00:00.000Z',
    ends_at: '2026-01-31T00:00:00.000Z',
    status: 'closed',
    created_by: 'preview-user',
    created: '2025-08-15T00:00:00.000Z',
    updated: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'cycle-spring-2025',
    label: 'Spring 2025',
    slug: 'spring-2025',
    starts_at: '2025-02-01T00:00:00.000Z',
    ends_at: '2025-08-31T00:00:00.000Z',
    status: 'closed',
    created_by: 'preview-user',
    created: '2025-01-15T00:00:00.000Z',
    updated: '2025-09-01T00:00:00.000Z',
  },
]

const PREVIEW_ROLES = ROLES.filter((role): role is Role => role !== 'guest')

function makeMockUser(role: Role): UserRecord {
  const now = new Date().toISOString()
  return {
    id: 'preview-user',
    email: 'preview@student.42amman.com',
    emailVisibility: false,
    verified: true,
    intra_id: '00000',
    intra_login: 'previewer',
    display_name: 'Preview User',
    avatar_url: '',
    role,
    last_sync_at: now,
    created: now,
    updated: now,
  }
}

/**
 * Dev-only scaffolding for viewing DashboardShell/Sidebar/Header/RoleGate
 * with mock data — no real session or backend call involved. Lives outside
 * /dashboard so proxy.ts's auth gate never touches it. Switch roles with
 * ?role=node_peer|node_leader|super_peer|super_admin_peer to see the nav,
 * role badge, and RoleGate sections change.
 */
export default async function DashboardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { role: roleParam } = await searchParams
  const role: Role = PREVIEW_ROLES.includes(roleParam as Role)
    ? (roleParam as Role)
    : 'node_peer'
  const user = makeMockUser(role)

  return (
    <MockAuthProvider user={user}>
      <DashboardShell>
        <DashboardHeader
          title="Preview"
          crumbs={[{ label: 'Dev' }, { label: 'Dashboard Preview' }]}
        />
        <div className="flex flex-col gap-6 px-6 py-8">
          <div className="border border-sidebar-border p-4">
            <p className="mb-2 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              Preview as
            </p>
            <div className="flex flex-wrap gap-2">
              {PREVIEW_ROLES.map((r) => (
                <Link
                  key={r}
                  href={`/dev/dashboard-preview?role=${r}`}
                  className={
                    'border px-3 py-1.5 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase transition-colors ' +
                    (r === role
                      ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'border-sidebar-border text-hero-ink-dim hover:text-hero-ink')
                  }
                >
                  {ROLE_LABELS[r]}
                </Link>
              ))}
            </div>
          </div>

          <p className="text-sm text-hero-ink-muted">
            Signed in as <strong className="text-hero-ink">{user.display_name}</strong> (
            {ROLE_LABELS[role]}). The sidebar nav, role badge, and section grouping all
            reflect this role.
          </p>

          <RoleGate
            minRole="node_leader"
            fallback={
              <p className="border border-dashed border-sidebar-border p-4 text-sm text-hero-ink-dim">
                Node Leader+ content — hidden at the current preview role.
              </p>
            }
          >
            <p className="border border-sidebar-border p-4 text-sm text-hero-ink">
              Node Leader+ content — visible. RoleGate is working.
            </p>
          </RoleGate>

          <RoleGate
            minRole="super_peer"
            fallback={
              <p className="border border-dashed border-sidebar-border p-4 text-sm text-hero-ink-dim">
                Super Peer+ content — hidden at the current preview role.
              </p>
            }
          >
            <p className="border border-sidebar-border p-4 text-sm text-hero-ink">
              Super Peer+ content — visible. RoleGate is working.
            </p>
          </RoleGate>

          <div className="border border-sidebar-border p-4">
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              RoleBadge — every level
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </div>

          <div className="border border-sidebar-border p-4">
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              TierBadge — every tier
            </p>
            <div className="flex flex-wrap gap-2">
              {TIERS.map((t) => (
                <TierBadge key={t} tier={t} />
              ))}
            </div>
          </div>

          <div className="border border-sidebar-border p-4">
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              StatusChip — sample across domains
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_SAMPLES.map(({ domain, status }) => (
                <StatusChip key={`${domain}-${status}`} domain={domain} status={status} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              EvaluationStageRow — the bordered-row template
            </p>
            <div className="border border-sidebar-border">
              <EvaluationStageRow
                stage="standard_1"
                status="scheduled"
                evaluatorName="Sam Rivera"
                scheduledAt="2026-08-19T00:00:00.000Z"
                score={null}
              />
              <EvaluationStageRow
                stage="standard_2"
                status="pending"
                evaluatorName={null}
                scheduledAt={null}
                score={null}
              />
              <EvaluationStageRow
                stage="eval_plus_node_leader"
                status="completed"
                evaluatorName="Dario Vance"
                scheduledAt="2026-07-30T00:00:00.000Z"
                score={82}
              />
              <EvaluationStageRow
                stage="standard_1"
                status="missed"
                evaluatorName="Priya Nasser"
                scheduledAt={null}
                score={null}
                className="border-b-0"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              NodeMemberRow — read-only vs. linked
            </p>
            <div className="border border-sidebar-border">
              <NodeMemberRow
                name="Sam Rivera"
                avatarUrl=""
                tier="Contributor"
                xp={240}
                evaluationStages={['completed', 'completed', 'missed']}
              />
              <NodeMemberRow
                name="Dario Vance"
                avatarUrl=""
                tier="Vanguard"
                xp={1240}
                evaluationStages={['completed', 'completed', 'completed']}
                href="/dev/dashboard-preview"
              />
              <NodeMemberRow
                name="Priya Nasser"
                avatarUrl=""
                tier="Initiate"
                xp={20}
                evaluationStages={['scheduled', 'pending', 'pending']}
                className="border-b-0"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              XpBar — mid-progress vs. top tier
            </p>
            <div className="flex max-w-md flex-col gap-4">
              <XpBar xp={100} />
              <XpBar xp={300} />
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              StatCard — direction vs. tone are independent
            </p>
            <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="XP this cycle"
                value={418}
                delta={{ direction: 'up', tone: 'positive', text: '12.4% vs C-11' }}
              />
              <StatCard
                label="Missed evaluations"
                value={1}
                // tone: 'negative' here is a requested swatch example, not
                // this metric's real polarity — a real "missed evaluations"
                // count going down is good (positive), per deltaFor()'s own
                // 'lower-better' polarity. Shown negative/coral only so this
                // swatch demonstrates all three delta tones, not just two.
                delta={{ direction: 'down', tone: 'negative', text: '1 vs C-11' }}
              />
              <StatCard
                label="Node members"
                value={7}
                delta={{ direction: 'flat', tone: 'neutral', text: 'No delta' }}
              />
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              XpLedgerTable — populated, loading, and empty
            </p>
            <div className="flex max-w-xl flex-col gap-6">
              <XpLedgerTable
                entries={XP_LEDGER_SAMPLES}
                rangeLabel="Rows 1-4 of 38"
                prevHref={null}
                nextHref="/dev/dashboard-preview"
              />
              <div className="border border-sidebar-border">
                <LoadingRow />
                <LoadingRow />
                <LoadingRow className="border-b-0" />
              </div>
              <XpLedgerTable entries={[]} rangeLabel="" prevHref={null} nextHref={null} />
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-hero-ink-dim uppercase">
              CycleSelector — dark vs. light surface
            </p>
            <div className="flex flex-wrap gap-6">
              <CycleSelectorDemo
                cycles={CYCLE_SAMPLES}
                currentCycleId="cycle-spring-2026"
              />
              <div className="bg-card p-4">
                <CycleSelectorDemo
                  cycles={CYCLE_SAMPLES}
                  currentCycleId="cycle-fall-2025"
                  surface="light"
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </MockAuthProvider>
  )
}
