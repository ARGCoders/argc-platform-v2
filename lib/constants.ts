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

/**
 * Home path per role (PLATFORM.md §3). `super_admin_peer` shares the super
 * peer home. Used by proxy.ts for the /dashboard root redirect and for
 * sending too-low roles back to their own section.
 */
export const ROLE_HOMES: Record<Role, string> = {
  guest: '/',
  node_peer: '/dashboard/overview',
  node_leader: '/dashboard/node',
  super_peer: '/dashboard/admin',
  super_admin_peer: '/dashboard/admin',
}

/**
 * Dashboard sections and the minimum role each requires (PLATFORM.md §3:
 * node section is NL+, admin section is SP+). Consumed by proxy.ts — coarse
 * cookie redirects only; requireRole() in lib/auth.ts stays the boundary.
 */
export const DASHBOARD_GATES = [
  { prefix: '/dashboard/node', minRole: 'node_leader' },
  { prefix: '/dashboard/admin', minRole: 'super_peer' },
] as const

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

/**
 * XP granted by a single event of each category. Grounded in
 * docs/PLATFORM.md §6 decision Q1 and the handbook's XP system
 * (`argc-handbook/03-protocols/02-xp-system.md`): evaluations on schedule are
 * Standard, late ones Reduced, hackathons High — and XP is earned through
 * verified output, not attendance. Weights are reviewed by Super Peers each
 * cycle and are deliberately tunable constants.
 *
 * `manual_adjustment` carries no default: the awarding super peer sets the
 * amount. `event_attended` is 0 by design — attendance alone earns nothing.
 */
export const XP_WEIGHTS: Record<XpCategory, number> = {
  evaluation_on_time: 25,
  evaluation_late: 10,
  event_organized: 40,
  event_attended: 0,
  knowledge_session: 25,
  cross_node_contribution: 25,
  hackathon: 50,
  endorsement_received: 25,
  cross_node_vote_received: 25,
  manual_adjustment: 0,
}

/** XP granted when a super peer verifies an external endorsement. */
export const ENDORSEMENT_XP_AWARD = XP_WEIGHTS.endorsement_received

/** Minimum score for a passed evaluation, on the 0–100 scale (Q6). */
export const EVAL_PASS_SCORE = 50

/**
 * Cross-node votes a member may cast per cycle (Q3): one positive and one
 * negative. Cast through `/api/dashboard/vote`, enforced server-side.
 */
export const VOTE_BUDGET = { positive: 1, negative: 1 } as const

// ─── Tiers ────────────────────────────────────────────────────────────────

/**
 * Ordered lowest to highest. Thresholds are the minimum XP a member must hold
 * within a single advancement cycle to keep a tier — decision Q1 in
 * docs/PLATFORM.md §6. The handbook (`03-protocols/03-advancement.md`) makes
 * the numbers Super Peer-tunable per cycle and visible on the platform, so
 * these are code constants, not schema: change them here, never in a
 * migration.
 */
export const TIERS = [
  'Initiate',
  'Contributor',
  'Architect',
  'Vanguard',
] as const satisfies readonly Tier[]

export const TIER_THRESHOLDS: Record<Tier, number> = {
  Initiate: 0,
  Contributor: 60,
  Architect: 140,
  Vanguard: 300,
}

/** Highest tier whose threshold the XP total meets or exceeds. */
export function tierForXp(xp: number): Tier {
  let current: Tier = TIERS[0]
  for (const tier of TIERS) {
    if (xp >= TIER_THRESHOLDS[tier]) current = tier
  }
  return current
}

export interface TierProgress {
  current: Tier
  /** Next tier to reach, or null when already at the top. */
  next: Tier | null
  /** XP required to reach `next`, or null at the top. */
  required: number | null
}

/** Progress toward the next tier, for the XpBar and overview views. */
export function tierProgress(xp: number): TierProgress {
  const current = tierForXp(xp)
  const next = TIERS[TIERS.indexOf(current) + 1]
  if (next === undefined) return { current, next: null, required: null }
  return { current, next, required: TIER_THRESHOLDS[next] }
}

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
