-- =====================================================
-- Fix Study Plan Unenroll - Set Status Instead of Delete
-- =====================================================
-- Instead of hard deleting, we'll set status to 'abandoned'
-- This ensures proper cleanup and prevents orphaned data

BEGIN;

-- Update the DELETE endpoint logic by creating a function that sets status
CREATE OR REPLACE FUNCTION abandon_study_plan(p_plan_id UUID, p_pod_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  plan_exists BOOLEAN;
BEGIN
  -- Verify plan exists and belongs to pod
  SELECT EXISTS(
    SELECT 1 FROM study_plans
    WHERE id = p_plan_id AND pod_id = p_pod_id
  ) INTO plan_exists;
  
  IF NOT plan_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Set status to abandoned instead of deleting
  UPDATE study_plans
  SET status = 'abandoned', updated_at = NOW()
  WHERE id = p_plan_id AND pod_id = p_pod_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_study_plans_status_pod ON study_plans(pod_id, status) 
WHERE status IN ('active', 'draft');

COMMIT;

