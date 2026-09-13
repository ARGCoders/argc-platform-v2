import { ClientResponseError } from 'pocketbase'
import { AuthError } from '@/lib/auth'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { NodeMemberRecord } from '@/types/pocketbase'

/**
 * Ownership-scope helper for the node-leader routes (MEMBER-09 and MEMBER-14).
 *
 * The role gate (`requireRole('node_leader')`) proves the *role*; this proves
 * the *authority*: the caller must currently hold a `node_member` row at
 * `role='leader'` (not left). Without one, answer 403 — role qualifies,
 * authority doesn't (ROLE3_PLAN §3, MEMBER-09 gate).
 *
 * Returns the led node id plus the caller's membership row, so callers can
 * scope every downstream query to the node they actually lead without
 * trusting any id from the request.
 */
export async function ledNodeFor(
  admin: Awaited<ReturnType<typeof getAdminClient>>,
  userId: string,
): Promise<{ nodeId: string; membership: NodeMemberRecord }> {
  try {
    const membership = await admin
      .collection('node_member')
      .getFirstListItem<NodeMemberRecord>(
        admin.filter('user = {:user} && role = "leader" && left_at = ""', {
          user: userId,
        }),
      )
    return { nodeId: membership.node, membership }
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) {
      throw new AuthError(403, 'No node to lead')
    }
    throw err
  }
}
