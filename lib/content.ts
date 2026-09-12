import siteJson from '@/content/site.json'
import landingJson from '@/content/landing.json'
import voteJson from '@/content/vote.json'
import eventsJson from '@/content/events.json'
import dashboardOverviewJson from '@/content/dashboard-overview.json'
import type {
  SiteContent,
  LandingContent,
  VoteContent,
  EventsContent,
  DashboardOverviewContent,
} from '@/types/content'

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
export const vote: VoteContent = voteJson
export const events: EventsContent = eventsJson
export const dashboardOverview: DashboardOverviewContent = dashboardOverviewJson
