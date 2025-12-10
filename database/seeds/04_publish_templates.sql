-- Publish all study plan templates
-- Run this if templates were already seeded without is_published flag

UPDATE study_plan_templates
SET is_published = true
WHERE is_published = false;

-- Verify
SELECT 
  display_name, 
  is_published, 
  is_featured,
  total_milestones
FROM study_plan_templates
ORDER BY display_name;


