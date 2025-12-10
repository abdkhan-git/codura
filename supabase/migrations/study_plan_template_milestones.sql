-- =====================================================
-- Study Plan Template Milestones
-- =====================================================
-- Adds milestone templates that are linked to study plan templates
-- These serve as blueprints for creating instance-specific milestones

CREATE TABLE IF NOT EXISTS study_plan_template_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template reference
  template_id UUID NOT NULL REFERENCES study_plan_templates(id) ON DELETE CASCADE,

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  learning_objectives TEXT[],

  -- Ordering
  milestone_order INTEGER NOT NULL,

  -- Problem requirements
  problem_ids INTEGER[] DEFAULT '{}',
  required_problems INTEGER, -- Minimum to complete milestone
  total_problems INTEGER DEFAULT 0,

  -- Prerequisites
  prerequisite_milestone_ids UUID[] DEFAULT '{}',

  -- Resources
  recommended_resources JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "article", "title": "...", "url": "..."}, {"type": "video", "title": "...", "url": "..."}]

  -- Rewards
  rewards JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "badge", "badge_id": "..."}, {"type": "points", "amount": 100}]

  -- Completion criteria
  completion_criteria JSONB DEFAULT '{}'::jsonb,
  -- Example: {"min_problems": 5, "min_percentage": 80, "time_limit_days": 7}

  -- Estimated time
  estimated_hours INTEGER,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_milestones_template ON study_plan_template_milestones(template_id);
CREATE INDEX idx_template_milestones_order ON study_plan_template_milestones(template_id, milestone_order);

-- Enable RLS
ALTER TABLE study_plan_template_milestones ENABLE ROW LEVEL SECURITY;

-- Anyone can view template milestones for published templates
CREATE POLICY "Anyone can view template milestones for published templates"
  ON study_plan_template_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_plan_templates
      WHERE study_plan_templates.id = study_plan_template_milestones.template_id
        AND study_plan_templates.is_published = true
    )
  );

-- Users can create template milestones
CREATE POLICY "Users can create template milestones"
  ON study_plan_template_milestones FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Creators can update their template milestones
CREATE POLICY "Creators can update their template milestones"
  ON study_plan_template_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_plan_templates
      WHERE study_plan_templates.id = study_plan_template_milestones.template_id
        AND study_plan_templates.created_by = auth.uid()
    )
  );

-- Update template total_milestones count when template milestones are added/removed
CREATE OR REPLACE FUNCTION update_template_milestone_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE study_plan_templates
    SET total_milestones = (
      SELECT COUNT(*)
      FROM study_plan_template_milestones
      WHERE template_id = OLD.template_id
    )
    WHERE id = OLD.template_id;
    RETURN OLD;
  ELSE
    UPDATE study_plan_templates
    SET total_milestones = (
      SELECT COUNT(*)
      FROM study_plan_template_milestones
      WHERE template_id = NEW.template_id
    )
    WHERE id = NEW.template_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_milestone_count
AFTER INSERT OR DELETE ON study_plan_template_milestones
FOR EACH ROW EXECUTE FUNCTION update_template_milestone_count();

-- Function to copy template milestones to a study plan instance
CREATE OR REPLACE FUNCTION copy_template_milestones_to_plan(p_template_id UUID, p_plan_id UUID)
RETURNS void AS $$
DECLARE
  v_milestone RECORD;
  v_new_milestone_id UUID;
  v_milestone_map JSONB := '{}'::jsonb;
BEGIN
  -- Copy each template milestone to the plan
  FOR v_milestone IN
    SELECT * FROM study_plan_template_milestones
    WHERE template_id = p_template_id
    ORDER BY milestone_order
  LOOP
    INSERT INTO study_plan_milestones (
      plan_id,
      template_milestone_id,
      title,
      description,
      learning_objectives,
      milestone_order,
      problem_ids,
      required_problems,
      total_problems,
      prerequisite_milestone_ids,
      recommended_resources,
      rewards,
      completion_criteria,
      estimated_hours,
      is_locked,
      metadata
    ) VALUES (
      p_plan_id,
      v_milestone.id,
      v_milestone.title,
      v_milestone.description,
      v_milestone.learning_objectives,
      v_milestone.milestone_order,
      v_milestone.problem_ids,
      v_milestone.required_problems,
      v_milestone.total_problems,
      v_milestone.prerequisite_milestone_ids,
      v_milestone.recommended_resources,
      v_milestone.rewards,
      v_milestone.completion_criteria,
      v_milestone.estimated_hours,
      CASE WHEN v_milestone.milestone_order = 1 THEN false ELSE true END, -- First milestone unlocked
      v_milestone.metadata
    ) RETURNING id INTO v_new_milestone_id;

    -- Store mapping for updating prerequisites
    v_milestone_map := v_milestone_map || jsonb_build_object(v_milestone.id::text, v_new_milestone_id::text);
  END LOOP;

  -- Update prerequisite references to point to new milestone IDs
  UPDATE study_plan_milestones sm
  SET prerequisite_milestone_ids = (
    SELECT ARRAY_AGG(
      (v_milestone_map->>old_id::text)::uuid
    )
    FROM unnest(sm.prerequisite_milestone_ids) old_id
    WHERE v_milestone_map ? old_id::text
  )
  WHERE sm.plan_id = p_plan_id
    AND array_length(sm.prerequisite_milestone_ids, 1) > 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically copy template milestones when a study plan is created
CREATE OR REPLACE FUNCTION auto_copy_template_milestones()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    PERFORM copy_template_milestones_to_plan(NEW.template_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_copy_template_milestones
AFTER INSERT ON study_plans
FOR EACH ROW
WHEN (NEW.template_id IS NOT NULL)
EXECUTE FUNCTION auto_copy_template_milestones();

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Study plan template milestones migration completed successfully';
END $$;
