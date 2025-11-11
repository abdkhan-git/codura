-- Fix Study Pods RLS Policies - Remove Infinite Recursion
-- Run this in your Supabase SQL Editor

-- Step 1: Drop all existing policies on study_pod_members to start fresh
DROP POLICY IF EXISTS "Users can view pod members" ON study_pod_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON study_pod_members;
DROP POLICY IF EXISTS "Owners can manage members" ON study_pod_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON study_pod_members;
DROP POLICY IF EXISTS "Pod owners can manage members" ON study_pod_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON study_pod_members;

-- Step 2: Create simple, non-recursive policies

-- Allow users to view all pod members (for public pods)
CREATE POLICY "Anyone can view pod members"
  ON study_pod_members
  FOR SELECT
  USING (true);

-- Allow users to insert themselves as members (for joining pods)
-- This is the key fix - no recursive checks
CREATE POLICY "Users can join pods"
  ON study_pod_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow pod owners to insert members (for creating pods and inviting)
-- Check ownership directly on study_pods table without recursion
CREATE POLICY "Pod creators can add members"
  ON study_pod_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pods
      WHERE study_pods.id = study_pod_members.pod_id
      AND study_pods.created_by = auth.uid()
    )
  );

-- Allow pod owners to update member status
CREATE POLICY "Pod creators can update members"
  ON study_pod_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_pods
      WHERE study_pods.id = study_pod_members.pod_id
      AND study_pods.created_by = auth.uid()
    )
  );

-- Allow users to update their own membership (leave pod, etc.)
CREATE POLICY "Users can update their own membership"
  ON study_pod_members
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow pod owners to delete members
CREATE POLICY "Pod creators can delete members"
  ON study_pod_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_pods
      WHERE study_pods.id = study_pod_members.pod_id
      AND study_pods.created_by = auth.uid()
    )
  );

-- Allow users to delete their own membership
CREATE POLICY "Users can leave pods"
  ON study_pod_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 3: Fix study_pods policies (if needed)
DROP POLICY IF EXISTS "Users can view public pods" ON study_pods;
DROP POLICY IF EXISTS "Users can create pods" ON study_pods;
DROP POLICY IF EXISTS "Owners can manage their pods" ON study_pods;

CREATE POLICY "Anyone can view public pods"
  ON study_pods
  FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create pods"
  ON study_pods
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Pod creators can update their pods"
  ON study_pods
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Pod creators can delete their pods"
  ON study_pods
  FOR DELETE
  USING (auth.uid() = created_by);

-- Step 4: Fix study_pod_activities policies
DROP POLICY IF EXISTS "Users can view pod activities" ON study_pod_activities;
DROP POLICY IF EXISTS "Users can create activities" ON study_pod_activities;

CREATE POLICY "Anyone can view pod activities"
  ON study_pod_activities
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create activities"
  ON study_pod_activities
  FOR INSERT
  WITH CHECK (true);

-- Verify the changes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('study_pods', 'study_pod_members', 'study_pod_activities')
ORDER BY tablename, policyname;
