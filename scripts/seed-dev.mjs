/**
 * Development seed data.
 *
 * Populates a local PocketBase with a coherent development dataset: one user
 * per role, two nodes with members and leaders, an active advancement cycle
 * (plus a closed one), XP ledger + user_stats rows that match the tier
 * thresholds in lib/constants.ts, events with attendance, evaluations at
 * every stage, cross-node votes and endorsements (one with a fixed public
 * token so the /endorse flow can be exercised).
 *
 * Run against a schema that was set up first:
 *
 *   pnpm db:setup     # collections — schema as code
 *   pnpm db:seed      # records — this script
 *
 * Idempotent: safe to re-run. Existing records are detected by their unique
 * fields and skipped. XP amounts mirror XP_WEIGHTS in lib/constants.ts —
 * keep them in step.
 *
 * The seeded users share one dev-only password (documented in README) and
 * must never be created against the deployed instance.
 */
import PocketBase from 'pocketbase'
import { readFileSync, existsSync } from 'node:fs'

// Load .env without adding a dependency; Next does this itself at runtime.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD

if (!PB_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD.',
  )
  process.exit(1)
}

const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

// Shared password for seeded users. Dev-only, never used in production.
const SEED_PASSWORD = 'argc-seed-pass'

// ─── Dataset ────────────────────────────────────────────────────────────────

const USERS = [
  { login: 'sa-dev', name: 'Super Admin Dev', role: 'super_admin_peer' },
  { login: 'sp-dev', name: 'Super Peer Dev', role: 'super_peer' },
  { login: 'lead-alpha', name: 'Leila Haddad', role: 'node_leader' },
  { login: 'lead-beta', name: 'Omar Nasser', role: 'node_leader' },
  { login: 'mem-a1', name: 'Yousef Khalil', role: 'node_peer' },
  { login: 'mem-a2', name: 'Sara Mansour', role: 'node_peer' },
  { login: 'mem-b1', name: 'Adam Rahmeh', role: 'node_peer' },
  { login: 'mem-b2', name: 'Nour Awad', role: 'node_peer' },
]

const NODES = [
  { slug: 'alpha', name: 'Node Alpha', cohort: 'c25' },
  { slug: 'beta', name: 'Node Beta', cohort: 'c25' },
]

// user login -> { node, role } for the node_member join table.
const NODE_MEMBERS = {
  'lead-alpha': { node: 'alpha', role: 'leader' },
  'lead-beta': { node: 'beta', role: 'leader' },
  'mem-a1': { node: 'alpha', role: 'member' },
  'mem-a2': { node: 'alpha', role: 'member' },
  'mem-b1': { node: 'beta', role: 'member' },
  'mem-b2': { node: 'beta', role: 'member' },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const summary = { created: 0, skipped: 0, failed: [] }

/** First record matching a filter, or null when none exists. */
async function findOne(collection, filter, params) {
  try {
    return await pb.collection(collection).getFirstListItem(pb.filter(filter, params))
  } catch {
    return null
  }
}

function created(what) {
  summary.created++
  console.log(`  + ${what}`)
}

function skipped(what) {
  summary.skipped++
  console.log(`  = ${what} (exists)`)
}

async function ensureRecord(collection, filter, params, data, label) {
  const existing = await findOne(collection, filter, params)
  if (existing) {
    skipped(label)
    return existing
  }
  try {
    const record = await pb.collection(collection).create(data)
    created(label)
    return record
  } catch (err) {
    summary.failed.push(`${label}: ${err.message ?? err}`)
    console.error(`  ! ${label}: ${err.message ?? err}`)
    return null
  }
}

// ─── Evaluations dataset (single source for records and stats counts) ───────

const EVALS = [
  {
    eval: 'mem-a1',
    by: 'mem-a2',
    stage: 'standard_1',
    status: 'completed',
    score: 78,
    at: '2026-08-10T14:00:00.000Z',
  },
  {
    eval: 'mem-a1',
    by: 'mem-b1',
    stage: 'standard_2',
    status: 'scheduled',
    at: '2026-08-25T14:00:00.000Z',
  },
  { eval: 'mem-a1', by: 'lead-alpha', stage: 'eval_plus_node_leader', status: 'pending' },
  {
    eval: 'mem-a2',
    by: 'mem-a1',
    stage: 'standard_1',
    status: 'completed',
    score: 65,
    at: '2026-08-05T14:00:00.000Z',
  },
  // Late completion: the +10 evaluation_late XP entry above mirrors this.
  {
    eval: 'mem-a2',
    by: 'mem-b2',
    stage: 'standard_2',
    status: 'completed',
    late: true,
    score: 70,
    at: '2026-08-12T14:00:00.000Z',
  },
  { eval: 'mem-a2', by: 'lead-alpha', stage: 'eval_plus_node_leader', status: 'pending' },
  {
    eval: 'mem-b1',
    by: 'mem-b2',
    stage: 'standard_1',
    status: 'completed',
    score: 80,
    at: '2026-08-08T14:00:00.000Z',
  },
  { eval: 'mem-b1', by: 'mem-a1', stage: 'standard_2', status: 'pending' },
  { eval: 'mem-b1', by: 'lead-beta', stage: 'eval_plus_node_leader', status: 'pending' },
  {
    eval: 'mem-b2',
    by: 'mem-b1',
    stage: 'standard_1',
    status: 'scheduled',
    at: '2026-08-27T14:00:00.000Z',
  },
]

/** Evaluation counts for a user_stats row, derived from the EVALS dataset. */
function countsFor(login) {
  const evals = EVALS.filter((e) => e.eval === login)
  return {
    evaluations_completed: evals.filter((e) => e.status === 'completed').length,
    evaluations_late: evals.filter((e) => e.status === 'completed' && e.late).length,
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nPocketBase: ${PB_URL}`)
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log('Authenticated.\n')

  // Guard: the schema must exist before records can reference it.
  const collections = await pb.collections.getFullList()
  const present = new Set(collections.map((c) => c.name))
  const needed = [
    'users',
    'node',
    'node_member',
    'advancement_cycles',
    'xp_ledger',
    'user_stats',
    'evaluations',
    'events',
    'event_attendance',
    'votes',
    'endorsements',
  ]
  const missing = needed.filter((name) => !present.has(name))
  if (missing.length > 0) {
    console.error(`Missing collections: ${missing.join(', ')}. Run pnpm db:setup first.`)
    process.exit(1)
  }

  console.log('users')
  const byLogin = {}
  for (const u of USERS) {
    const record = await ensureRecord(
      'users',
      'intra_login = {:login}',
      { login: u.login },
      {
        email: `${u.login}@argc.dev`,
        password: SEED_PASSWORD,
        passwordConfirm: SEED_PASSWORD,
        emailVisibility: false,
        verified: true,
        intra_id: `seed-${u.login}`,
        intra_login: u.login,
        display_name: u.name,
        avatar_url: '',
        role: u.role,
        last_sync_at: new Date('2026-08-16T00:00:00.000Z').toISOString(),
      },
      `user ${u.login} (${u.role})`,
    )
    byLogin[u.login] = record
  }
  if (Object.values(byLogin).some((r) => r === null)) {
    console.error('\nAborting: not all users could be resolved.')
    process.exit(1)
  }

  console.log('\nnodes and membership')
  const bySlug = {}
  for (const n of NODES) {
    const record = await ensureRecord(
      'node',
      'slug = {:slug}',
      { slug: n.slug },
      { name: n.name, slug: n.slug, cohort: n.cohort, status: 'active' },
      `node ${n.slug}`,
    )
    bySlug[n.slug] = record
  }
  for (const [login, m] of Object.entries(NODE_MEMBERS)) {
    await ensureRecord(
      'node_member',
      'user = {:user} && node = {:node}',
      { user: byLogin[login].id, node: bySlug[m.node].id },
      {
        role: m.role,
        user: byLogin[login].id,
        node: bySlug[m.node].id,
        joined_at: '2026-08-01 00:00:00.000Z',
      },
      `node_member ${login} → ${m.node} (${m.role})`,
    )
  }

  console.log('\nadvancement cycles')
  const summer = await ensureRecord(
    'advancement_cycles',
    'slug = {:slug}',
    { slug: 'summer-2026' },
    {
      label: 'Summer 2026',
      slug: 'summer-2026',
      starts_at: '2026-05-01 00:00:00.000Z',
      ends_at: '2026-07-31 23:59:59.000Z',
      status: 'closed',
      created_by: byLogin['sa-dev'].id,
    },
    'cycle summer-2026 (closed)',
  )
  const fall = await ensureRecord(
    'advancement_cycles',
    'slug = {:slug}',
    { slug: 'fall-2026' },
    {
      label: 'Fall 2026',
      slug: 'fall-2026',
      starts_at: '2026-08-01 00:00:00.000Z',
      ends_at: '2026-12-31 23:59:59.000Z',
      status: 'active',
      created_by: byLogin['sa-dev'].id,
    },
    'cycle fall-2026 (active)',
  )

  console.log('\nxp ledger and user stats')
  // login -> ledger rows. Amounts mirror XP_WEIGHTS in lib/constants.ts.
  const LEDGER = {
    'mem-a1': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-a1-s1',
        type: 'evaluation',
        note: 'Standard evaluation 1',
      },
      {
        amount: 25,
        category: 'knowledge_session',
        ref: 'seed-ks-a1',
        type: 'knowledge_session',
        note: 'Knowledge session delivered',
      },
      {
        amount: 40,
        category: 'event_organized',
        ref: 'seed-event-ks-systems',
        type: 'event',
        note: 'Organized knowledge session',
      },
      {
        amount: 25,
        category: 'cross_node_vote_received',
        ref: 'seed-vote-mem-a1',
        type: 'vote',
        note: 'Positive cross-node vote',
      },
    ],
    'mem-a2': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-a2-s1',
        type: 'evaluation',
        note: 'Standard evaluation 1',
      },
      {
        amount: 10,
        category: 'evaluation_late',
        ref: 'seed-eval-a2-s2',
        type: 'evaluation',
        note: 'Standard evaluation 2 (late)',
      },
      {
        amount: 25,
        category: 'knowledge_session',
        ref: 'seed-ks-a2',
        type: 'knowledge_session',
        note: 'Knowledge session attended',
      },
    ],
    'mem-b1': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-b1-s1',
        type: 'evaluation',
        note: 'Standard evaluation 1',
      },
      {
        amount: 25,
        category: 'knowledge_session',
        ref: 'seed-ks-b1',
        type: 'knowledge_session',
        note: 'Knowledge session attended',
      },
      {
        amount: 25,
        category: 'endorsement_received',
        ref: 'seed-endorse-b1',
        type: 'endorsement',
        note: 'Verified external endorsement',
      },
    ],
    'mem-b2': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-b2-s1',
        type: 'evaluation',
        note: 'Standard evaluation 1',
      },
    ],
    'lead-alpha': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-la-1',
        type: 'evaluation',
        note: 'Standard evaluation',
      },
      {
        amount: 40,
        category: 'event_organized',
        ref: 'seed-event-community-sync',
        type: 'event',
        note: 'Facilitated community sync',
      },
    ],
    'lead-beta': [
      {
        amount: 25,
        category: 'evaluation_on_time',
        ref: 'seed-eval-lb-1',
        type: 'evaluation',
        note: 'Standard evaluation',
      },
    ],
  }

  /** Initiate 0 · Contributor 60 · Architect 140 · Vanguard 300 (INFRA-01). */
  const tierForXp = (xp) =>
    xp >= 300
      ? 'Vanguard'
      : xp >= 140
        ? 'Architect'
        : xp >= 60
          ? 'Contributor'
          : 'Initiate'

  for (const [login, rows] of Object.entries(LEDGER)) {
    let xpTotal = 0
    for (const row of rows) {
      const entry = await ensureRecord(
        'xp_ledger',
        'reference_id = {:ref}',
        { ref: row.ref },
        {
          user: byLogin[login].id,
          amount: row.amount,
          category: row.category,
          reference_id: row.ref,
          reference_type: row.type,
          awarded_by: byLogin['sp-dev'].id,
          cycle: fall.id,
          note: row.note,
        },
        `xp_ledger ${login} +${row.amount} ${row.category}`,
      )
      if (entry) xpTotal += row.amount
    }
    const { evaluations_completed, evaluations_late } = countsFor(login)
    await ensureRecord(
      'user_stats',
      'user = {:user} && cycle = {:cycle}',
      { user: byLogin[login].id, cycle: fall.id },
      {
        user: byLogin[login].id,
        cycle: fall.id,
        xp_total: xpTotal,
        tier: tierForXp(xpTotal),
        evaluations_completed,
        evaluations_late,
        events_organized: login === 'mem-a1' ? 1 : 0,
        events_attended: login === 'mem-a2' || login === 'mem-b1' ? 1 : 0,
        knowledge_sessions: 1,
        cross_node_contributions: 0,
        endorsements_received: login === 'mem-b1' ? 1 : 0,
        votes_received_positive: login === 'mem-a1' ? 1 : 0,
        last_computed_at: new Date('2026-08-16T00:00:00.000Z').toISOString(),
      },
      `user_stats ${login} (${xpTotal} XP → ${tierForXp(xpTotal)})`,
    )
  }

  // One closed-cycle row so the XP history page has a second cycle to show.
  await ensureRecord(
    'xp_ledger',
    'reference_id = {:ref}',
    { ref: 'seed-summer-a1' },
    {
      user: byLogin['mem-a1'].id,
      amount: 60,
      category: 'evaluation_on_time',
      reference_id: 'seed-summer-a1',
      reference_type: 'evaluation',
      awarded_by: byLogin['sp-dev'].id,
      cycle: summer.id,
      note: 'Closed-cycle history entry',
    },
    'xp_ledger mem-a1 +60 (summer-2026)',
  )

  console.log('\nevaluations')
  for (const e of EVALS) {
    await ensureRecord(
      'evaluations',
      'evaluatee = {:eval} && stage = {:stage} && cycle = {:cycle}',
      { eval: byLogin[e.eval].id, stage: e.stage, cycle: fall.id },
      {
        evaluatee: byLogin[e.eval].id,
        evaluator: byLogin[e.by].id,
        cycle: fall.id,
        stage: e.stage,
        status: e.status,
        scheduled_at: e.at ?? null,
        completed_at: e.status === 'completed' ? e.at : null,
        score: e.score ?? null,
        notes: e.score ? 'Seeded score with written feedback placeholder.' : null,
        xp_awarded: e.status === 'completed',
      },
      `evaluation ${e.eval} ${e.stage} (${e.status})`,
    )
  }

  console.log('\nevents and attendance')
  const events = {}
  const EVENT_DATA = [
    {
      slug: 'ks-systems',
      title: 'Knowledge Session: Systems Design',
      type: 'knowledge_session',
      proposed_by: 'alpha',
      organized_by: 'mem-a1',
      status: 'scheduled',
      starts_at: '2026-08-22T17:00:00.000Z',
      ends_at: '2026-08-22T19:00:00.000Z',
      location: 'Lab 3',
      is_public: true,
    },
    {
      slug: 'community-sync',
      title: 'Community Sync',
      type: 'community',
      proposed_by: 'alpha',
      organized_by: 'mem-a2',
      status: 'approved',
      starts_at: '2026-08-28T16:00:00.000Z',
      location: 'Maker Space',
      is_public: true,
    },
    {
      slug: 'hack-night',
      title: 'Cross-Node Hack Night',
      type: 'hackathon',
      proposed_by: 'beta',
      organized_by: 'lead-beta',
      status: 'proposed',
      starts_at: '2026-09-05T16:00:00.000Z',
      is_public: false,
    },
  ]
  for (const e of EVENT_DATA) {
    const record = await ensureRecord(
      'events',
      'slug = {:slug}',
      { slug: e.slug },
      {
        title: e.title,
        slug: e.slug,
        description: 'Seeded event description for development.',
        type: e.type,
        proposed_by: bySlug[e.proposed_by].id,
        organized_by: byLogin[e.organized_by].id,
        cycle: fall.id,
        status: e.status,
        starts_at: e.starts_at,
        ends_at: e.ends_at ?? null,
        location: e.location ?? null,
        is_public: e.is_public,
        attendance_count: 0,
        xp_awarded: false,
      },
      `event ${e.slug} (${e.status})`,
    )
    events[e.slug] = record
  }
  const ATTENDANCE = [
    { event: 'ks-systems', user: 'mem-a2', role: 'attendee' },
    { event: 'community-sync', user: 'mem-b1', role: 'attendee' },
  ]
  for (const a of ATTENDANCE) {
    await ensureRecord(
      'event_attendance',
      'event = {:event} && user = {:user}',
      { event: events[a.event].id, user: byLogin[a.user].id },
      {
        event: events[a.event].id,
        user: byLogin[a.user].id,
        role: a.role,
        confirmed: true,
        xp_awarded: false,
      },
      `attendance ${a.user} → ${a.event}`,
    )
  }

  console.log('\nvotes')
  const VOTES = [
    {
      voter: 'mem-b1',
      subject: 'mem-a1',
      polarity: 'positive',
      reason: 'Clear, honest evaluation of my project with actionable feedback.',
    },
    {
      voter: 'mem-a1',
      subject: 'mem-b2',
      polarity: 'negative',
      reason: 'Late to the last two syncs without notice.',
    },
  ]
  for (const v of VOTES) {
    await ensureRecord(
      'votes',
      'voter = {:voter} && subject = {:subject} && cycle = {:cycle}',
      { voter: byLogin[v.voter].id, subject: byLogin[v.subject].id, cycle: fall.id },
      {
        voter: byLogin[v.voter].id,
        subject: byLogin[v.subject].id,
        cycle: fall.id,
        polarity: v.polarity,
        reason: v.reason,
        is_cross_node: true,
      },
      `vote ${v.voter} → ${v.subject} (${v.polarity})`,
    )
  }

  console.log('\nendorsements')
  await ensureRecord(
    'endorsements',
    'public_token = {:token}',
    { token: 'seed-endorse-mem-a1' },
    {
      subject: byLogin['mem-a1'].id,
      endorser_name: 'Rania Qasem',
      endorser_email: 'rania.qasem@example.com',
      endorser_relation: 'Project partner at 42 Amman',
      message:
        'Yousef carried the integration work on our shared project and documented every decision. Reliable under deadline pressure.',
      verified: false,
      public_token: 'seed-endorse-mem-a1',
      cycle: fall.id,
      xp_awarded: false,
    },
    'endorsement mem-a1 (unverified, token seed-endorse-mem-a1)',
  )
  await ensureRecord(
    'endorsements',
    'public_token = {:token}',
    { token: 'seed-endorse-mem-b1' },
    {
      subject: byLogin['mem-b1'].id,
      endorser_name: 'Khalid Taha',
      endorser_email: 'khalid.taha@example.com',
      endorser_relation: 'Peer at 42 Amman',
      message:
        'Adam reviewed my final project thoroughly and helped me catch two critical edge cases.',
      verified: true,
      public_token: 'seed-endorse-mem-b1',
      cycle: fall.id,
      xp_awarded: true,
    },
    'endorsement mem-b1 (verified)',
  )

  console.log(
    `\ncreated ${summary.created} · skipped ${summary.skipped} · failed ${summary.failed.length}`,
  )
  if (summary.failed.length) {
    console.error(`failed: ${summary.failed.join(' | ')}`)
    process.exit(1)
  }
  console.log(
    `Seed data is ready. Log in as e.g. ${USERS[5].login}@argc.dev (password: ${SEED_PASSWORD}).\n`,
  )
}

main().catch((err) => {
  console.error('\nFatal:', err.message ?? err)
  process.exit(1)
})
