-- =====================================================
-- Pod Reputation & Social Proof System
-- =====================================================
-- Adds public profiles, rankings, badges, testimonials, and success tracking

-- =====================================================
-- 1. Extend Study Pods Table for Public Profiles
-- =====================================================
ALTER TABLE study_pods
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug TEXT,
ADD COLUMN IF NOT EXISTS showcase_description TEXT,
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS header_gradient TEXT DEFAULT 'blue-purple',
ADD COLUMN IF NOT EXISTS total_problems_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS testimonial_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb; -- LinkedIn, GitHub, Discord, etc.

-- Add unique constraint for public slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_pods_public_slug ON study_pods(public_slug) WHERE public_slug IS NOT NULL;

-- Add indexes for discovery
CREATE INDEX IF NOT EXISTS idx_study_pods_public ON study_pods(is_public_profile) WHERE is_public_profile = true;
CREATE INDEX IF NOT EXISTS idx_study_pods_rating ON study_pods(average_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_study_pods_featured ON study_pods(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_study_pods_verified ON study_pods(verified_at) WHERE verified_at IS NOT NULL;

-- =====================================================
-- 2. Study Pod Rankings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Ranking type
  ranking_period TEXT NOT NULL CHECK (ranking_period IN ('weekly', 'monthly', 'quarterly', 'all_time')),
  ranking_category TEXT NOT NULL CHECK (ranking_category IN (
    'completion_rate', 'consistency', 'performance', 'growth',
    'collaboration', 'activity', 'overall'
  )),

  -- Ranking data
  rank INTEGER NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  percentile DECIMAL(5,2),

  -- Change tracking
  previous_rank INTEGER,
  rank_change INTEGER,
  highest_rank INTEGER,
  highest_rank_date DATE,

  -- Leaderboard context
  total_pods_in_category INTEGER,

  -- Filtering (for category-specific leaderboards)
  university TEXT,
  region TEXT,
  pod_size_category TEXT, -- small (<5), medium (5-15), large (>15)

  -- Time period
  period_start_date DATE,
  period_end_date DATE,

  -- Metadata
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  -- Example: {"problems_solved": 120, "session_count": 45, "member_consistency": 0.87}

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, ranking_period, ranking_category, period_start_date)
);

CREATE INDEX idx_pod_rankings_pod ON study_pod_rankings(pod_id);
CREATE INDEX idx_pod_rankings_period_category ON study_pod_rankings(ranking_period, ranking_category, rank);
CREATE INDEX idx_pod_rankings_university ON study_pod_rankings(university, rank) WHERE university IS NOT NULL;
CREATE INDEX idx_pod_rankings_score ON study_pod_rankings(score DESC);

-- =====================================================
-- 3. Study Pod Badges Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Badge info
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'consistent', 'high_performance', 'mentorship', 'fast_learner',
    'problem_solver', 'collaborative', 'milestone_100', 'milestone_500',
    'streak_champion', 'perfect_attendance', 'top_10_rank', 'verified',
    'rising_star', 'veteran'
  )),
  badge_name TEXT NOT NULL,
  badge_tier TEXT DEFAULT 'bronze' CHECK (badge_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),

  -- Details
  description TEXT,
  icon_url TEXT,
  icon_emoji TEXT, -- Fallback emoji
  color TEXT DEFAULT 'gray',

  -- Achievement criteria met
  achievement_data JSONB DEFAULT '{}'::jsonb,
  -- Example: {"streak_days": 30, "problems_solved": 150, "rating": 4.8}

  -- Status
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Some badges may expire (e.g., monthly top 10)
  is_active BOOLEAN DEFAULT true,
  is_showcased BOOLEAN DEFAULT true, -- Display on public profile

  -- Badge progression
  progress_to_next_tier DECIMAL(5,2), -- For upgradeable badges

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, badge_type)
);

CREATE INDEX idx_pod_badges_pod ON study_pod_badges(pod_id);
CREATE INDEX idx_pod_badges_type ON study_pod_badges(badge_type);
CREATE INDEX idx_pod_badges_tier ON study_pod_badges(badge_tier);
CREATE INDEX idx_pod_badges_active ON study_pod_badges(is_active) WHERE is_active = true;

-- =====================================================
-- 4. Study Pod Testimonials Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Testimonial content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  testimonial_text TEXT NOT NULL,
  headline TEXT, -- Short catchy headline

  -- Member info at time of testimonial
  member_role TEXT, -- What role they had
  time_in_pod_months INTEGER,

  -- Highlights
  highlights TEXT[], -- ["Great mentorship", "Structured learning", ...]
  improvement_areas TEXT[], -- Optional constructive feedback

  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,

  -- Moderation
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Helpfulness tracking
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX idx_pod_testimonials_pod ON study_pod_testimonials(pod_id);
CREATE INDEX idx_pod_testimonials_user ON study_pod_testimonials(user_id);
CREATE INDEX idx_pod_testimonials_rating ON study_pod_testimonials(rating DESC);
CREATE INDEX idx_pod_testimonials_featured ON study_pod_testimonials(is_featured) WHERE is_featured = true;
CREATE INDEX idx_pod_testimonials_approved ON study_pod_testimonials(is_approved) WHERE is_approved = true;

-- =====================================================
-- 5. Testimonial Reactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_testimonial_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  testimonial_id UUID NOT NULL REFERENCES study_pod_testimonials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'not_helpful', 'insightful', 'motivating')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(testimonial_id, user_id, reaction_type)
);

CREATE INDEX idx_testimonial_reactions_testimonial ON study_pod_testimonial_reactions(testimonial_id);
CREATE INDEX idx_testimonial_reactions_user ON study_pod_testimonial_reactions(user_id);

-- =====================================================
-- 6. Study Pod Success Stories Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Story type
  story_type TEXT NOT NULL CHECK (story_type IN (
    'job_offer', 'interview_success', 'promotion',
    'skill_mastery', 'project_launch', 'certification'
  )),

  -- Company/Organization info
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_name TEXT, -- If not in companies table

  -- Story details
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  key_learnings TEXT,

  -- Job offer specific
  offer_details JSONB,
  -- Example: {"position": "Software Engineer", "level": "L4", "location": "Seattle", "salary_range": "..."}

  -- Timeline
  preparation_duration_weeks INTEGER,
  interviews_attended INTEGER,
  offers_received INTEGER,

  -- Media
  image_urls TEXT[] DEFAULT '{}',
  proof_documents TEXT[], -- Optional verification docs

  -- Attribution
  helped_by_members UUID[], -- Members who helped
  key_problems_solved INTEGER[], -- Problems that helped most

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),

  -- Engagement
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_success_stories_pod ON study_pod_success_stories(pod_id);
CREATE INDEX idx_success_stories_user ON study_pod_success_stories(user_id);
CREATE INDEX idx_success_stories_type ON study_pod_success_stories(story_type);
CREATE INDEX idx_success_stories_company ON study_pod_success_stories(company_id);
CREATE INDEX idx_success_stories_featured ON study_pod_success_stories(is_featured) WHERE is_featured = true;
CREATE INDEX idx_success_stories_public ON study_pod_success_stories(is_public) WHERE is_public = true;

-- =====================================================
-- 7. Study Pod Alumni Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current status
  current_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  current_company_name TEXT,
  current_position TEXT,
  current_level TEXT, -- L3, L4, Senior, etc.

  -- Timeline
  graduation_date DATE, -- When they "graduated" from the pod
  time_in_pod_months INTEGER,

  -- Links
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,

  -- Achievements during pod membership
  problems_solved_count INTEGER DEFAULT 0,
  sessions_attended INTEGER DEFAULT 0,
  help_score DECIMAL(5,2), -- How much they helped others

  -- Opt-in for networking
  open_to_mentorship BOOLEAN DEFAULT false,
  open_to_referrals BOOLEAN DEFAULT false,
  willing_to_speak BOOLEAN DEFAULT false, -- Guest speaker for pod

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Bio
  short_bio TEXT,
  advice_for_members TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX idx_pod_alumni_pod ON study_pod_alumni(pod_id);
CREATE INDEX idx_pod_alumni_user ON study_pod_alumni(user_id);
CREATE INDEX idx_pod_alumni_company ON study_pod_alumni(current_company_id);
CREATE INDEX idx_pod_alumni_public ON study_pod_alumni(is_public) WHERE is_public = true;
CREATE INDEX idx_pod_alumni_featured ON study_pod_alumni(is_featured) WHERE is_featured = true;

-- =====================================================
-- 8. Pod Profile Views Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip_address INET,
  viewer_user_agent TEXT,

  -- Session info
  session_id TEXT,
  referrer TEXT,
  landing_section TEXT, -- Which section they viewed

  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pod_profile_views_pod ON study_pod_profile_views(pod_id);
CREATE INDEX idx_pod_profile_views_user ON study_pod_profile_views(viewer_user_id);
CREATE INDEX idx_pod_profile_views_date ON study_pod_profile_views(viewed_at DESC);

-- =====================================================
-- Functions
-- =====================================================

-- Update pod average rating when testimonials change
CREATE OR REPLACE FUNCTION update_pod_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_pod_id UUID;
BEGIN
  v_pod_id := COALESCE(NEW.pod_id, OLD.pod_id);

  UPDATE study_pods
  SET
    average_rating = (
      SELECT AVG(rating)
      FROM study_pod_testimonials
      WHERE pod_id = v_pod_id AND is_approved = true
    ),
    testimonial_count = (
      SELECT COUNT(*)
      FROM study_pod_testimonials
      WHERE pod_id = v_pod_id AND is_approved = true
    )
  WHERE id = v_pod_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pod_rating ON study_pod_testimonials;
CREATE TRIGGER trigger_update_pod_rating
AFTER INSERT OR UPDATE OF rating, is_approved OR DELETE ON study_pod_testimonials
FOR EACH ROW EXECUTE FUNCTION update_pod_rating();

-- Update view count when profile is viewed
CREATE OR REPLACE FUNCTION increment_pod_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE study_pods
  SET view_count = view_count + 1
  WHERE id = NEW.pod_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_pod_view_count ON study_pod_profile_views;
CREATE TRIGGER trigger_increment_pod_view_count
AFTER INSERT ON study_pod_profile_views
FOR EACH ROW EXECUTE FUNCTION increment_pod_view_count();

-- Update testimonial reaction counts
CREATE OR REPLACE FUNCTION update_testimonial_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'helpful' THEN
      UPDATE study_pod_testimonials
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.testimonial_id;
    ELSIF NEW.reaction_type = 'not_helpful' THEN
      UPDATE study_pod_testimonials
      SET not_helpful_count = not_helpful_count + 1
      WHERE id = NEW.testimonial_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'helpful' THEN
      UPDATE study_pod_testimonials
      SET helpful_count = GREATEST(helpful_count - 1, 0)
      WHERE id = OLD.testimonial_id;
    ELSIF OLD.reaction_type = 'not_helpful' THEN
      UPDATE study_pod_testimonials
      SET not_helpful_count = GREATEST(not_helpful_count - 1, 0)
      WHERE id = OLD.testimonial_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_testimonial_reactions ON study_pod_testimonial_reactions;
CREATE TRIGGER trigger_update_testimonial_reactions
AFTER INSERT OR DELETE ON study_pod_testimonial_reactions
FOR EACH ROW EXECUTE FUNCTION update_testimonial_reaction_counts();

-- Award badges based on achievements
CREATE OR REPLACE FUNCTION check_and_award_badges(p_pod_id UUID)
RETURNS void AS $$
DECLARE
  v_member_count INTEGER;
  v_completion_rate DECIMAL;
  v_session_count INTEGER;
  v_avg_rating DECIMAL;
BEGIN
  -- Get pod stats
  SELECT member_count INTO v_member_count
  FROM study_pods WHERE id = p_pod_id;

  -- Check for various badge criteria

  -- Consistent badge: Active for 3+ months with regular sessions
  SELECT COUNT(*) INTO v_session_count
  FROM study_pod_sessions
  WHERE pod_id = p_pod_id
    AND scheduled_at >= NOW() - INTERVAL '3 months';

  IF v_session_count >= 24 THEN -- ~2 sessions per week
    INSERT INTO study_pod_badges (pod_id, badge_type, badge_name, description, icon_emoji, color)
    VALUES (
      p_pod_id,
      'consistent',
      'Consistency Champion',
      'Maintained regular study sessions for 3 months',
      '🏆',
      'green'
    )
    ON CONFLICT (pod_id, badge_type) DO NOTHING;
  END IF;

  -- High Performance badge: 4.5+ rating
  SELECT average_rating INTO v_avg_rating
  FROM study_pods WHERE id = p_pod_id;

  IF v_avg_rating >= 4.5 THEN
    INSERT INTO study_pod_badges (pod_id, badge_type, badge_name, description, icon_emoji, color)
    VALUES (
      p_pod_id,
      'high_performance',
      'Excellence Award',
      'Maintained 4.5+ star rating',
      '⭐',
      'gold'
    )
    ON CONFLICT (pod_id, badge_type) DO NOTHING;
  END IF;

  -- More badge logic can be added here...
END;
$$ LANGUAGE plpgsql;

-- Generate public slug from pod name
CREATE OR REPLACE FUNCTION generate_public_slug()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  IF NEW.is_public_profile = true AND NEW.public_slug IS NULL THEN
    -- Generate base slug from name
    v_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM study_pods WHERE public_slug = v_slug) LOOP
      v_counter := v_counter + 1;
      v_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || v_counter;
    END LOOP;

    NEW.public_slug := v_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_public_slug ON study_pods;
CREATE TRIGGER trigger_generate_public_slug
BEFORE INSERT OR UPDATE OF is_public_profile, name ON study_pods
FOR EACH ROW EXECUTE FUNCTION generate_public_slug();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE study_pod_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_testimonial_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_profile_views ENABLE ROW LEVEL SECURITY;

-- Rankings Policies
CREATE POLICY "Anyone can view pod rankings"
  ON study_pod_rankings FOR SELECT
  USING (true);

CREATE POLICY "System can manage rankings"
  ON study_pod_rankings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Badges Policies
CREATE POLICY "Anyone can view active badges"
  ON study_pod_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "System and pod admins can manage badges"
  ON study_pod_badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_badges.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Testimonials Policies
CREATE POLICY "Anyone can view approved public testimonials"
  ON study_pod_testimonials FOR SELECT
  USING (is_approved = true AND is_public = true);

CREATE POLICY "Pod members can view all pod testimonials"
  ON study_pod_testimonials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_testimonials.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Members can create testimonials"
  ON study_pod_testimonials FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_testimonials.pod_id
        AND study_pod_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own testimonials"
  ON study_pod_testimonials FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Pod admins can moderate testimonials"
  ON study_pod_testimonials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_testimonials.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Testimonial Reactions Policies
CREATE POLICY "Users can manage their own reactions"
  ON study_pod_testimonial_reactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view reactions"
  ON study_pod_testimonial_reactions FOR SELECT
  USING (true);

-- Success Stories Policies
CREATE POLICY "Anyone can view public success stories"
  ON study_pod_success_stories FOR SELECT
  USING (is_public = true);

CREATE POLICY "Pod members can view all pod stories"
  ON study_pod_success_stories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_success_stories.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Users can create their own success stories"
  ON study_pod_success_stories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own success stories"
  ON study_pod_success_stories FOR UPDATE
  USING (user_id = auth.uid());

-- Alumni Policies
CREATE POLICY "Anyone can view public alumni"
  ON study_pod_alumni FOR SELECT
  USING (is_public = true);

CREATE POLICY "Pod members can view all pod alumni"
  ON study_pod_alumni FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_alumni.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own alumni profile"
  ON study_pod_alumni FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Profile Views Policies
CREATE POLICY "System can track views"
  ON study_pod_profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Pod admins can view analytics"
  ON study_pod_profile_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_profile_views.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Pod reputation system migration completed successfully';
  RAISE NOTICE 'Tables: study_pod_rankings, study_pod_badges, study_pod_testimonials, study_pod_success_stories, study_pod_alumni, study_pod_profile_views';
  RAISE NOTICE 'Extended: study_pods table with public profile columns';
END $$;
