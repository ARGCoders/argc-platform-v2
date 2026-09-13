'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const FRAMES_URL = '/ascii/dashboard-boot.txt'
/** Record separator written alongside the hero's own frame asset convention. */
const SEPARATOR = '\f'
// The fetched asset is a pure cursor-blink warm-up — fully static and
// decorative, so it's the one part that still makes sense as a shared,
// fetched text asset. Everything with real content (the prompt text, the
// node name) is generated in-component instead: it's per-user data, so it
// was never a candidate for a shared static asset in the first place — no
// different from how EVAL_STAGE_LABELS or formatEventDate render real data
// elsewhere on this page without going through a fetch.
const BLINK_MS = 140
const FRAME_MS = 45
const HOLD_MS = 500
const FADE_MS = 300
const CURSOR = '█'
/** Plays at most once per session — this page is the first dashboard sidebar
 *  link and refetches on every visit, so without this a daily visitor would
 *  replay the full sequence every single time. */
const SESSION_KEY = 'argc:overview-boot-played'

type Phase = 'typing' | 'fading' | 'done'

function buildTypingFrames(target: string): string[] {
  const frames: string[] = []
  for (let i = 0; i <= target.length; i++) {
    frames.push(target.slice(0, i) + CURSOR)
  }
  frames.push(target) // settled, cursor removed
  return frames
}

/**
 * A one-time "boot" flourish for /dashboard/overview only — a deliberate,
 * scoped exception to AsciiCanvas's "appears exactly once" rule (see
 * DESIGN.md, ASCII Canvas). Not the hero component reused: a distinct,
 * much smaller sibling built for a different job — a short type-in that
 * plays once per session, holds, fades, then unmounts entirely, so it never
 * becomes a permanent element competing with this page's own XP-number
 * hierarchy.
 *
 * The typed line names the member's actual node ("› LINKED: IGNITION") or
 * falls back to "› LINKED: ARGC" when they aren't in one yet — real data,
 * not invented flavor text, so it can't be mistaken for a fabricated claim.
 *
 * Still fetches its (purely decorative) preamble as a static text asset
 * rather than a bundled JS module (the hero's own lesson — see
 * build-ascii-frames.mjs), and still paints frames straight to `textContent`
 * via a ref rather than React state, the same reason the hero avoids
 * per-frame re-renders. Unlike the hero, it doesn't need
 * requestAnimationFrame or a visibility/tab-blur pause — those exist there
 * to manage an animation that would otherwise run forever; this one runs
 * once, for well under two seconds, regardless of tab focus.
 *
 * Exit is a combined height-collapse + fade (via a CSS grid-rows trick,
 * `1fr` -> `0fr`) rather than an abrupt unmount, so the node-name/XP content
 * below settles into place smoothly instead of jumping the instant the
 * flourish disappears.
 *
 * Takes `surface: 'dark' | 'light'` like the rest of the dashboard family
 * (default `'dark'`, the app's only real dashboard surface today) — added
 * so OverviewContent can be exercised on a light background in a preview
 * without leaving this one piece visibly wrong-toned.
 */
export function AsciiBoot({
  nodeName,
  surface = 'dark',
}: {
  nodeName: string | null
  surface?: 'dark' | 'light'
}) {
  const preRef = useRef<HTMLPreElement>(null)
  const [phase, setPhase] = useState<Phase>('typing')

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let alreadyPlayed = false
    try {
      alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      // Storage can throw in some privacy modes — treat it as "not played"
      // rather than crash a purely decorative flourish over it.
    }

    if (prefersReducedMotion || alreadyPlayed) {
      // Deferred a tick so setState never runs synchronously inside the
      // effect body itself. Unlike the hero's canvas, there's no single
      // frame worth freezing on for reduced-motion — the type-in motion is
      // the whole point — so this renders nothing rather than a static still.
      Promise.resolve().then(() => setPhase('done'))
      return
    }

    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // Non-fatal either way — see above.
    }

    const controller = new AbortController()
    const timers: ReturnType<typeof setTimeout>[] = []
    const target = `› LINKED: ${nodeName ? nodeName.toUpperCase() : 'ARGC'}`

    fetch(FRAMES_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`ascii boot frames: ${res.status}`)
        return res.text()
      })
      .then((text) => {
        const preamble = text.split(SEPARATOR)
        const sequence = [
          ...preamble.map((frame) => ({ frame, delay: BLINK_MS })),
          ...buildTypingFrames(target).map((frame) => ({ frame, delay: FRAME_MS })),
        ]

        let elapsed = 0
        sequence.forEach(({ frame, delay }) => {
          timers.push(
            setTimeout(() => {
              if (preRef.current) preRef.current.textContent = frame
            }, elapsed),
          )
          elapsed += delay
        })

        timers.push(setTimeout(() => setPhase('fading'), elapsed + HOLD_MS))
        timers.push(setTimeout(() => setPhase('done'), elapsed + HOLD_MS + FADE_MS))
      })
      .catch(() => {
        // Decorative: a failed fetch just skips straight to the settled page.
        setPhase('done')
      })

    return () => {
      controller.abort()
      timers.forEach(clearTimeout)
    }
  }, [nodeName])

  if (phase === 'done') return null

  return (
    <div
      style={{ gridTemplateRows: phase === 'fading' ? '0fr' : '1fr' }}
      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className={cn(
            'font-mono select-none pointer-events-none',
            'text-[0.68rem] leading-tight tracking-[0.05em]',
            surface === 'dark'
              ? 'text-sidebar-foreground/40'
              : 'text-muted-foreground/60',
            'transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            phase === 'fading' ? 'opacity-0' : 'opacity-100',
          )}
        />
      </div>
    </div>
  )
}
