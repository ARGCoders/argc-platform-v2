/**
 * Shapes for the editable copy in `content/*.json`.
 *
 * These files are the single place site copy lives — no strings are hardcoded
 * in components. Because `lib/content.ts` types the imports against these
 * interfaces, a malformed edit fails `pnpm build` rather than shipping a
 * broken page.
 *
 * Multi-line headlines are arrays: one entry per rendered line. This keeps
 * markup out of the JSON while preserving the intended line breaks.
 *
 * Only the hero is defined for now; the rest of the landing page is being
 * redesigned, and its content shape will be added alongside it.
 */

export interface NavLink {
  label: string
  href: string
}

/** Source repository for the /handbook route. */
export interface HandbookRepo {
  owner: string
  repo: string
  branch: string
}

export interface SiteContent {
  name: string
  /** Used as the <title> and the OG title. */
  title: string
  description: string
  nav: NavLink[]
  handbookRepo: HandbookRepo
}

export interface LandingContent {
  hero: {
    headline: string[]
    tagline: string
  }
  /** Copy for the Mission & Values section, directly below the hero. */
  missionValues: {
    /** Multi-line, same convention as hero.headline: one entry per rendered line. */
    statement: string[]
    detail: string
    /** `tag` is a short mono classifier (e.g. "Ledger"), not a sequence number. */
    values: { tag: string; text: string }[]
  }
  /** Copy for the Nodes section, directly below Mission & Values. Nodes are
   *  domain-based (per the handbook), not cohort-based — `stat` anchors the
   *  "4-6 people" fact, `domains` lists the four stable domains. */
  nodes: {
    /** Multi-line, same convention as hero.headline. */
    statement: string[]
    detail: string
    stat: { value: string; label: string }
    domains: { name: string; detail: string }[]
  }
  /** Copy for the Events section, directly below Nodes. Named `eventsPreview`
   *  (not `events`) to stay unambiguous against `content/events.json`'s own
   *  top-level shape (the full public `/events` page's copy) — these are
   *  unrelated content files with unrelated types. */
  eventsPreview: {
    heading: string
    detail: string
    cta: string
    empty: { title: string; description: string }
  }
  /** Copy for the Handbook section, directly below Events. */
  handbook: {
    heading: string
    detail: string
    /** Reflects what's currently pushed publicly in argc-handbook, not
     *  every folder that exists there — currently just Company and People.
     *  Grows as more groups get pushed; no code change needed, just this
     *  array. */
    categories: string[]
    /** Shown only if the live README fetch fails (lib/handbook.ts). */
    fallbackIntro: string
    cta: string
  }
  /** Copy for the Register CTA section, the last of the four UI-01
   *  sections. Framed as expressing interest, not a guaranteed-admission
   *  application — the handbook's membership.md is explicit that
   *  membership is nominated, not self-applied. */
  registerCta: {
    /** Multi-line, same convention as hero.headline. */
    statement: string[]
    detail: string
    cta: string
  }
}

/**
 * Copy for the cross-node vote surface (`/dashboard/vote`), member-facing
 * (MEMBER-12). The `reason.min` / `reason.max` values mirror the server-side
 * validation bounds so the form enforces the same limits without duplicating
 * them in code. `confirm.body` interpolates `{polarity}` and `{name}`.
 */
export interface VoteContent {
  title: string
  intro: string
  subject: {
    label: string
    empty: string
  }
  polarity: {
    label: string
    positive: string
    negative: string
    positiveHint: string
    negativeHint: string
  }
  reason: {
    label: string
    placeholder: string
    min: number
    max: number
    tooShort: string
    tooLong: string
    chars: string
  }
  submit: string
  confirm: {
    title: string
    body: string
    confirm: string
    back: string
  }
  success: string
  errors: {
    conflict: string
    default: string
  }
}

/** Copy for the public `/events` page (UI-15) — no login, no session state. */
export interface EventsContent {
  heading: string
  tagline: string
  filters: {
    all: string
    upcoming: string
    past: string
  }
  /** One empty-state message per filter tab — "no events" reads differently
   *  than "none upcoming" or "no history yet". */
  empty: Record<'all' | 'upcoming' | 'past', { title: string; description: string }>
}

/**
 * Copy for the node-leader evaluation surface (MEMBER-09): the
 * `EvaluationScheduleForm` and the member `EvaluationPipelineCard`.
 * `schedule.intro` interpolates `{name}` with the evaluatee's display name.
 */
export interface EvaluationsContent {
  schedule: {
    title: string
    intro: string
    date: {
      label: string
      required: string
    }
    evaluator: {
      label: string
      unassigned: string
    }
    submit: string
    success: string
    errors: {
      invalid: string
      conflict: string
      default: string
    }
  }
  pipeline: {
    title: string
    empty: {
      title: string
      description: string
    }
  }
}

/** Copy for `/dashboard/overview` (MEMBER-03). */
export interface DashboardOverviewContent {
  labels: {
    /** Prefixes the bare node name so it doesn't read as a stray heading. */
    node: string
  }
  sections: {
    evaluationStatus: string
    upcomingEvents: string
  }
  empty: {
    /** stats === null — no active cycle and no XP logged are the same shape,
     *  per me/stats' own contract; never distinguished in the UI. */
    noCycle: { title: string; description: string }
    noNode: { title: string; description: string }
    /** A stage with no evaluations row yet — distinct from any real EvalStatus. */
    noStageRecord: string
    noEvents: { title: string; description: string }
  }
}

/**
 * Copy for the node-leader event pipeline (MEMBER-14): the
 * `EventProposeForm`. `fields.type.options` keys are the `EventType` slugs the
 * POST route accepts; the values are what the form shows members.
 */
export interface NodeEventsContent {
  propose: {
    title: string
    intro: string
    fields: {
      title: {
        label: string
        placeholder: string
      }
      type: {
        label: string
        placeholder: string
        options: Record<string, string>
      }
      description: {
        label: string
        placeholder: string
      }
      starts_at: {
        label: string
        hint: string
      }
      location: {
        label: string
        placeholder: string
      }
      is_public: {
        label: string
        hint: string
      }
    }
    submit: string
    success: string
    errors: {
      titleRequired: string
      typeRequired: string
      startsAtRequired: string
      inPast: string
      invalid: string
      default: string
    }
  }
}

/** Copy for the public `/blog` index header (UI-15 blog feature). */
export interface BlogContent {
  header: {
    eyebrow: string
    title: string[]
    tagline: string
  }
}
