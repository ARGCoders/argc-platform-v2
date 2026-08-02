import { describe, it, expect } from 'vitest'
import { ROLE_HIERARCHY, roleAtLeast, isSafeRedirect, ROLE_LABELS } from './constants'
import type { Role } from '@/types/pocketbase'

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
