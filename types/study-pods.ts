// Study Pods TypeScript Types
// Production-ready with comprehensive edge cases

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Mixed';
export type PodStatus = 'active' | 'scheduled' | 'completed' | 'archived';
export type MemberRole = 'owner' | 'moderator' | 'member';
export type MemberStatus = 'active' | 'pending' | 'invited' | 'removed' | 'left';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type SessionType = 'study' | 'problem_solving' | 'mock_interview' | 'discussion' | 'review';
export type PodActivityType =
  | 'member_joined'
  | 'member_left'
  | 'session_completed'
  | 'milestone_reached'
  | 'problem_solved'
  | 'goal_achieved'
  | 'announcement';

export interface MeetingSchedule {
  day: string; // "Monday", "Tuesday", etc.
  time: string; // "18:00" in 24h format
  duration: number; // Minutes
  timezone: string; // "UTC", "America/New_York", etc.
  recurring: boolean; // Weekly recurring
}

export interface ProblemProgress {
  problem_id: number;
  problem_title: string;
  completed: boolean;
  completed_by?: string[]; // User IDs who completed it
  completed_at?: string;
}

export interface StudyPod {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  subject: string;
  skill_level: SkillLevel;
  max_members: number;
  current_member_count: number;
  is_public: boolean;
  requires_approval: boolean;
  meeting_schedule: MeetingSchedule[];
  topics: string[];
  goals: string | null;
  status: PodStatus;
  thumbnail_url: string | null;
  color_scheme: string;
  study_plan_id: string | null;
  target_problems_count: number;
  completed_problems_count: number;
  total_sessions: number;
  next_session_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface StudyPodMember {
  id: string;
  pod_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
  last_active_at: string;
  contribution_score: number;
  problems_solved: number;
  sessions_attended: number;
  invited_by: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StudyPodSession {
  id: string;
  pod_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  host_user_id: string;
  status: SessionStatus;
  session_type: SessionType;
  attendees_count: number;
  problems_covered: ProblemProgress[];
  notes: string | null;
  recording_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
  participation_score: number;
}

export interface StudyPodInvitation {
  id: string;
  pod_id: string;
  invited_user_id: string;
  invited_by: string;
  message: string | null;
  status: InvitationStatus;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export interface StudyPodJoinRequest {
  id: string;
  pod_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface StudyPodActivity {
  id: string;
  pod_id: string;
  user_id: string | null;
  activity_type: PodActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Extended types with user data for UI
export interface StudyPodWithMembers extends StudyPod {
  members: Array<StudyPodMember & {
    user: {
      user_id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
      total_solved?: number;
    };
  }>;
  creator: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  is_member?: boolean;
  user_role?: MemberRole | null;
  can_join?: boolean;
  join_status?: {
    can_join: boolean;
    reason: string;
    message: string;
    requires_approval?: boolean;
  };
}

export interface StudyPodSessionWithAttendees extends StudyPodSession {
  attendees: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    attendance: SessionAttendance;
  }>;
  host: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// API Request/Response types
export interface CreatePodRequest {
  name: string;
  description?: string;
  subject: string;
  skill_level: SkillLevel;
  max_members: number;
  is_public: boolean;
  requires_approval: boolean;
  meeting_schedule?: MeetingSchedule[];
  topics?: string[];
  goals?: string;
  thumbnail_url?: string;
  color_scheme?: string;
  target_problems_count?: number;
}

export interface UpdatePodRequest extends Partial<CreatePodRequest> {
  status?: PodStatus;
  next_session_at?: string;
}

export interface JoinPodRequest {
  pod_id: string;
  message?: string; // For join requests that require approval
}

export interface InviteToPodRequest {
  pod_id: string;
  user_ids: string[];
  message?: string;
}

export interface CreateSessionRequest {
  pod_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  session_type: SessionType;
  problems_to_cover?: number[]; // Problem IDs
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduled_at?: string;
  status?: SessionStatus;
  notes?: string;
}

export interface SearchPodsRequest {
  query?: string;
  subject?: string;
  skill_level?: SkillLevel;
  status?: PodStatus;
  only_public?: boolean;
  only_with_space?: boolean;
  limit?: number;
  offset?: number;
}

export interface PodStatistics {
  total_pods: number;
  active_pods: number;
  pods_created: number;
  total_sessions_attended: number;
  total_problems_solved_in_pods: number;
  total_contribution_score: number;
  moderator_roles: number;
  owner_roles: number;
}

// Filter and sort options for UI
export interface PodFilters {
  search: string;
  subject: string[];
  skillLevel: SkillLevel[];
  hasSpace: boolean;
  onlyMyPods: boolean;
  status: PodStatus[];
}

export type PodSortOption =
  | 'recent'
  | 'name'
  | 'members'
  | 'upcoming_session'
  | 'activity';

// UI-specific types
export interface PodCardData {
  pod: StudyPod;
  memberCount: number;
  nextSession: string | null;
  members: Array<{
    avatar_url: string | null;
    full_name: string;
  }>;
  isJoined: boolean;
  isPending: boolean;
  canJoin: boolean;
}

// Subject categories for filtering/organization
export const STUDY_SUBJECTS = [
  'Data Structures',
  'Algorithms',
  'System Design',
  'Dynamic Programming',
  'Trees & Graphs',
  'Array & Strings',
  'Linked Lists',
  'Stacks & Queues',
  'Recursion & Backtracking',
  'Greedy Algorithms',
  'Binary Search',
  'Sorting & Searching',
  'Math & Logic',
  'Bit Manipulation',
  'Database & SQL',
  'OOP & Design Patterns',
  'Operating Systems',
  'Networks',
  'Other',
] as const;

export type StudySubject = (typeof STUDY_SUBJECTS)[number];

// Color schemes for pods (matching your design system)
export const POD_COLOR_SCHEMES = [
  { name: 'Green', value: 'from-green-500 to-emerald-500' },
  { name: 'Blue', value: 'from-blue-500 to-cyan-500' },
  { name: 'Purple', value: 'from-purple-500 to-pink-500' },
  { name: 'Orange', value: 'from-orange-500 to-yellow-500' },
  { name: 'Red', value: 'from-red-500 to-rose-500' },
  { name: 'Indigo', value: 'from-indigo-500 to-purple-500' },
  { name: 'Teal', value: 'from-teal-500 to-cyan-500' },
  { name: 'Brand', value: 'from-brand to-purple-600' },
] as const;
