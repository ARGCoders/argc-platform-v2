'use client'

import { useEffect, useRef } from 'react'

const FPS = 24
const FRAME_MS = 1000 / FPS

/** Record separator written by scripts/build-ascii-frames.mjs. */
const SEPARATOR = '\f'
const FRAMES_URL = '/ascii/frames.txt'

/**
 * The hero animation.
 *
 * V1 imported the 241 frames as a TypeScript module, which compiled into a
 * 19.3 MB JavaScript chunk that every visitor downloaded and the engine had to
 * parse. Here the frames are a static asset: fetched once, served compressed by
 * the CDN, and never parsed as JavaScript.
 *
 * Frames live in a ref and are painted straight to `textContent`. Holding 241
 * strings in React state would re-render the tree 24 times a second for a
 * purely decorative element.
 */
export default function AsciiCanvas() {
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const pre = preRef.current
    if (!pre) return

    const controller = new AbortController()
    let frames: string[] = []
    let index = 0
    let lastTime = 0
    let rafId = 0
    let running = false
    let inView = true

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    function tick(ts: number) {
      if (!running) return
      if (ts - lastTime >= FRAME_MS) {
        pre!.textContent = frames[index] ?? ''
        index = (index + 1) % frames.length
        lastTime = ts
      }
      rafId = requestAnimationFrame(tick)
    }

    function start() {
      if (running || prefersReducedMotion || frames.length === 0) return
      if (document.hidden || !inView) return
      running = true
      lastTime = 0
      rafId = requestAnimationFrame(tick)
    }

    function stop() {
      running = false
      cancelAnimationFrame(rafId)
    }

    const onVisibility = () => (document.hidden ? stop() : start())

    // Pause when scrolled past — an offscreen 24fps loop is wasted battery.
    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? false
        if (inView) start()
        else stop()
      },
      { threshold: 0 },
    )

    const section = pre.closest('section')
    if (section) observer.observe(section)
    document.addEventListener('visibilitychange', onVisibility)

    fetch(FRAMES_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`ascii frames: ${res.status}`)
        return res.text()
      })
      .then((text) => {
        frames = text.split(SEPARATOR)
        if (frames.length === 0) return

        if (prefersReducedMotion) {
          // Respect the preference with a single representative still rather
          // than nothing at all — the art is part of the page, not an effect.
          pre.textContent = frames[Math.floor(frames.length / 2)] ?? ''
          return
        }

        pre.textContent = frames[0] ?? ''
        start()
      })
      .catch(() => {
        // Decorative: a failed fetch leaves the maroon hero intact.
      })

    return () => {
      controller.abort()
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className={[
        'font-mono select-none pointer-events-none',
        // The art is 533 columns of ink edge to edge, so the <pre> is always
        // wider than the viewport and the parent crops it. Bigger type means a
        // tighter crop, not more art — at 8px the form stops reading.
        //
        // On desktop the ceiling binds, not the vw term, so the ceiling is the
        // number that matters. V1 used clamp(3px,0.58vw,6.5px); this is a
        // deliberate ~15% increase, measured at 1.66x viewport width on a
        // 1440px screen.
        'text-[clamp(3.4px,0.66vw,7.5px)] leading-[1.2]',
        'whitespace-pre will-change-contents',
        'text-hero-ink/100',
      ].join(' ')}
    />
  )
}
