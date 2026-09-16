import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHandbookIntro } from './handbook'

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
