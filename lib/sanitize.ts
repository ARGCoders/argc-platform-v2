import 'server-only'
import DOMPurify from 'isomorphic-dompurify'

/**
 * `isomorphic-dompurify` pulls in jsdom. Importing it from a client component
 * bundles jsdom into the browser build and fails — hence `server-only` above.
 *
 * Call this at data-fetching time in a server component, never during render,
 * so the value handed to `dangerouslySetInnerHTML` is already clean.
 */

/** Tags the blog editor (PocketBase editor field / BlockNote) can emit. */
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
]

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'colspan', 'rowspan', 'start', 'type',
]

/**
 * DOMPurify runs ALLOWED_URI_REGEXP against every attribute it does not already
 * consider URI-safe. Our regexp is deliberately strict, so plain formatting
 * values (`width="800"`, `target="_blank"`) would fail the URL test and be
 * dropped. Listing them here exempts them from the URI check without loosening
 * the rules that actually guard href/src.
 */
const URI_SAFE_ATTR = [
  'target', 'rel', 'width', 'height', 'loading',
  'colspan', 'rowspan', 'start', 'type',
]

// Force every link that opens in a new tab to drop its opener reference.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Strips scripts, event handlers and anything outside the whitelist above.
 * Returns HTML that is safe to pass to `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,
    // Blocks javascript:, vbscript: and data: URLs in href and src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
  })
}

/**
 * Plain-text projection of editor HTML — used for excerpts and for the
 * "content >= 100 visible chars" validation on blog submit.
 */
export function stripHtml(dirty: string): string {
  if (!dirty) return ''
  const text = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return text.replace(/\s+/g, ' ').trim()
}
