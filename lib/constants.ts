import type { Role, Tier, XpCategory } from '@/types/pocketbase'

// ─── Roles ────────────────────────────────────────────────────────────────

/**
 * Ordered least- to most-privileged. A role satisfies a requirement when its
 * index is >= the required role's index. Single source of truth for both
 * `lib/auth.ts` (server enforcement) and any role-aware UI.
 */
export const ROLE_HIERARCHY = [
  'guest',
  'node_peer',
  'node_leader',
  'super_peer',
  'super_admin_peer',
] as const satisfies readonly Role[]

export function roleAtLeast(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole)
}

export const ROLE_LABELS: Record<Role, string> = {
  guest: 'Guest',
  node_peer: 'Node Peer',
  node_leader: 'Node Leader',
  super_peer: 'Super Peer',
  super_admin_peer: 'Super Admin Peer',
}

// ─── Route gating (consumed by proxy.ts) ──────────────────────────────────

/** Require a logged-in user of any role. */
export const AUTHENTICATED_PREFIXES = ['/profile', '/settings'] as const

/** Require a logged-in user whose role is not `guest`. */
export const NON_GUEST_PREFIXES = ['/dashboard'] as const

/** Authenticated non-guests are redirected away from these. */
export const AUTH_ROUTES = ['/register'] as const

// ─── XP ───────────────────────────────────────────────────────────────────

export const XP_CATEGORIES = [
  'evaluation_on_time',
  'evaluation_late',
  'event_organized',
  'event_attended',
  'knowledge_session',
  'cross_node_contribution',
  'hackathon',
  'endorsement_received',
  'cross_node_vote_received',
  'manual_adjustment',
] as const satisfies readonly XpCategory[]

export const XP_CATEGORY_LABELS: Record<XpCategory, string> = {
  evaluation_on_time: 'Evaluation (on time)',
  evaluation_late: 'Evaluation (late)',
  event_organized: 'Event organized',
  event_attended: 'Event attended',
  knowledge_session: 'Knowledge session',
  cross_node_contribution: 'Cross-node contribution',
  hackathon: 'Hackathon',
  endorsement_received: 'Endorsement received',
  cross_node_vote_received: 'Cross-node vote received',
  manual_adjustment: 'Manual adjustment',
}

/** XP granted when a super peer verifies an external endorsement. */
export const ENDORSEMENT_XP_AWARD = 25

// ─── Tiers ────────────────────────────────────────────────────────────────

/**
 * Ordered lowest to highest. XP thresholds are deliberately absent — they are
 * open question Q1 in docs/PLATFORM.md §6 and are only needed by the member
 * dashboard, which is out of scope for this build.
 */
export const TIERS = ['Initiate', 'Contributor', 'Architect', 'Vanguard'] as const satisfies readonly Tier[]

// ─── Auth cookies ─────────────────────────────────────────────────────────

export const AUTH_COOKIE = 'pb_auth'
export const ROLE_COOKIE = 'pb_role'
export const OAUTH_STATE_COOKIE = 'oauth_state'
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect'

/**
 * Guards post-login redirects. Only same-origin absolute paths are allowed —
 * `//evil.test` and `https://evil.test` are both rejected, so a crafted
 * `?next=` cannot turn the OAuth callback into an open redirect.
 */
export function isSafeRedirect(target: string): boolean {
  return target.startsWith('/') && !target.startsWith('//')
}

/** 14 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14

/** 10 minutes, in seconds — the OAuth round trip only needs to outlive itself. */
export const OAUTH_STATE_MAX_AGE = 60 * 10
