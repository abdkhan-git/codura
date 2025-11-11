-- Clean up duplicate and potentially problematic policies

-- Remove the recursive policy that could still cause issues
DROP POLICY IF EXISTS "Users can view members of pods they belong to" ON study_pod_members;

-- Remove duplicate study_pods policies
DROP POLICY IF EXISTS "Pod owners can delete their pods" ON study_pods;
DROP POLICY IF EXISTS "Pod owners can update their pods" ON study_pods;
DROP POLICY IF EXISTS "Public pods are viewable by everyone" ON study_pods;
DROP POLICY IF EXISTS "Users can view pods they are members of" ON study_pods;

-- Verify the cleanup
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('study_pods', 'study_pod_members', 'study_pod_activities')
ORDER BY tablename, policyname;
