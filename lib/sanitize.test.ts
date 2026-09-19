import { describe, it, expect } from 'vitest'
import { sanitizeHtml, stripHtml, stripSanitizedHtml } from './sanitize'

/**
 * These payloads were used to validate the sanitizer by hand when it was
 * written. Encoding them here is what stops a future "simplification" of the
 * config from silently reopening an XSS hole.
 */
describe('sanitizeHtml', () => {
  const dangerous: Array<[string, string]> = [
    ['script tag', '<p>hi</p><script>alert(1)</script>'],
    ['img onerror', '<img src=x onerror="alert(1)">'],
    ['javascript: href', '<a href="javascript:alert(1)">click</a>'],
    ['vbscript: href', '<a href="vbscript:msgbox(1)">click</a>'],
    ['data: html href', '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
    ['svg animate', '<svg><animate onbegin=alert(1) attributeName=x dur=1s>'],
    ['iframe', '<iframe src="https://evil.test"></iframe>'],
    ['onclick attribute', '<div onclick="alert(1)">text</div>'],
    [
      'style with javascript url',
      '<div style="background:url(javascript:alert(1))">x</div>',
    ],
    ['form and input', '<form action="/x"><input name=a></form>'],
    ['object embed', '<object data="evil.swf"></object>'],
  ]

  it.each(dangerous)('strips %s', (_name, input) => {
    const out = sanitizeHtml(input)
    expect(out).not.toMatch(
      /<script|<iframe|<svg|<form|<object|onerror|onclick|onbegin|javascript:|vbscript:|data:text\/html/i,
    )
  })

  it('keeps ordinary formatting markup', () => {
    const out = sanitizeHtml(
      '<h2>Title</h2><p><strong>bold</strong> and <em>italic</em></p><ul><li>one</li></ul><pre><code>x = 1</code></pre>',
    )
    expect(out).toContain('<h2>Title</h2>')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<li>one</li>')
    expect(out).toContain('<code>x = 1</code>')
  })

  /**
   * Regression guard. ALLOWED_URI_REGEXP is applied to every attribute
   * DOMPurify does not already treat as URI-safe, so without ADD_URI_SAFE_ATTR
   * these plain formatting values fail the URL test and are silently dropped.
   */
  it('preserves non-URI attributes that the strict URI regexp would reject', () => {
    const out = sanitizeHtml(
      '<img src="https://cdn.intra.42.fr/a.png" alt="pic" width="800" height="20" loading="lazy">',
    )
    expect(out).toContain('width="800"')
    expect(out).toContain('height="20"')
    expect(out).toContain('loading="lazy"')
    expect(out).toContain('alt="pic"')
  })

  it('preserves table and list layout attributes', () => {
    const out = sanitizeHtml(
      '<table><tr><td colspan="2" class="x">c</td></tr></table><ol start="3"><li>a</li></ol>',
    )
    expect(out).toContain('colspan="2"')
    expect(out).toContain('start="3"')
  })

  /** Without this the target survives but the opener reference leaks. */
  it('adds rel="noopener noreferrer" to target="_blank" links', () => {
    const out = sanitizeHtml('<a href="https://x.test" target="_blank">ext</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('keeps relative, mailto and anchor links', () => {
    expect(sanitizeHtml('<a href="/blog">x</a>')).toContain('href="/blog"')
    expect(sanitizeHtml('<a href="mailto:a@b.test">x</a>')).toContain('href="mailto:')
    expect(sanitizeHtml('<a href="#top">x</a>')).toContain('href="#top"')
  })

  // Regression guard: a leading "/" alone isn't enough to prove a same-site
  // relative path — "//host/path" is protocol-relative and resolves to an
  // arbitrary off-site origin, but a naive /^\// match would let it through.
  it('rejects protocol-relative URLs despite starting with "/"', () => {
    expect(sanitizeHtml('<a href="//attacker.test/x">x</a>')).not.toContain('href')
  })

  /**
   * Pins ALLOWED_URI_REGEXP specifically.
   *
   * The javascript:/vbscript:/data: cases above pass on DOMPurify's default
   * regexp alone, so they do not prove our stricter one is present. These
   * schemes are the difference: the default permits all of them, ours does not.
   * Drop ALLOWED_URI_REGEXP from sanitize.ts and this is the test that reddens.
   */
  it.each(['ftp://x.test/f', 'sms:+123', 'xmpp:a@b', 'cid:abc', 'callto:123'])(
    'rejects the %s scheme, which DOMPurify would allow by default',
    (url) => {
      expect(sanitizeHtml(`<a href="${url}">x</a>`)).not.toContain('href')
    },
  )

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('stripHtml', () => {
  it('returns visible text only', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('collapses whitespace', () => {
    expect(stripHtml('<p>a\n\n   b</p>')).toBe('a b')
  })

  /**
   * The blog submit route counts these characters. Measuring raw HTML instead
   * would let a document with no text pass on markup length alone.
   */
  it('does not count markup toward length', () => {
    const markupHeavy = '<div><span><em><strong></strong></em></span></div>'
    expect(stripHtml(markupHeavy).length).toBe(0)
  })

  it('drops script contents entirely', () => {
    expect(stripHtml('<p>ok</p><script>alert(1)</script>')).toBe('ok')
  })
})

describe('stripSanitizedHtml', () => {
  // Same input/output contract as stripHtml, on already-sanitized input —
  // the two must agree, since stripSanitizedHtml exists purely as a cheaper
  // way to get the same result when the input is already known-safe.
  it('returns visible text only, matching stripHtml on the same markup', () => {
    const markup = '<p>Hello <strong>world</strong></p>'
    expect(stripSanitizedHtml(markup)).toBe(stripHtml(markup))
    expect(stripSanitizedHtml(markup)).toBe('Hello world')
  })

  // Regression guard: a naive tag->space replacement would insert a space
  // at every tag boundary, producing "Seven nodes ship ." instead of
  // "Seven nodes ship." — tags must strip to nothing, not a space, since
  // any real whitespace is already present in the text nodes themselves.
  it('does not insert a space at a tag boundary with no whitespace in the source', () => {
    expect(stripSanitizedHtml('<p>Seven nodes <strong>ship</strong>.</p>')).toBe(
      'Seven nodes ship.',
    )
  })

  it('collapses whitespace', () => {
    expect(stripSanitizedHtml('<p>a\n\n   b</p>')).toBe('a b')
  })

  // DOMPurify's string serializer re-escapes &, <, > in text content (the
  // three that must be escaped there); stripSanitizedHtml has to decode
  // them back since it isn't running a real parser.
  it('decodes the entities DOMPurify emits for &, <, >, quotes', () => {
    expect(stripSanitizedHtml('Reviews &amp; retros')).toBe('Reviews & retros')
    expect(stripSanitizedHtml('a &lt; b &gt; c')).toBe('a < b > c')
    expect(stripSanitizedHtml('say &quot;hi&quot;')).toBe('say "hi"')
    expect(stripSanitizedHtml('don&#39;t')).toBe("don't")
  })

  it('returns an empty string for empty input', () => {
    expect(stripSanitizedHtml('')).toBe('')
  })
})
