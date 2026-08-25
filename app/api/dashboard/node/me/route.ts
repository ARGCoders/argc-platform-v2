import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { NodeMemberRecord } from '@/types/pocketbase'

export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

export async function GET(): Promise<NextResponse> {
  try {
    const { user } = await requireRole('node_peer')
    const admin = await getAdminClient()

    let callerMembership: NodeMemberRecord
    try {
      callerMembership = await admin
        .collection('node_member')
        .getFirstListItem<NodeMemberRecord>(
          admin.filter('user = {:user} && left_at = ""', { user: user.id }),
        )
    } catch (err) {
      if (isMissingRecord(err)) {
        return NextResponse.json(
          { error: { code: 'not_found', message: 'Not in a node' } },
          { status: 404 },
        )
      }
      throw err
    }

    return NextResponse.json({ data: { membershipId: callerMembership.id } })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
