import { NextResponse } from 'next/server'
import { requireRole, authErrorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    await requireRole('node_peer')
    return NextResponse.json({ data: {} })
  } catch (err) {
    const { status, error } = authErrorResponse(err)
    const code =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'internal'
    return NextResponse.json({ error: { code, message: error } }, { status })
  }
}
