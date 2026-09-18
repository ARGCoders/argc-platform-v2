import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getHandbookArticle,
  getHandbookCategories,
  getHandbookIntro,
  getHandbookSiblings,
} from './handbook'

const fetchSpy = vi.fn()

beforeEach(() => {
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})

describe('getHandbookIntro', () => {
  it('extracts the intro and strips the H1 heading', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        '# The ARGC Handbook\n\n**ARGC** is a collective.\n\nSecond paragraph.\n\n---\n\n## Contents\n',
        { status: 200 },
      ),
    )

    const intro = await getHandbookIntro()

    expect(intro).toBe('**ARGC** is a collective.\n\nSecond paragraph.')
  })

  // Regression guard: the Contents table (everything after `---`) is
  // confirmed stale — it must never appear in the returned intro.
  it('never includes content past the first divider', async () => {
    fetchSpy.mockResolvedValue(
      new Response('# Heading\n\nIntro text.\n\n---\n\n| Section | Link |\n', {
        status: 200,
      }),
    )

    const intro = await getHandbookIntro()

    expect(intro).not.toContain('Section')
    expect(intro).not.toContain('Link')
  })

  it('returns null when the fetch response is not ok', async () => {
    fetchSpy.mockResolvedValue(new Response('Not Found', { status: 404 }))

    expect(await getHandbookIntro()).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'))

    expect(await getHandbookIntro()).toBeNull()
  })

  it('returns null when the response has no divider to bound the intro', async () => {
    fetchSpy.mockResolvedValue(new Response('# Heading only, no body', { status: 200 }))

    expect(await getHandbookIntro()).toBeNull()
  })
})

describe('getHandbookCategories', () => {
  it('returns the hand-maintained catalog, currently Company and People', () => {
    const categories = getHandbookCategories()
    const slugs = categories.map((c) => c.slug)

    expect(slugs).toContain('company')
    expect(slugs).toContain('people')
    // Regression guard: the catalog is deliberately hand-maintained, not
    // derived from the real repo's full 5-category structure — it must
    // never silently grow to include un-pushed groups.
    expect(slugs).not.toContain('protocols')
    expect(slugs).not.toContain('ecosystem')
    expect(slugs).not.toContain('operations')
  })
})

describe('getHandbookArticle', () => {
  it('returns not-found for a category not in the catalog', async () => {
    expect(await getHandbookArticle('protocols', 'anything')).toEqual({
      status: 'not-found',
    })
  })

  it('returns not-found for an article slug not in a real category', async () => {
    expect(await getHandbookArticle('company', 'not-a-real-article')).toEqual({
      status: 'not-found',
    })
  })

  it('fetches, strips the heading and footer link, and returns the article', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        '# Mission\n\nARGC exists to build things that last.\n\n---\n\n[← Back to Handbook](./README.md)\n',
        { status: 200 },
      ),
    )

    const result = await getHandbookArticle('company', 'mission')

    expect(result).toEqual({
      status: 'ok',
      title: 'Mission',
      markdown: 'ARGC exists to build things that last.',
    })
  })

  // Regression guard: the footer's relative path varies by file depth
  // (`./README.md` vs `../README.md`) — stripping must not depend on which.
  it('strips the footer link regardless of its relative path', async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        '# Onboarding\n\nBody text.\n\n---\n\n[← Back to Handbook](../README.md)\n',
        { status: 200 },
      ),
    )

    const result = await getHandbookArticle('people', 'onboarding')

    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.markdown).toBe('Body text.')
      expect(result.markdown).not.toContain('Back to Handbook')
    }
  })

  it('returns a distinct error status (not not-found) when the fetch is non-ok', async () => {
    fetchSpy.mockResolvedValue(new Response('Server error', { status: 500 }))

    expect(await getHandbookArticle('company', 'mission')).toEqual({ status: 'error' })
  })

  it('returns a distinct error status (not not-found) when fetch throws', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'))

    expect(await getHandbookArticle('company', 'mission')).toEqual({ status: 'error' })
  })
})

describe('getHandbookSiblings', () => {
  it('returns null prev and the next article for the first article in a group', () => {
    expect(getHandbookSiblings('company', 'mission')).toEqual({
      prev: null,
      next: { slug: 'vision', title: 'Vision', path: '01-company/02-vision.md' },
    })
  })

  it('returns null next and the prev article for the last article in a group', () => {
    expect(getHandbookSiblings('company', 'structure')).toEqual({
      prev: { slug: 'history', title: 'History', path: '01-company/04-history.md' },
      next: null,
    })
  })

  it('returns both prev and next for a middle article', () => {
    const { prev, next } = getHandbookSiblings('company', 'values')
    expect(prev?.slug).toBe('vision')
    expect(next?.slug).toBe('history')
  })

  it('never crosses category boundaries', () => {
    // Last article of Company must not point "next" into People.
    expect(getHandbookSiblings('company', 'structure').next).toBeNull()
  })

  it('returns nulls for an article not in the catalog', () => {
    expect(getHandbookSiblings('company', 'not-a-real-article')).toEqual({
      prev: null,
      next: null,
    })
  })
})
