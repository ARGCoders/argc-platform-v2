import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Hack Night')).toBe('hack-night')
  })

  it('dissolves non-letter/number runs into a single hyphen', () => {
    expect(slugify('Hack — Night!!!')).toBe('hack-night')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('   -Hack-   ')).toBe('hack')
  })

  it('strips Latin diacritics instead of hyphenating them', () => {
    expect(slugify('Hàckathon')).toBe('hackathon')
  })

  it('keeps Arabic consonants intact rather than collapsing to hyphens', () => {
    expect(slugify('نادي البرمجة')).toBe('نادي-البرمجة')
  })
})
