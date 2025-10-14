export interface UserProfile {
  id: string;
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
  updated_at: string;
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
