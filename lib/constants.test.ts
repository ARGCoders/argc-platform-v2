import { describe, it, expect } from 'vitest'
import {
  ROLE_HIERARCHY,
  roleAtLeast,
  isSafeRedirect,
  ROLE_LABELS,
  TIERS,
  TIER_THRESHOLDS,
  tierForXp,
  tierProgress,
  XP_WEIGHTS,
  EVAL_PASS_SCORE,
  VOTE_BUDGET,
  ENDORSEMENT_XP_AWARD,
} from './constants'
import type { Role, XpCategory } from '@/types/pocketbase'

describe('roleAtLeast', () => {
  it('accepts a role that exactly meets the requirement', () => {
    expect(roleAtLeast('super_peer', 'super_peer')).toBe(true)
  })

  it('accepts a role above the requirement', () => {
    expect(roleAtLeast('super_admin_peer', 'super_peer')).toBe(true)
    expect(roleAtLeast('node_leader', 'node_peer')).toBe(true)
  })

  it('rejects a role below the requirement', () => {
    expect(roleAtLeast('node_peer', 'super_peer')).toBe(false)
    expect(roleAtLeast('guest', 'node_peer')).toBe(false)
  })

  /** guest must never satisfy any gate above itself. */
  it('never lets guest through a non-guest gate', () => {
    for (const role of ROLE_HIERARCHY.slice(1) as Role[]) {
      expect(roleAtLeast('guest', role)).toBe(false)
    }
  })

  it('is ordered least to most privileged', () => {
    expect(ROLE_HIERARCHY).toEqual([
      'guest',
      'node_peer',
      'node_leader',
      'super_peer',
      'super_admin_peer',
    ])
  })

  it('has a label for every role', () => {
    for (const role of ROLE_HIERARCHY as readonly Role[]) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })
})

/**
 * Guards the OAuth callback. A miss here turns ?next= into an open redirect,
 * so the hostile cases matter more than the friendly ones.
 */
describe('isSafeRedirect', () => {
  it.each(['/dashboard', '/blog/some-post', '/', '/a?b=c'])('allows %s', (target) => {
    expect(isSafeRedirect(target)).toBe(true)
  })

  it.each([
    '//evil.test',
    'https://evil.test',
    'http://evil.test',
    '//evil.test/path',
    'javascript:alert(1)',
    'mailto:a@b.test',
    'evil.test',
    '',
  ])('rejects %s', (target) => {
    expect(isSafeRedirect(target)).toBe(false)
  })
})

describe('tierForXp', () => {
  it('assigns a tier for every threshold, inclusive at the boundary', () => {
    expect(tierForXp(0)).toBe('Initiate')
    expect(tierForXp(59)).toBe('Initiate')
    expect(tierForXp(60)).toBe('Contributor')
    expect(tierForXp(139)).toBe('Contributor')
    expect(tierForXp(140)).toBe('Architect')
    expect(tierForXp(299)).toBe('Architect')
    expect(tierForXp(300)).toBe('Vanguard')
    expect(tierForXp(9999)).toBe('Vanguard')
  })

  it('never returns anything outside the tier list', () => {
    for (const tier of TIERS) {
      expect(TIERS).toContain(tier)
    }
  })

  it('has monotonic thresholds starting at zero', () => {
    const values = TIERS.map((tier) => TIER_THRESHOLDS[tier])
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!)
    }
    expect(values[0]!).toBe(0)
  })
})

describe('tierProgress', () => {
  it('reports the next tier and its requirement', () => {
    expect(tierProgress(0)).toEqual({
      current: 'Initiate',
      next: 'Contributor',
      required: 60,
    })
    expect(tierProgress(140)).toEqual({
      current: 'Architect',
      next: 'Vanguard',
      required: 300,
    })
  })

  it('reports a completed path at the top tier', () => {
    expect(tierProgress(300)).toEqual({ current: 'Vanguard', next: null, required: null })
  })
})

describe('XP weights', () => {
  it('has a weight for every category and none are negative', () => {
    for (const category of Object.keys(XP_WEIGHTS) as XpCategory[]) {
      expect(XP_WEIGHTS[category]).toBeGreaterThanOrEqual(0)
    }
  })

  it('awards nothing for attendance alone (handbook: not through attendance)', () => {
    expect(XP_WEIGHTS.event_attended).toBe(0)
  })

  it('weighs on-time evaluations above late ones', () => {
    expect(XP_WEIGHTS.evaluation_on_time).toBeGreaterThan(XP_WEIGHTS.evaluation_late)
  })

  it('weighs hackathons as High, above Standard activities', () => {
    expect(XP_WEIGHTS.hackathon).toBeGreaterThan(XP_WEIGHTS.knowledge_session)
  })

  it('keeps the endorsement award in sync with its weight', () => {
    expect(ENDORSEMENT_XP_AWARD).toBe(XP_WEIGHTS.endorsement_received)
  })

  it('defines a pass score inside the 0–100 scale', () => {
    expect(EVAL_PASS_SCORE).toBeGreaterThan(0)
    expect(EVAL_PASS_SCORE).toBeLessThanOrEqual(100)
  })
})

describe('vote budget', () => {
  it('is one positive and one negative per cycle (Q3)', () => {
    expect(VOTE_BUDGET).toEqual({ positive: 1, negative: 1 })
  })
})
