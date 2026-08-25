import { NextResponse } from 'next/server'
import { ClientResponseError } from 'pocketbase'
import { requireRole, authErrorResponse } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { NodeMemberRecord, NodeRecord } from '@/types/pocketbase'

export const dynamic = 'force-dynamic'

function isMissingRecord(err: unknown): boolean {
  return err instanceof ClientResponseError && err.status === 404
}

interface MemberSummary {
  user: { id: string; display_name: string; avatar_url: string } | null
  role: 'member' | 'leader'
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

    const node = await admin.collection('node').getOne<NodeRecord>(callerMembership.node)

    const memberRecords = await admin
      .collection('node_member')
      .getFullList<NodeMemberRecord>({
        filter: admin.filter('node = {:node} && left_at = ""', {
          node: callerMembership.node,
        }),
        expand: 'user',
      })

    const members: MemberSummary[] = memberRecords.map((m) => {
      const expandedUser = m.expand?.user
      return {
        user: expandedUser
          ? {
              id: expandedUser.id,
              display_name: expandedUser.display_name,
              avatar_url: expandedUser.avatar_url,
            }
          : null,
        role: m.role,
      }
    })

    return NextResponse.json({
      data: {
        node: {
          id: node.id,
          name: node.name,
          slug: node.slug,
          cohort: node.cohort,
          status: node.status,
        },
        members,
      },
    })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
