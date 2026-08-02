import siteJson from '@/content/site.json'
import landingJson from '@/content/landing.json'
import type { SiteContent, LandingContent } from '@/types/content'

/**
 * Typed accessors for the editable copy in `content/`.
 *
 * Import from here, never from the JSON directly: the annotations below are
 * what make a malformed edit a build error instead of a runtime surprise.
 * Rewording or reordering entries needs no code change — only a structural
 * change does.
 *
 * Safe to import from both server and client components; the JSON is inlined
 * at build time.
 */
export const site: SiteContent = siteJson
export const landing: LandingContent = landingJson
