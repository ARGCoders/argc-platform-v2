/**
 * Renders an article body. The HTML is sanitized at fetch time in lib/blog.ts —
 * never call sanitizeHtml here, and never pass unsanitized content in.
 * Typography lives in the `.article-body` block in app/globals.css.
 */
export function PostBody({ html }: { html: string }) {
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
}
