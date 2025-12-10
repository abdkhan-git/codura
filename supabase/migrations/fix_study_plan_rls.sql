-- Fix RLS policies for study plan templates
-- This allows users to view published templates

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE study_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_template_milestones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published templates" ON study_plan_templates;
DROP POLICY IF EXISTS "Anyone can view template milestones for published templates" ON study_plan_template_milestones;
DROP POLICY IF EXISTS "Users can create templates" ON study_plan_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON study_plan_templates;

-- Allow everyone (including anonymous users) to view published templates
CREATE POLICY "Anyone can view published templates"
  ON study_plan_templates FOR SELECT
  USING (is_published = true);

-- Allow everyone to view milestones for published templates
CREATE POLICY "Anyone can view template milestones for published templates"
  ON study_plan_template_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_plan_templates
      WHERE study_plan_templates.id = study_plan_template_milestones.template_id
        AND study_plan_templates.is_published = true
    )
  );

-- Allow authenticated users to create templates
CREATE POLICY "Users can create templates"
  ON study_plan_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates"
  ON study_plan_templates FOR UPDATE
  USING (created_by = auth.uid());

COMMIT;
