import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders a live-fetched handbook article's markdown. Typography lives in
 * the `.article-body` block in app/globals.css (already built for `/blog`'s
 * `PostBody`) — standard HTML tags is exactly what `ReactMarkdown` renders,
 * so reusing it here needs no new CSS. Unlike `PostBody`, there is no
 * `dangerouslySetInnerHTML` and no sanitize step: `ReactMarkdown` renders
 * to React elements directly and never injects raw HTML by default, so a
 * markdown string from the source repo has no XSS surface to sanitize.
 */
export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="article-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  )
}
