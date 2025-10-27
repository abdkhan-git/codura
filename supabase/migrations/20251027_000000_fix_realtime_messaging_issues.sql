-- ============================================================================
-- Fix Real-Time Messaging - Critical Issues
-- ============================================================================
-- 1. Add missing unique constraint on typing_indicators
-- 2. Fix RLS policies for typing_indicators (allow SELECT in conversations)
-- 3. Add missing RLS policies for conversation_participants

-- ============================================================================
-- 1. Add unique constraint for typing_indicators upsert
-- ============================================================================

ALTER TABLE "public"."conversation_typing_indicators"
ADD CONSTRAINT "conversation_typing_indicators_unique"
UNIQUE ("conversation_id", "user_id");

-- ============================================================================
-- 2. Fix typing_indicators RLS policies
-- ============================================================================

-- Drop the old restrictive ALL policy
DROP POLICY IF EXISTS "Authenticated users can manage typing indicators"
ON "public"."conversation_typing_indicators";

DROP POLICY IF EXISTS "Authenticated users can view typing indicators"
ON "public"."conversation_typing_indicators";

DROP POLICY IF EXISTS "Authenticated users can insert typing indicators"
ON "public"."conversation_typing_indicators";

DROP POLICY IF EXISTS "Authenticated users can update typing indicators"
ON "public"."conversation_typing_indicators";

DROP POLICY IF EXISTS "Authenticated users can delete typing indicators"
ON "public"."conversation_typing_indicators";

-- Create proper SELECT policy - users can view typing in conversations they're in
CREATE POLICY "Users can view typing indicators in their conversations"
ON "public"."conversation_typing_indicators" FOR SELECT
TO "authenticated"
USING (
    "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Create INSERT policy - users can only insert their own typing
CREATE POLICY "Users can insert their own typing indicators"
ON "public"."conversation_typing_indicators" FOR INSERT
TO "authenticated"
WITH CHECK (
    "user_id" = "auth"."uid"()
    AND "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Create UPDATE policy - users can only update their own typing
CREATE POLICY "Users can update their own typing indicators"
ON "public"."conversation_typing_indicators" FOR UPDATE
TO "authenticated"
USING (
    "user_id" = "auth"."uid"()
    AND "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
)
WITH CHECK (
    "user_id" = "auth"."uid"()
    AND "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Create DELETE policy - users can only delete their own typing
CREATE POLICY "Users can delete their own typing indicators"
ON "public"."conversation_typing_indicators" FOR DELETE
TO "authenticated"
USING (
    "user_id" = "auth"."uid"()
    AND "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- ============================================================================
-- 3. Add missing RLS policies for conversation_participants
-- ============================================================================

-- INSERT policy - users can be added to conversations (service role does this, but add for safety)
DROP POLICY IF EXISTS "Users can be added as participants"
ON "public"."conversation_participants";

CREATE POLICY "Authenticated users can be added to conversations"
ON "public"."conversation_participants" FOR INSERT
TO "authenticated"
WITH CHECK (true);

-- DELETE policy - users can leave conversations or admins can remove them
DROP POLICY IF EXISTS "Users can leave conversations"
ON "public"."conversation_participants";

CREATE POLICY "Users can leave conversations"
ON "public"."conversation_participants" FOR DELETE
TO "authenticated"
USING ("user_id" = "auth"."uid"());

-- ============================================================================
-- 4. Add DELETE policy for messages (soft delete support)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their own messages"
ON "public"."messages";

CREATE POLICY "Users can delete their own messages"
ON "public"."messages" FOR DELETE
TO "authenticated"
USING ("sender_id" = "auth"."uid"());

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify unique constraint was added
SELECT
    constraint_name,
    table_name,
    column_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'conversation_typing_indicators'
    AND constraint_name LIKE '%unique%';

-- Verify RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'conversation_typing_indicators'
ORDER BY tablename, policyname;
