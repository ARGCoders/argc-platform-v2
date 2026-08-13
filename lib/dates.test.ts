import { describe, it, expect } from 'vitest'
import { formatBlogDate } from './dates'

describe('formatBlogDate', () => {
  it('formats an ISO date in the ARGC mono style', () => {
    expect(formatBlogDate('2026-08-13T10:00:00.000Z')).toBe('13 AUG 2026')
  })

  it('returns an empty string for invalid input', () => {
    expect(formatBlogDate('not-a-date')).toBe('')
  })
})
