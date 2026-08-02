export type Role =
  'guest' | 'node_peer' | 'node_leader' | 'super_peer' | 'super_admin_peer'

export const DEFAULT_ROLE: Role = 'guest'

export const ROLES: Role[] = [
  'guest',
  'node_peer',
  'node_leader',
  'super_peer',
  'super_admin_peer',
]

// ─── Auth / User ────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string
  email: string
  emailVisibility: boolean
  verified: boolean
  intra_id: string
  intra_login: string
  display_name: string
  avatar_url: string
  role: Role
  last_sync_at: string
  created: string
  updated: string
}

// ─── Node ──────────────────────────────────────────────────────────────────

export interface NodeRecord {
  id: string
  name: string
  slug: string
  cohort: string
  status: 'active' | 'inactive' | 'archived'
  created: string
  updated: string
}

export interface NodeMemberRecord {
  id: string
  role: 'member' | 'leader'
  user: string
  node: string
  joined_at: string
  left_at?: string
  expand?: {
    user?: UserRecord
    node?: NodeRecord
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────

export interface AchievementRecord {
  id: string
  title: string
  profile_prefix?: string
  image?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NodeAchievementRecord {
  id: string
  node: string
  achievement: string
  created_at: string
  expand?: {
    node?: NodeRecord
    achievement?: AchievementRecord
  }
}

export interface UserAchievementRecord {
  id: string
  user: string
  achievement: string
  created_at: string
  expand?: {
    user?: UserRecord
    achievement?: AchievementRecord
  }
}

// ─── XP ───────────────────────────────────────────────────────────────────

export type XpCategory =
  | 'evaluation_on_time'
  | 'evaluation_late'
  | 'event_organized'
  | 'event_attended'
  | 'knowledge_session'
  | 'cross_node_contribution'
  | 'hackathon'
  | 'endorsement_received'
  | 'cross_node_vote_received'
  | 'manual_adjustment'

export type XpReferenceType =
  | 'evaluation'
  | 'event'
  | 'knowledge_session'
  | 'cross_node'
  | 'hackathon'
  | 'endorsement'
  | 'vote'
  | 'manual'

export interface XpLedgerRecord {
  id: string
  user: string
  amount: number
  category: XpCategory
  reference_id?: string
  reference_type?: XpReferenceType
  awarded_by?: string
  cycle: string
  note?: string
  created: string
  expand?: {
    user?: UserRecord
    awarded_by?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

export type Tier = 'Initiate' | 'Contributor' | 'Architect' | 'Vanguard'

export interface UserStatsRecord {
  id: string
  user: string
  cycle: string
  xp_total: number
  tier: Tier
  evaluations_completed: number
  evaluations_late: number
  events_organized: number
  events_attended: number
  knowledge_sessions: number
  cross_node_contributions: number
  endorsements_received: number
  votes_received_positive: number
  last_computed_at?: string
  expand?: {
    user?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

// ─── Cycles ───────────────────────────────────────────────────────────────

export type CycleStatus = 'upcoming' | 'active' | 'closed'

export interface AdvancementCycleRecord {
  id: string
  label: string
  slug: string
  starts_at: string
  ends_at: string
  status: CycleStatus
  created_by: string
  created: string
  updated: string
  expand?: {
    created_by?: UserRecord
  }
}

// ─── Evaluations ──────────────────────────────────────────────────────────

export type EvalStage = 'standard_1' | 'standard_2' | 'eval_plus_node_leader'
export type EvalStatus = 'pending' | 'scheduled' | 'completed' | 'missed'

export interface EvaluationRecord {
  id: string
  evaluatee: string
  evaluator?: string
  cycle: string
  stage: EvalStage
  status: EvalStatus
  scheduled_at?: string
  completed_at?: string
  score?: number
  notes?: string
  xp_awarded: boolean
  created: string
  updated: string
  expand?: {
    evaluatee?: UserRecord
    evaluator?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

// ─── Events ───────────────────────────────────────────────────────────────

export type EventType =
  'knowledge_session' | 'hackathon' | 'workshop' | 'community' | 'cross_node'
export type EventStatus =
  'proposed' | 'approved' | 'scheduled' | 'completed' | 'cancelled'

export interface EventRecord {
  id: string
  title: string
  slug: string
  poster_photo?: string
  description?: string
  type: EventType
  proposed_by: string
  organized_by: string
  cycle?: string
  status: EventStatus
  starts_at: string
  ends_at?: string
  location?: string
  is_public: boolean
  attendance_count: number
  xp_awarded: boolean
  created: string
  updated: string
  expand?: {
    proposed_by?: NodeRecord
    organized_by?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

export type AttendanceRole = 'organizer' | 'attendee' | 'speaker'

export interface EventAttendanceRecord {
  id: string
  event: string
  user: string
  role: AttendanceRole
  confirmed: boolean
  xp_awarded: boolean
  created: string
  expand?: {
    event?: EventRecord
    user?: UserRecord
  }
}

// ─── Voting ───────────────────────────────────────────────────────────────

export type VotePolarity = 'positive' | 'negative'

export interface VoteRecord {
  id: string
  voter: string
  subject: string
  cycle: string
  polarity: VotePolarity
  reason: string
  is_cross_node: boolean
  created: string
  expand?: {
    voter?: UserRecord
    subject?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

// ─── Endorsements ─────────────────────────────────────────────────────────

export interface EndorsementRecord {
  id: string
  subject: string
  endorser_name: string
  endorser_email?: string
  endorser_relation?: string
  message: string
  verified: boolean
  public_token: string
  cycle: string
  xp_awarded: boolean
  created: string
  expand?: {
    subject?: UserRecord
    cycle?: AdvancementCycleRecord
  }
}

// ─── Blog ─────────────────────────────────────────────────────────────────

export type PostStatus = 'pending' | 'published' | 'rejected'

/** Subset of UserRecord that the posts.author relation expands to. */
export interface PostAuthor {
  id: string
  intra_login: string
  avatar_url: string
}

export interface PostRecord {
  id: string
  slug: string
  title: string
  description: string
  /** Editor field — HTML. Must pass through sanitizeHtml() before rendering. */
  content: string
  status: PostStatus
  read_time: string
  published_at: string
  created: string
  updated: string
  /** PocketBase file field — filename only, empty string when unset. */
  banner: string
  /** Comma-separated. */
  tags: string
  /** Needed to build the /api/files/ URL for `banner`. */
  collectionId: string
  expand?: {
    author?: PostAuthor
  }
}

export interface PostImageRecord {
  id: string
  image: string
  collectionId: string
  created: string
}

// ─── Membership applications ──────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface SubmissionRecord {
  id: string
  user: string
  cohort: string
  motivation: string
  status: SubmissionStatus
  intra_login: string
  display_name: string
  created: string
  updated: string
}
