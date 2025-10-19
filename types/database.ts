export interface UserProfile {
  user_id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  university: string | null;
  graduation_year: string | null;
  location: string | null;
  job_title: string | null;
  website: string | null;
  github_username: string | null;
  linkedin_username: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at?: string;
}

export interface UserStats {
  user_id: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  contest_rating: number;
  acceptance_rate: number;
  university_rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: number;
  problem_title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  language: string;
  code: string | null;
  runtime: number | null;
  memory: number | null;
  submitted_at: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

// =============================================
// SOCIAL NETWORKING TYPES
// =============================================

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface Connection {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: ConnectionStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType =
  | 'solved_problem'
  | 'earned_achievement'
  | 'milestone_reached'
  | 'profile_updated'
  | 'study_plan_created'
  | 'streak_milestone';

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  metadata: Record<string, any>;
  is_public: boolean;
  created_at: string;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_milestone'
  | 'activity_reaction'
  | 'study_plan_shared'
  | 'achievement_milestone';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type PrivacyLevel = 'public' | 'connections' | 'private';
export type ContentVisibility = 'everyone' | 'connections' | 'only_me';

export interface UserPrivacySettings {
  user_id: string;
  profile_visibility: PrivacyLevel;
  show_submissions_to: ContentVisibility;
  show_study_plans_to: ContentVisibility;
  show_calendar_to: ContentVisibility;
  show_activity_feed: boolean;
  allow_connection_requests: boolean;
  created_at: string;
  updated_at: string;
}

// Extended user type with connection info for search results
export interface UserSearchResult {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  graduation_year: string | null;
  job_title: string | null;
  bio: string | null;
  total_solved: number;
  current_streak: number;
  contest_rating: number;
  connection_status: 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'blocked';
  mutual_connections_count: number;
  is_public: boolean;
}
