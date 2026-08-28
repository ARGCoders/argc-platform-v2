import { NextRequest, NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import { parsePagination } from '@/lib/pagination'
import type { AdvancementCycleRecord, XpLedgerRecord } from '@/types/pocketbase'

/**
 * GET /api/dashboard/me/xp — paginated XP history for the authenticated
 * member (MEMBER-02). Reads `xp_ledger` only; the ACL is the server-side
 * user id — no client-supplied user id is trusted.
 *
 * Query params:
 *   page    — ≥ 1, default 1
 *   perPage — 1–100, default 20
 *   cycle   — optional advancement cycle id; unknown id → 400
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()
    const sp = request.nextUrl.searchParams

    // ── Validate page/perPage (defaults and cap live in lib/pagination) ────
    const parsed = parsePagination(sp)
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: parsed.message } },
        { status: 400 },
      )
    }
    const { page, perPage } = parsed

    // ── Validate cycle (if provided) ──────────────────────────────────────
    const cycleId = sp.get('cycle')
    if (cycleId) {
      try {
        await admin
          .collection('advancement_cycles')
          .getOne<AdvancementCycleRecord>(cycleId)
      } catch (err) {
        if (err instanceof ClientResponseError && err.status === 404) {
          return NextResponse.json(
            { error: { code: 'invalid_input', message: 'Unknown cycle id' } },
            { status: 400 },
          )
        }
        throw err
      }
    }

    // ── Build filter ──────────────────────────────────────────────────────
    let filter: string
    if (cycleId) {
      filter = admin.filter('user = {:user} && cycle = {:cycle}', {
        user: user.id,
        cycle: cycleId,
      })
    } else {
      filter = admin.filter('user = {:user}', { user: user.id })
    }

    const result = await admin
      .collection('xp_ledger')
      .getList<XpLedgerRecord>(page, perPage, {
        filter,
        sort: '-created',
      })

    return NextResponse.json({
      data: result.items,
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
