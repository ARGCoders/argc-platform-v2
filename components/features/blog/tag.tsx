/**
 * Bracket tag label — monospace, all-caps, `[LIKE THIS]`. Not a pill; tags
 * are flat technical labels reported by the system (DESIGN.md's
 * Mono-Reports rule), not a filter control — they carry no href or onClick.
 */
export function Tag({ children }: { children: string }) {
  return (
    <span className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-ink-muted">
      [{children.toUpperCase()}]
    </span>
  )
}
