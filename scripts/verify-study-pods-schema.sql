-- Verification script for study pods tables
-- This checks if all required tables and columns exist

-- Check if study_pods table exists and has all required columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('study_pods', 'study_pod_members', 'study_pod_activities', 'study_pod_sessions')
ORDER BY table_name, ordinal_position;

-- Check constraints on study_pods
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN ('study_pods', 'study_pod_members', 'study_pod_activities')
ORDER BY rel.relname, con.conname;

-- Test insert into study_pods (this will fail but show the actual error)
-- Uncomment to test:
-- INSERT INTO study_pods (created_by, name, subject, skill_level, max_members)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test Pod', 'Algorithms', 'Beginner', 6);
