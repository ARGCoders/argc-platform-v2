'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { roleAtLeast } from '@/lib/constants'
import type { Role } from '@/types/pocketbase'

interface RoleGateProps {
  /** Minimum role required, per ROLE_HIERARCHY in lib/constants.ts. */
  minRole: Role
  children: ReactNode
  /** Rendered instead of children when the role check fails. Defaults to nothing. */
  fallback?: ReactNode
}

/**
 * Pure conditional render — no chrome, no loading state of its own. Wrap a
 * section of a shared page with this to hide it from members below `minRole`.
 */
export function RoleGate({ minRole, children, fallback = null }: RoleGateProps) {
  const { user, isLoading } = useAuth()

  if (isLoading || !user) return fallback
  if (!roleAtLeast(user.role, minRole)) return fallback

  return children
}
