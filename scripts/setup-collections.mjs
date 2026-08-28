/**
 * PocketBase schema as code.
 *
 * This file is the single source of truth for the backend schema. Run it
 * against a fresh local instance or an existing remote one:
 *
 *   pnpm db:setup                 # uses .env
 *   make db-setup                 # same, after `make db`
 *
 * Three things it fixes versus the V1 script it is derived from:
 *
 * 1. It is idempotent. V1 POSTed unconditionally and printed an error for every
 *    collection that already existed, so re-running produced a wall of noise
 *    and it could not be used as a repeatable setup step.
 * 2. It defines `posts`, `post_images` and `submissions`. V1 never did — which
 *    is exactly why those three are missing from the deployed instance while
 *    every collection the script did define is present.
 * 3. It enforces collection access rules. A fresh PocketBase gives a new base
 *    collection open rules ("" = allow), and only the running instance happened
 *    to be locked — so any new machine or redeploy would expose every
 *    collection to direct client access. The script now locks each collection
 *    at creation and re-checks rules on every run.
 *
 * Field shapes mirror types/pocketbase.ts. Keep them in step.
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

/** collection name -> internal id, for building relation fields. */
const ids = {}
const summary = { created: [], skipped: [], failed: [] }

function auth() {
  return { Authorization: `Bearer ${pb.authStore.token}` }
}

async function api(path, init = {}) {
  const res = await fetch(`${PB_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...auth(), ...(init.headers ?? {}) },
  })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

/** Creates the collection, or skips it when one of that name already exists. */
async function ensureCollection(name, fields, options = {}) {
  const existing = await api(`/api/collections/${name}`)
  if (existing.ok) {
    ids[name] = existing.body.id
    summary.skipped.push(name)
    console.log(`  = ${name} (exists)`)
    return true
  }

  const res = await api('/api/collections', {
    method: 'POST',
    body: JSON.stringify({ name, type: 'base', fields, ...options }),
  })

  if (res.ok) {
    ids[name] = res.body.id
    summary.created.push(name)
    console.log(`  + ${name}`)
    return true
  }

  summary.failed.push(name)
  console.error(`  ! ${name}: ${res.body?.message ?? res.status}`)
  if (res.body?.data) console.error(`    ${JSON.stringify(res.body.data)}`)
  return false
}

/** Adds any missing custom fields to an existing collection (used for `users`). */
async function patchCollection(name, customFields) {
  const existing = await api(`/api/collections/${name}`)
  if (!existing.ok) {
    console.error(`  ! ${name}: not found`)
    summary.failed.push(name)
    return false
  }

  const current = existing.body
  const present = new Set(current.fields.map((f) => f.name))
  const missing = customFields.filter((f) => !present.has(f.name))

  ids[name] = current.id

  if (missing.length === 0) {
    console.log(`  = ${name} (all fields present)`)
    summary.skipped.push(name)
    return true
  }

  const res = await api(`/api/collections/${name}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...current, fields: [...current.fields, ...missing] }),
  })

  if (res.ok) {
    console.log(`  + ${name} (added ${missing.map((f) => f.name).join(', ')})`)
    summary.created.push(name)
    return true
  }

  console.error(`  ! ${name}: ${res.body?.message ?? res.status}`)
  summary.failed.push(name)
  return false
}

/** Adds an index only when an identical one is not already present. */
async function ensureIndex(collection, sql) {
  const existing = await api(`/api/collections/${collection}`)
  if (!existing.ok) return false

  const current = existing.body
  if ((current.indexes ?? []).includes(sql)) {
    console.log(`  = index on ${collection} (exists)`)
    return true
  }

  const res = await api(`/api/collections/${collection}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...current, indexes: [...(current.indexes ?? []), sql] }),
  })
  console.log(res.ok ? `  + index on ${collection}` : `  ! index on ${collection}`)
  return res.ok
}

// ─── Access rules ──────────────────────────────────────────────────────────
//
// The frontend never talks to PocketBase directly (AGENTS.md): every read and
// write goes through the Next.js backend with the admin client, which bypasses
// rules entirely. So every data collection is locked to the backend — all five
// rules null, denying direct client access.
//
// `events` (is_public) and `endorsements` (public token form) could expose
// narrower client rules, but a client rule would let browsers hit PocketBase
// directly, skipping the API routes that apply validation and business logic.
// Locked like everything else; the public surfaces are served by API routes.

/** All five access rules denied — backend-only collections. */
const LOCKED = {
  listRule: null,
  viewRule: null,
  createRule: null,
  updateRule: null,
  deleteRule: null,
}

/**
 * `users` is the auth collection. Keep self-service reads for the auth flow
 * (authRefresh/authWithPassword are auth endpoints and work regardless, but a
 * member reading their own record is legitimate). Everything else is denied:
 * anonymous self-registration, self role edits, self deletion — none of which
 * V2 uses (user creation/updates go through the OAuth callback's admin client).
 */
const USER_RULES = {
  listRule: null,
  viewRule: 'id = @request.auth.id',
  createRule: null,
  updateRule: null,
  deleteRule: null,
}

/** Enforces the desired access rules, patching the collection when different. */
async function ensureRules(name, rules) {
  const existing = await api(`/api/collections/${name}`)
  if (!existing.ok) {
    console.error(`  ! ${name}: not found`)
    summary.failed.push(name)
    return false
  }

  const current = existing.body
  const changed = Object.entries(rules).some(([key, value]) => current[key] !== value)

  if (!changed) {
    console.log(`  = rules on ${name} (ok)`)
    return true
  }

  const res = await api(`/api/collections/${name}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...current, ...rules }),
  })

  if (res.ok) {
    console.log(`  + rules on ${name}`)
    return true
  }

  console.error(`  ! ${name} rules: ${res.body?.message ?? res.status}`)
  summary.failed.push(name)
  return false
}

/** Creates (or keeps) a backend-only collection with locked access rules. */
async function ensureLocked(name, fields) {
  await ensureCollection(name, fields, { ...LOCKED })
  await ensureRules(name, LOCKED)
}

// ─── Field helpers ─────────────────────────────────────────────────────────

const sel = (values, required = false) => ({ type: 'select', values, required })
const autodate = (onCreate = true, onUpdate = false) => ({
  type: 'autodate',
  onCreate,
  onUpdate,
})

function rel(collectionName, required = false) {
  const id = ids[collectionName]
  if (!id) throw new Error(`Relation target not resolved yet: ${collectionName}`)
  return { type: 'relation', collectionId: id, required }
}

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
const file = (maxSize = 5 * 1024 * 1024) => ({
  type: 'file',
  maxSize,
  mimeTypes: IMAGE_MIME,
})

const ROLES = ['guest', 'node_peer', 'node_leader', 'super_peer', 'super_admin_peer']

// ─── Schema ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nPocketBase: ${PB_URL}`)
  await pb.collections.getFullList().catch(() => {})
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log('Authenticated.\n')

  const all = await pb.collections.getFullList()
  ids.users = all.find((c) => c.name === 'users')?.id
  if (!ids.users) throw new Error('The built-in users collection is missing.')

  console.log('users')
  await patchCollection('users', [
    { name: 'intra_id', type: 'text', required: true },
    { name: 'intra_login', type: 'text', required: true },
    { name: 'display_name', type: 'text', required: true },
    { name: 'avatar_url', type: 'text' },
    { name: 'role', ...sel(ROLES, true) },
    { name: 'last_sync_at', type: 'date' },
  ])
  // The auth collection is the one place client access is allowed at all —
  // self-service only. V1 left createRule open (anonymous self-registration)
  // and updateRule open (a member could set their own role). V2 creates and
  // updates users exclusively through the OAuth callback's admin client.
  await ensureRules('users', USER_RULES)
  // PocketBase 0.23+ expresses uniqueness as an index, not a field flag.
  await ensureIndex(
    'users',
    "CREATE UNIQUE INDEX `idx_intra_login` ON `users` (`intra_login`) WHERE `intra_login` != ''",
  )

  // ── Public site ──────────────────────────────────────────────────────────
  // Absent from the V1 script, which is why they are missing in production.

  console.log('\npublic site')
  await ensureLocked('post_images', [
    { name: 'image', ...file() },
    { name: 'uploaded_by', ...rel('users') },
    { name: 'created', ...autodate() },
  ])

  await ensureLocked('posts', [
    { name: 'slug', type: 'text', required: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'text', required: true },
    // `editor` is PocketBase's rich-text field; the app sanitizes it on render.
    { name: 'content', type: 'editor', required: true },
    { name: 'author', ...rel('users', true) },
    { name: 'status', ...sel(['pending', 'published', 'rejected'], true) },
    { name: 'read_time', type: 'text' },
    { name: 'published_at', type: 'date' },
    { name: 'banner', ...file() },
    { name: 'tags', type: 'text' },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])
  await ensureIndex('posts', 'CREATE UNIQUE INDEX `idx_posts_slug` ON `posts` (`slug`)')

  await ensureLocked('submissions', [
    { name: 'user', ...rel('users', true) },
    { name: 'cohort', type: 'text', required: true },
    { name: 'motivation', type: 'text', required: true },
    { name: 'status', ...sel(['pending', 'approved', 'rejected'], true) },
    // Denormalized so the admin list needs no join.
    { name: 'intra_login', type: 'text' },
    { name: 'display_name', type: 'text' },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])
  // One application per user; the API also checks, but this is the real guard.
  await ensureIndex(
    'submissions',
    'CREATE UNIQUE INDEX `idx_submissions_user` ON `submissions` (`user`)',
  )

  // ── Tier 1: no dependencies beyond users ─────────────────────────────────

  console.log('\nstructure')
  await ensureLocked('node', [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'cohort', type: 'text' },
    { name: 'status', ...sel(['active', 'inactive', 'archived']) },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])
  await ensureIndex('node', 'CREATE UNIQUE INDEX `idx_node_slug` ON `node` (`slug`)')

  await ensureLocked('achievements', [
    { name: 'title', type: 'text', required: true },
    { name: 'profile_prefix', type: 'text' },
    { name: 'image', ...file() },
    { name: 'description', type: 'text' },
    { name: 'is_active', type: 'bool' },
    { name: 'created_at', ...autodate() },
    { name: 'updated_at', ...autodate(true, true) },
  ])

  await ensureLocked('advancement_cycles', [
    { name: 'label', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'starts_at', type: 'date', required: true },
    { name: 'ends_at', type: 'date', required: true },
    { name: 'status', ...sel(['upcoming', 'active', 'closed'], true) },
    { name: 'created_by', ...rel('users', true) },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])
  await ensureIndex(
    'advancement_cycles',
    'CREATE UNIQUE INDEX `idx_cycle_slug` ON `advancement_cycles` (`slug`)',
  )

  // ── Tier 2 ───────────────────────────────────────────────────────────────

  console.log('\nmembership and progress')
  await ensureLocked('node_member', [
    { name: 'role', ...sel(['member', 'leader']) },
    { name: 'user', ...rel('users', true) },
    { name: 'node', ...rel('node', true) },
    { name: 'joined_at', type: 'date', required: true },
    { name: 'left_at', type: 'date' },
  ])

  await ensureLocked('xp_ledger', [
    { name: 'user', ...rel('users', true) },
    { name: 'amount', type: 'number', required: true },
    {
      name: 'category',
      ...sel(
        [
          'evaluation_on_time',
          'evaluation_late',
          'event_organized',
          'event_attended',
          'knowledge_session',
          'cross_node_contribution',
          'hackathon',
          'endorsement_received',
          'cross_node_vote_received',
          'manual_adjustment',
        ],
        true,
      ),
    },
    { name: 'reference_id', type: 'text' },
    {
      name: 'reference_type',
      ...sel([
        'evaluation',
        'event',
        'knowledge_session',
        'cross_node',
        'hackathon',
        'endorsement',
        'vote',
        'manual',
      ]),
    },
    { name: 'awarded_by', ...rel('users') },
    { name: 'cycle', ...rel('advancement_cycles', true) },
    { name: 'note', type: 'text' },
    { name: 'created', ...autodate() },
  ])
  // Unique per (user, reference_id): this is what makes awardXp's idempotency
  // structural — two same-reference awards can never both write a ledger row.
  await ensureIndex(
    'xp_ledger',
    'CREATE UNIQUE INDEX `idx_xp_ledger_reference` ON `xp_ledger` (`user`, `reference_id`)',
  )

  await ensureLocked('user_stats', [
    { name: 'user', ...rel('users', true) },
    { name: 'cycle', ...rel('advancement_cycles', true) },
    { name: 'xp_total', type: 'number' },
    { name: 'tier', ...sel(['Initiate', 'Contributor', 'Architect', 'Vanguard']) },
    { name: 'evaluations_completed', type: 'number' },
    { name: 'evaluations_late', type: 'number' },
    { name: 'events_organized', type: 'number' },
    { name: 'events_attended', type: 'number' },
    { name: 'knowledge_sessions', type: 'number' },
    { name: 'cross_node_contributions', type: 'number' },
    { name: 'endorsements_received', type: 'number' },
    { name: 'votes_received_positive', type: 'number' },
    { name: 'last_computed_at', type: 'date' },
  ])
  // Unique per (user, cycle): awardXp's stats upsert can never produce two
  // stats rows for the same member in one cycle.
  await ensureIndex(
    'user_stats',
    'CREATE UNIQUE INDEX `idx_user_stats_pair` ON `user_stats` (`user`, `cycle`)',
  )

  await ensureLocked('evaluations', [
    { name: 'evaluatee', ...rel('users', true) },
    { name: 'evaluator', ...rel('users') },
    { name: 'cycle', ...rel('advancement_cycles', true) },
    {
      name: 'stage',
      ...sel(['standard_1', 'standard_2', 'eval_plus_node_leader'], true),
    },
    { name: 'status', ...sel(['pending', 'scheduled', 'completed', 'missed'], true) },
    { name: 'scheduled_at', type: 'date' },
    { name: 'completed_at', type: 'date' },
    { name: 'score', type: 'number' },
    { name: 'notes', type: 'text' },
    { name: 'xp_awarded', type: 'bool' },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])

  // ── Tier 3 ───────────────────────────────────────────────────────────────

  console.log('\nevents, votes, endorsements')
  await ensureLocked('events', [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'poster_photo', ...file() },
    { name: 'description', type: 'text' },
    {
      name: 'type',
      ...sel(
        ['knowledge_session', 'hackathon', 'workshop', 'community', 'cross_node'],
        true,
      ),
    },
    { name: 'proposed_by', ...rel('node', true) },
    { name: 'organized_by', ...rel('users', true) },
    { name: 'cycle', ...rel('advancement_cycles') },
    {
      name: 'status',
      ...sel(['proposed', 'approved', 'scheduled', 'completed', 'cancelled'], true),
    },
    { name: 'starts_at', type: 'date', required: true },
    { name: 'ends_at', type: 'date' },
    { name: 'location', type: 'text' },
    { name: 'is_public', type: 'bool' },
    { name: 'attendance_count', type: 'number' },
    { name: 'xp_awarded', type: 'bool' },
    { name: 'created', ...autodate() },
    { name: 'updated', ...autodate(true, true) },
  ])
  await ensureIndex(
    'events',
    'CREATE UNIQUE INDEX `idx_events_slug` ON `events` (`slug`)',
  )

  await ensureLocked('event_attendance', [
    { name: 'event', ...rel('events', true) },
    { name: 'user', ...rel('users', true) },
    { name: 'role', ...sel(['organizer', 'attendee', 'speaker']) },
    { name: 'confirmed', type: 'bool' },
    { name: 'xp_awarded', type: 'bool' },
    { name: 'created', ...autodate() },
  ])
  // Unique pair: one RSVP row per (event, user). This is the index that turns
  // MEMBER-05's app-level replay guard into a hard guarantee — a concurrent
  // duplicate create is rejected by the DB and the route answers the 200
  // replay path (see app/api/dashboard/events/[id]/rsvp/route.ts).
  await ensureIndex(
    'event_attendance',
    'CREATE UNIQUE INDEX `idx_event_attendance_pair` ON `event_attendance` (`event`, `user`)',
  )

  await ensureLocked('votes', [
    { name: 'voter', ...rel('users', true) },
    { name: 'subject', ...rel('users', true) },
    { name: 'cycle', ...rel('advancement_cycles', true) },
    { name: 'polarity', ...sel(['positive', 'negative'], true) },
    { name: 'reason', type: 'text', required: true },
    { name: 'is_cross_node', type: 'bool' },
    { name: 'created', ...autodate() },
  ])
  // Partial unique indexes, one per polarity: with them a caller can spend ONE
  // positive and ONE negative vote per cycle but never two of the same
  // polarity — closing MEMBER-12's budget race at the DB. A single
  // non-partial unique on (voter, cycle) would wrongly block the allowed mix.
  await ensureIndex(
    'votes',
    "CREATE UNIQUE INDEX `idx_votes_voter_cycle_positive` ON `votes` (`voter`, `cycle`) WHERE `polarity` = 'positive'",
  )
  await ensureIndex(
    'votes',
    "CREATE UNIQUE INDEX `idx_votes_voter_cycle_negative` ON `votes` (`voter`, `cycle`) WHERE `polarity` = 'negative'",
  )

  await ensureLocked('endorsements', [
    { name: 'subject', ...rel('users', true) },
    { name: 'endorser_name', type: 'text', required: true },
    { name: 'endorser_email', type: 'text' },
    { name: 'endorser_relation', type: 'text' },
    { name: 'message', type: 'text', required: true },
    { name: 'verified', type: 'bool' },
    { name: 'public_token', type: 'text', required: true },
    { name: 'cycle', ...rel('advancement_cycles', true) },
    { name: 'xp_awarded', type: 'bool' },
    { name: 'created', ...autodate() },
  ])
  await ensureIndex(
    'endorsements',
    'CREATE UNIQUE INDEX `idx_endorsement_token` ON `endorsements` (`public_token`)',
  )

  await ensureLocked('node_achievement', [
    { name: 'node', ...rel('node', true) },
    { name: 'achievement', ...rel('achievements', true) },
    { name: 'created_at', ...autodate() },
  ])

  await ensureLocked('user_achievement', [
    { name: 'user', ...rel('users', true) },
    { name: 'achievement', ...rel('achievements', true) },
    { name: 'created_at', ...autodate() },
  ])

  console.log(
    `\ncreated ${summary.created.length} · unchanged ${summary.skipped.length} · failed ${summary.failed.length}`,
  )
  if (summary.failed.length) {
    console.error(`failed: ${summary.failed.join(', ')}`)
    process.exit(1)
  }
  console.log('Schema is up to date.\n')
}

main().catch((err) => {
  console.error('\nFatal:', err.message ?? err)
  process.exit(1)
})
