import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { AsciiBoot } from './ascii-boot'

const BLINK_MS = 140
const FRAME_MS = 45
const HOLD_MS = 500
const FADE_MS = 300

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * Elapsed time from mount to when the last (settled) frame is painted, for a
 * single-frame preamble + a full typing sequence — matches the component's
 * own `elapsed` accumulation exactly (schedule-then-increment per frame).
 */
function totalDuration(target: string) {
  const typingFrameCount = target.length + 1 + 1 // cursor frames 0..len, plus the settled frame
  return BLINK_MS + typingFrameCount * FRAME_MS
}

const fetchSpy = vi.fn()

beforeEach(() => {
  fetchSpy.mockReset()
  fetchSpy.mockResolvedValue(new Response('', { status: 200 })) // one empty preamble frame
  vi.stubGlobal('fetch', fetchSpy)
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('AsciiBoot', () => {
  it('renders nothing when the user prefers reduced motion', async () => {
    stubMatchMedia(true)

    const { container } = render(<AsciiBoot nodeName="Ignition" />)

    await waitFor(() => expect(container.querySelector('pre')).not.toBeInTheDocument())
  })

  it('is decorative — aria-hidden while it plays', async () => {
    stubMatchMedia(false)

    const { container } = render(<AsciiBoot nodeName="Ignition" />)

    await waitFor(() =>
      expect(container.querySelector('pre')).toHaveAttribute('aria-hidden', 'true'),
    )
  })

  it('uses the light-surface palette when surface="light"', async () => {
    stubMatchMedia(false)

    const { container } = render(<AsciiBoot nodeName="Ignition" surface="light" />)

    await waitFor(() => {
      const pre = container.querySelector('pre')
      expect(pre?.className).toContain('text-muted-foreground/60')
      expect(pre?.className).not.toContain('sidebar-foreground')
    })
  })

  it('settles on the real node name, not invented flavor text', async () => {
    stubMatchMedia(false)
    vi.useFakeTimers()

    const { container } = render(<AsciiBoot nodeName="Ignition" />)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(totalDuration('› LINKED: IGNITION') + 5)

    expect(container.querySelector('pre')?.textContent).toBe('› LINKED: IGNITION')
  })

  it('falls back to ARGC when the member is not in a node', async () => {
    stubMatchMedia(false)
    vi.useFakeTimers()

    const { container } = render(<AsciiBoot nodeName={null} />)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(totalDuration('› LINKED: ARGC') + 5)

    expect(container.querySelector('pre')?.textContent).toBe('› LINKED: ARGC')
  })

  // Regression guard: this must finish and disappear well within ~2s, since
  // it's a one-time flourish, not a permanent fixture that could compete
  // with the page's own XP-number hierarchy.
  it('fades out and unmounts itself after the hold period', async () => {
    stubMatchMedia(false)
    vi.useFakeTimers()

    const { container } = render(<AsciiBoot nodeName="Ignition" />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(container.querySelector('pre')).toBeInTheDocument()

    await act(() =>
      vi.advanceTimersByTimeAsync(
        totalDuration('› LINKED: IGNITION') + HOLD_MS + FADE_MS + 50,
      ),
    )

    expect(container.querySelector('pre')).not.toBeInTheDocument()
  })

  it('settles quietly if the frame fetch fails, rather than getting stuck', async () => {
    stubMatchMedia(false)
    fetchSpy.mockRejectedValue(new Error('network error'))

    const { container } = render(<AsciiBoot nodeName="Ignition" />)

    await waitFor(() => expect(container.querySelector('pre')).not.toBeInTheDocument())
  })

  // Regression guard: without this, a member visiting this page daily (it's
  // the first dashboard sidebar link, and the page refetches every visit)
  // would replay the full sequence every single time.
  it('plays at most once per session', async () => {
    stubMatchMedia(false)

    const first = render(<AsciiBoot nodeName="Ignition" />)
    await waitFor(() => expect(first.container.querySelector('pre')).toBeInTheDocument())
    first.unmount()

    const second = render(<AsciiBoot nodeName="Ignition" />)
    await waitFor(() =>
      expect(second.container.querySelector('pre')).not.toBeInTheDocument(),
    )
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
