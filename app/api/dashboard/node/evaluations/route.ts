import { NextRequest, NextResponse } from 'next/server'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { parsePagination } from '@/lib/pagination'
import { ledNodeFor } from '../scopes'
import type {
  AdvancementCycleRecord,
  EvaluationRecord,
  NodeMemberRecord,
  UserRecord,
} from '@/types/pocketbase'

/**
 * GET /api/dashboard/node/evaluations — all `EvaluationRecord`s for the
 * members of the caller's node (MEMBER-09). NL+ with an ownership proof on
 * top of the role gate: without a `node_member` row at `role='leader'` the
 * caller answers 403 even though the role qualifies (role qualifies,
 * authority doesn't).
 *
 * Evaluatees are restricted to current members of the led node — that
 * filter IS the ACL (DASHBOARD_CONTRACT §3). Pagination follows the shared
 * list contract (`parsePagination`): page ≥ 1, perPage 1–100 default 20.
 *
 * Response: `{ data, page, perPage, totalItems, totalPages }` where each
 * item carries the eval record and projected `evaluatee`/`evaluator`/
 * `cycle` expansions.
 */
export const dynamic = 'force-dynamic'

/** Build `evaluatee = {:m0} || evaluatee = {:m1} || …` from member ids. */
function evaluateeFilter(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  memberIds: string[],
): string {
  const params: Record<string, string> = {}
  const clauses = memberIds.map((id, i) => {
    params[`m${i}`] = id
    return `evaluatee = {:m${i}}`
  })
  return admin.filter(`(${clauses.join(' || ')})`, params)
}

function projectUser(user: UserRecord | undefined): {
  id: string
  display_name: string
  avatar_url: string
} | null {
  if (!user) return null
  return {
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
  }
}

function projectCycle(cycle: AdvancementCycleRecord | undefined) {
  if (!cycle) return null
  return {
    id: cycle.id,
    label: cycle.label,
    slug: cycle.slug,
    starts_at: cycle.starts_at,
    ends_at: cycle.ends_at,
    status: cycle.status,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_leader')
    const admin = await getAdminClient()
    const { nodeId } = await ledNodeFor(admin, user.id)

    const parsed = parsePagination(request.nextUrl.searchParams)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: parsed.message } },
        { status: 400 },
      )
    }
    const { page, perPage } = parsed

    const members = await admin.collection('node_member').getFullList<NodeMemberRecord>({
      filter: admin.filter('node = {:node} && left_at = ""', { node: nodeId }),
    })
    const memberIds = members.map((m) => m.user)
    if (memberIds.length === 0) {
      return NextResponse.json({ data: [], page, perPage, totalItems: 0, totalPages: 0 })
    }

    const result = await admin
      .collection('evaluations')
      .getList<EvaluationRecord>(page, perPage, {
        filter: evaluateeFilter(admin, memberIds),
        sort: '-created',
        expand: 'evaluatee,evaluator,cycle',
      })

    const data = result.items.map((e) => ({
      id: e.id,
      evaluatee: projectUser(e.expand?.evaluatee),
      evaluator: e.expand?.evaluator ? projectUser(e.expand.evaluator) : null,
      cycle: projectCycle(e.expand?.cycle),
      stage: e.stage,
      status: e.status,
      scheduled_at: e.scheduled_at ?? null,
      completed_at: e.completed_at ?? null,
      score: e.score ?? null,
      notes: e.notes ?? null,
      xp_awarded: e.xp_awarded,
      created: e.created,
      updated: e.updated,
    }))

    return NextResponse.json({
      data,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
