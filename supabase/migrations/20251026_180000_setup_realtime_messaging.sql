-- ============================================================================
-- Real-Time Messaging Setup Migration
-- ============================================================================
-- This migration sets up the complete real-time messaging infrastructure
-- including tables, RLS policies, indexes, and realtime publication
--
-- Architecture:
-- - messages: Stores message content
-- - message_read_receipts: Tracks read status (separate table, not column)
-- - conversation_typing_indicators: Real-time typing indicators
-- - conversation_participants: Conversation membership
--
-- NO read_by or delivery_status columns on messages table
-- These are computed from message_read_receipts
-- ============================================================================

-- ==========================================================================
-- 1. ENSURE MESSAGING TABLES EXIST
-- ==========================================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" DEFAULT 'direct'::"text" NOT NULL,
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "created_by" "uuid" NOT NULL,
    "study_pod_id" "uuid",
    "is_archived" boolean DEFAULT false,
    "last_message_at" timestamp with time zone,
    "last_message_preview" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversations_type_check" CHECK (("type" = ANY (ARRAY['direct'::"text", 'group'::"text", 'pod_chat'::"text"]))),
    CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id")
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL DEFAULT 'member'::"text",
    "status" "text" NOT NULL DEFAULT 'active'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "last_read_message_id" "uuid",
    "is_muted" boolean DEFAULT false,
    "muted_until" timestamp with time zone,
    "is_pinned" boolean DEFAULT false,
    "added_by" "uuid",
    "removed_by" "uuid",
    "left_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
    CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "conversation_participants_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"]))),
    CONSTRAINT "conversation_participants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'left'::"text", 'removed'::"text"])))
);

-- Messages table
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "reply_to_message_id" "uuid",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL,
    CONSTRAINT "messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "messages_content_check" CHECK (((("message_type" = 'text'::"text") AND ("content" IS NOT NULL)) OR ("message_type" <> 'text'::"text"))),
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text", 'code_snippet'::"text", 'problem_link'::"text", 'system'::"text"])))
);

-- Message read receipts table (separate, not columns on messages)
CREATE TABLE IF NOT EXISTS "public"."message_read_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_read_receipts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_read_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE,
    CONSTRAINT "message_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "message_read_receipts_unique" UNIQUE ("message_id", "user_id")
);

-- Conversation typing indicators table
CREATE TABLE IF NOT EXISTS "public"."conversation_typing_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_typing_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversation_typing_indicators_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversation_typing_indicators_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
    CONSTRAINT "conversation_typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- ==========================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==========================================================================

CREATE INDEX IF NOT EXISTS "idx_conversations_created_by" ON "public"."conversations" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_conversations_last_message_at" ON "public"."conversations" ("last_message_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON "public"."conversations" ("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_conversations_type" ON "public"."conversations" ("type");

CREATE INDEX IF NOT EXISTS "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_user_id" ON "public"."conversation_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_user_status" ON "public"."conversation_participants" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_conv_user" ON "public"."conversation_participants" ("conversation_id", "user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_conversation_participants_user_pinned" ON "public"."conversation_participants" ("user_id", "is_pinned") WHERE ("is_pinned" = true);

CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "public"."messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON "public"."messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "public"."messages" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "public"."messages" ("conversation_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_message_id" ON "public"."message_read_receipts" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_user_id" ON "public"."message_read_receipts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_message_user" ON "public"."message_read_receipts" ("message_id", "user_id");

CREATE INDEX IF NOT EXISTS "idx_conversation_typing_indicators_conversation_id" ON "public"."conversation_typing_indicators" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_typing_indicators_user_id" ON "public"."conversation_typing_indicators" ("user_id");

-- ==========================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_read_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_typing_indicators" ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 4. CREATE/UPDATE RLS POLICIES
-- ==========================================================================

-- ---- CONVERSATIONS POLICIES ----

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to conversations" ON "public"."conversations";
CREATE POLICY "Service role has full access to conversations"
ON "public"."conversations" FOR ALL
TO "service_role"
USING (true) WITH CHECK (true);

-- Authenticated users can view conversations they're in or created
DROP POLICY IF EXISTS "Authenticated users can view their conversations" ON "public"."conversations";
CREATE POLICY "Authenticated users can view their conversations"
ON "public"."conversations" FOR SELECT
TO "authenticated"
USING (
    "auth"."uid"() = "created_by"
    OR "id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Authenticated users can create conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON "public"."conversations";
CREATE POLICY "Authenticated users can create conversations"
ON "public"."conversations" FOR INSERT
TO "authenticated"
WITH CHECK ("auth"."uid"() = "created_by");

-- Authenticated users can update conversations they're in
DROP POLICY IF EXISTS "Authenticated users can update their conversations" ON "public"."conversations";
CREATE POLICY "Authenticated users can update their conversations"
ON "public"."conversations" FOR UPDATE
TO "authenticated"
USING (
    "auth"."uid"() = "created_by"
    OR "id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"()
    )
);

-- ---- CONVERSATION PARTICIPANTS POLICIES ----

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to participants" ON "public"."conversation_participants";
CREATE POLICY "Service role has full access to participants"
ON "public"."conversation_participants" FOR ALL
TO "service_role"
USING (true) WITH CHECK (true);

-- Authenticated users can view participants in their conversations
DROP POLICY IF EXISTS "Authenticated users can view conversation participants" ON "public"."conversation_participants";
CREATE POLICY "Authenticated users can view conversation participants"
ON "public"."conversation_participants" FOR SELECT
TO "authenticated"
USING (
    "conversation_id" IN (
        SELECT "id" FROM "public"."conversations"
        WHERE "auth"."uid"() = "created_by"
        OR "id" IN (
            SELECT "conversation_id" FROM "public"."conversation_participants"
            WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
        )
    )
);

-- Authenticated users can update their own participant record
DROP POLICY IF EXISTS "Authenticated users can update participant status" ON "public"."conversation_participants";
CREATE POLICY "Authenticated users can update participant status"
ON "public"."conversation_participants" FOR UPDATE
TO "authenticated"
USING ("user_id" = "auth"."uid"());

-- ---- MESSAGES POLICIES ----

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to messages" ON "public"."messages";
CREATE POLICY "Service role has full access to messages"
ON "public"."messages" FOR ALL
TO "service_role"
USING (true) WITH CHECK (true);

-- Authenticated users can view messages in conversations they're in
DROP POLICY IF EXISTS "Authenticated users can view messages" ON "public"."messages";
CREATE POLICY "Authenticated users can view messages"
ON "public"."messages" FOR SELECT
TO "authenticated"
USING (
    "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Authenticated users can insert their own messages
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON "public"."messages";
CREATE POLICY "Authenticated users can insert messages"
ON "public"."messages" FOR INSERT
TO "authenticated"
WITH CHECK (
    "sender_id" = "auth"."uid"()
    AND "conversation_id" IN (
        SELECT "conversation_id" FROM "public"."conversation_participants"
        WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
    )
);

-- Authenticated users can update their own messages
DROP POLICY IF EXISTS "Authenticated users can update their messages" ON "public"."messages";
CREATE POLICY "Authenticated users can update their messages"
ON "public"."messages" FOR UPDATE
TO "authenticated"
USING ("sender_id" = "auth"."uid"());

-- ---- MESSAGE READ RECEIPTS POLICIES ----

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to read receipts" ON "public"."message_read_receipts";
CREATE POLICY "Service role has full access to read receipts"
ON "public"."message_read_receipts" FOR ALL
TO "service_role"
USING (true) WITH CHECK (true);

-- Authenticated users can view read receipts for messages in their conversations
DROP POLICY IF EXISTS "Authenticated users can view read receipts" ON "public"."message_read_receipts";
CREATE POLICY "Authenticated users can view read receipts"
ON "public"."message_read_receipts" FOR SELECT
TO "authenticated"
USING (
    "message_id" IN (
        SELECT "id" FROM "public"."messages"
        WHERE "conversation_id" IN (
            SELECT "conversation_id" FROM "public"."conversation_participants"
            WHERE "user_id" = "auth"."uid"() AND "status" = 'active'
        )
    )
);

-- Authenticated users can insert their own read receipts
DROP POLICY IF EXISTS "Authenticated users can insert read receipts" ON "public"."message_read_receipts";
CREATE POLICY "Authenticated users can insert read receipts"
ON "public"."message_read_receipts" FOR INSERT
TO "authenticated"
WITH CHECK ("user_id" = "auth"."uid"());

-- ---- TYPING INDICATORS POLICIES ----

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to typing indicators" ON "public"."conversation_typing_indicators";
CREATE POLICY "Service role has full access to typing indicators"
ON "public"."conversation_typing_indicators" FOR ALL
TO "service_role"
USING (true) WITH CHECK (true);

-- Authenticated users can manage their own typing indicators
DROP POLICY IF EXISTS "Authenticated users can manage typing indicators" ON "public"."conversation_typing_indicators";
CREATE POLICY "Authenticated users can manage typing indicators"
ON "public"."conversation_typing_indicators" FOR ALL
TO "authenticated"
USING ("user_id" = "auth"."uid"())
WITH CHECK ("user_id" = "auth"."uid"());

-- ==========================================================================
-- 5. ADD TABLES TO REALTIME PUBLICATION
-- ==========================================================================

-- Only add if not already in publication
DO $$
DECLARE
    tables_to_add TEXT[] := ARRAY[
        'conversations',
        'conversation_participants',
        'messages',
        'message_read_receipts',
        'conversation_typing_indicators'
    ];
    table_name TEXT;
    is_in_publication BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM "pg_publication_tables"
            WHERE "pubname" = 'supabase_realtime'
            AND "schemaname" = 'public'
            AND "tablename" = table_name
        ) INTO is_in_publication;

        IF NOT is_in_publication THEN
            EXECUTE format('ALTER PUBLICATION "supabase_realtime" ADD TABLE %I', table_name);
            RAISE NOTICE 'Added table % to realtime publication', table_name;
        ELSE
            RAISE NOTICE 'Table % already in realtime publication', table_name;
        END IF;
    END LOOP;
END
$$;

-- ==========================================================================
-- 6. VERIFY SETUP
-- ==========================================================================

-- Check that all messaging tables are in realtime publication
SELECT
    'Messaging tables in realtime publication:' as check,
    tablename,
    CASE WHEN pubname = 'supabase_realtime' THEN '✅' ELSE '❌' END as status
FROM "pg_publication_tables"
WHERE "schemaname" = 'public'
    AND "tablename" IN (
        'conversations',
        'conversation_participants',
        'messages',
        'message_read_receipts',
        'conversation_typing_indicators'
    )
ORDER BY tablename;

-- Check RLS is enabled on all messaging tables
SELECT
    'RLS Status:' as check,
    "relname" as table_name,
    CASE WHEN "relrowsecurity" = true THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM "pg_class"
WHERE "relkind" = 'r'
    AND "relname" IN (
        'conversations',
        'conversation_participants',
        'messages',
        'message_read_receipts',
        'conversation_typing_indicators'
    )
ORDER BY "relname";
