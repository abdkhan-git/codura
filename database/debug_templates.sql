-- Debug: Check if templates exist and RLS status

-- 1. Check if templates exist
SELECT COUNT(*) as template_count FROM study_plan_templates;

-- 2. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'study_plan_templates';

-- 3. List all templates (this will work if you're a superuser/owner)
SELECT id, name, display_name, is_published, is_featured, created_by
FROM study_plan_templates
LIMIT 5;

-- 4. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'study_plan_templates';
