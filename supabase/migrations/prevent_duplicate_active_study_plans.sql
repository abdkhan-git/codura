-- =====================================================
-- Prevent duplicate active/draft study plans per pod/template
-- =====================================================
BEGIN;

-- Unique constraint for active/draft plans
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_plans_unique_active_per_template
ON study_plans(pod_id, template_id)
WHERE status IN ('draft', 'active');

COMMIT;

