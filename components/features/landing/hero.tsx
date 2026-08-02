import AsciiCanvas from './ascii-canvas-client'
import { landing } from '@/lib/content'

export function Hero() {
  const { headline, tagline } = landing.hero

  return (
    <section
      id="home"
      aria-label="Hero"
      className="relative min-h-svh bg-argc-maroon overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <AsciiCanvas />
      </div>

      <div className="absolute bottom-[clamp(5rem,12vh,9rem)] left-[clamp(1.5rem,5vw,4rem)] z-10 max-w-xl">
        <h1
          className={[
            'font-sans font-bold text-hero-ink leading-[1.04] tracking-[-0.025em]',
            'text-[clamp(3rem,7vw,5.5rem)]',
            '[text-wrap:balance]',
            'opacity-0 translate-y-5 animate-[hero-rise_0.9s_0.45s_var(--ease-expo)_forwards]',
          ].join(' ')}
        >
          {headline.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
      </div>

      <div
        className={[
          'absolute bottom-[clamp(1.75rem,4vh,2.5rem)] left-[clamp(1.5rem,5vw,4rem)] z-10',
          'flex items-start gap-3 max-w-[36rem]',
          'opacity-0 translate-y-2.5 animate-[hero-rise_0.8s_0.75s_var(--ease-expo)_forwards]',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="shrink-0 self-start mt-[0.4em] w-3.5 h-3.5 rounded-full bg-hero-ink-muted"
        />
        <p className="text-[clamp(0.8125rem,1.1vw,0.9375rem)] font-sans leading-[1.65] text-hero-ink-muted max-w-[54ch]">
          {tagline}
        </p>
      </div>

      <div
        aria-hidden="true"
        className={[
          'hidden md:flex absolute bottom-[clamp(1.75rem,4vh,2.5rem)] right-[clamp(1.5rem,4vw,3rem)] z-10',
          'flex-col items-center',
          'opacity-0 animate-[hero-rise_0.8s_1s_var(--ease-expo)_forwards]',
        ].join(' ')}
      >
        <span className="block w-px h-14 bg-gradient-to-b from-hero-ink-muted to-transparent animate-[scroll-pulse_2s_1.2s_var(--ease-expo)_infinite]" />
      </div>
    </section>
  )
}
