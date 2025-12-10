-- Create challenge_badges table for badge definitions
CREATE TABLE IF NOT EXISTS challenge_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Icon name for frontend (e.g., 'trophy', 'zap', 'flame')
  color TEXT NOT NULL DEFAULT 'emerald', -- Color theme for the badge
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  points_value INTEGER NOT NULL DEFAULT 0,
  requirements JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'challenge' CHECK (category IN ('challenge', 'speed', 'efficiency', 'streak', 'milestone')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_challenge_badges table for awarded badges
CREATE TABLE IF NOT EXISTS user_challenge_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES challenge_badges(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES study_pod_challenges(id) ON DELETE SET NULL,
  pod_id UUID REFERENCES study_pods(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',

  UNIQUE(user_id, badge_id, challenge_id)
);

-- Create indexes
CREATE INDEX idx_user_badges_user_id ON user_challenge_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_challenge_badges(badge_id);
CREATE INDEX idx_user_badges_challenge_id ON user_challenge_badges(challenge_id);

-- Enable RLS
ALTER TABLE challenge_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_badges ENABLE ROW LEVEL SECURITY;

-- RLS for challenge_badges (everyone can read)
CREATE POLICY "Anyone can view badges"
ON challenge_badges
FOR SELECT
USING (true);

-- RLS for user_challenge_badges
CREATE POLICY "Users can view all awarded badges"
ON user_challenge_badges
FOR SELECT
USING (true);

CREATE POLICY "System can award badges"
ON user_challenge_badges
FOR INSERT
WITH CHECK (true);

-- Insert default badges
INSERT INTO challenge_badges (name, display_name, description, icon, color, tier, points_value, requirements, category) VALUES
-- Challenge Victory Badges
('first_place', 'Champion', 'Win first place in a challenge', 'crown', 'amber', 'gold', 100, '{"rank": 1}', 'challenge'),
('second_place', 'Runner Up', 'Finish second in a challenge', 'medal', 'gray', 'silver', 75, '{"rank": 2}', 'challenge'),
('third_place', 'Bronze Medal', 'Finish third in a challenge', 'medal', 'orange', 'bronze', 50, '{"rank": 3}', 'challenge'),
('clean_sweep', 'Clean Sweep', 'Solve all problems correctly in a challenge', 'check-circle', 'emerald', 'gold', 80, '{"all_problems_solved": true}', 'challenge'),

-- Speed Badges
('speed_demon', 'Speed Demon', 'Earn maximum speed bonus on a problem', 'zap', 'blue', 'silver', 30, '{"max_speed_bonus": true}', 'speed'),
('lightning_fast', 'Lightning Fast', 'Complete a challenge in under 30 minutes', 'bolt', 'cyan', 'gold', 60, '{"time_under_minutes": 30}', 'speed'),
('quick_solver', 'Quick Solver', 'Solve 5 problems in under 10 minutes each', 'timer', 'blue', 'bronze', 40, '{"fast_solves": 5}', 'speed'),

-- Efficiency Badges
('efficiency_expert', 'Efficiency Expert', 'Earn maximum efficiency bonus on a problem', 'trending-up', 'purple', 'silver', 30, '{"max_efficiency_bonus": true}', 'efficiency'),
('code_minimalist', 'Code Minimalist', 'Write solution under 20 lines for a medium+ problem', 'minimize', 'purple', 'gold', 50, '{"lines_under": 20}', 'efficiency'),
('optimized', 'Optimized', 'Earn 100+ points from bonuses in a single challenge', 'gauge', 'violet', 'silver', 35, '{"bonus_points": 100}', 'efficiency'),

-- Streak Badges
('on_fire', 'On Fire', 'Complete 3 challenges in a row', 'flame', 'red', 'bronze', 40, '{"streak": 3}', 'streak'),
('unstoppable', 'Unstoppable', 'Complete 5 challenges in a row', 'flame', 'orange', 'silver', 70, '{"streak": 5}', 'streak'),
('legendary', 'Legendary', 'Complete 10 challenges in a row', 'flame', 'amber', 'gold', 150, '{"streak": 10}', 'streak'),

-- Milestone Badges
('first_challenge', 'First Steps', 'Complete your first challenge', 'flag', 'emerald', 'bronze', 10, '{"challenges_completed": 1}', 'milestone'),
('challenge_veteran', 'Challenge Veteran', 'Complete 10 challenges', 'shield', 'blue', 'silver', 50, '{"challenges_completed": 10}', 'milestone'),
('challenge_master', 'Challenge Master', 'Complete 50 challenges', 'shield', 'purple', 'gold', 200, '{"challenges_completed": 50}', 'milestone'),
('problem_crusher', 'Problem Crusher', 'Solve 100 challenge problems correctly', 'target', 'emerald', 'gold', 100, '{"problems_solved": 100}', 'milestone'),
('point_collector', 'Point Collector', 'Earn 1000 total challenge points', 'star', 'amber', 'silver', 60, '{"total_points": 1000}', 'milestone'),
('point_master', 'Point Master', 'Earn 5000 total challenge points', 'star', 'yellow', 'gold', 150, '{"total_points": 5000}', 'milestone')
ON CONFLICT (name) DO NOTHING;
