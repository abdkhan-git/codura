-- Add message search capabilities
-- This migration adds full-text search functionality for messages

-- Create a full-text search index on messages content
CREATE INDEX IF NOT EXISTS idx_messages_content_search 
ON messages USING gin(to_tsvector('english', content));

-- Create a composite index for conversation-based message search
CREATE INDEX IF NOT EXISTS idx_messages_conversation_search 
ON messages(conversation_id, created_at DESC) 
WHERE is_deleted = false;

-- Create a function to search messages within conversations
CREATE OR REPLACE FUNCTION search_messages_in_conversations(
  search_query text,
  user_id uuid,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  created_at timestamp with time zone,
  conversation_name text,
  sender_name text,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    COALESCE(c.name, 
      CASE 
        WHEN c.type = 'direct' THEN 
          (SELECT u.full_name FROM users u 
           JOIN conversation_participants cp ON u.user_id = cp.user_id 
           WHERE cp.conversation_id = c.id AND cp.user_id != search_messages_in_conversations.user_id 
           LIMIT 1)
        ELSE c.name 
      END
    ) as conversation_name,
    u.full_name as sender_name,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query)) as rank
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  JOIN conversation_participants cp ON c.id = cp.conversation_id
  JOIN users u ON m.sender_id = u.user_id
  WHERE cp.user_id = search_messages_in_conversations.user_id
    AND cp.status = 'active'
    AND m.is_deleted = false
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to search conversations by message content
CREATE OR REPLACE FUNCTION search_conversations_by_content(
  search_query text,
  user_id uuid,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  conversation_id uuid,
  conversation_name text,
  conversation_type text,
  last_message_content text,
  last_message_at timestamp with time zone,
  match_count bigint,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    COALESCE(c.name, 
      CASE 
        WHEN c.type = 'direct' THEN 
          (SELECT u.full_name FROM users u 
           JOIN conversation_participants cp ON u.user_id = cp.user_id 
           WHERE cp.conversation_id = c.id AND cp.user_id != search_conversations_by_content.user_id 
           LIMIT 1)
        ELSE c.name 
      END
    ) as conversation_name,
    c.type as conversation_type,
    c.last_message_preview as last_message_content,
    c.last_message_at,
    COUNT(m.id) as match_count,
    MAX(ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_query))) as rank
  FROM conversations c
  JOIN conversation_participants cp ON c.id = cp.conversation_id
  JOIN messages m ON c.id = m.conversation_id
  WHERE cp.user_id = search_conversations_by_content.user_id
    AND cp.status = 'active'
    AND m.is_deleted = false
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)
  GROUP BY c.id, c.name, c.type, c.last_message_preview, c.last_message_at
  ORDER BY rank DESC, c.last_message_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get recent messages for a conversation (for search context)
CREATE OR REPLACE FUNCTION get_conversation_messages_context(
  conversation_id_param uuid,
  user_id_param uuid,
  search_query text,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  message_id uuid,
  sender_id uuid,
  content text,
  created_at timestamp with time zone,
  sender_name text,
  is_match boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.sender_id,
    m.content,
    m.created_at,
    u.full_name as sender_name,
    (to_tsvector('english', m.content) @@ plainto_tsquery('english', search_query)) as is_match
  FROM messages m
  JOIN users u ON m.sender_id = u.user_id
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE m.conversation_id = conversation_id_param
    AND cp.user_id = user_id_param
    AND cp.status = 'active'
    AND m.is_deleted = false
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to update conversation search metadata when messages are updated
CREATE OR REPLACE FUNCTION update_conversation_search_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation's last_message_preview and last_message_at
  UPDATE conversations 
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN LENGTH(NEW.content) > 100 THEN LEFT(NEW.content, 100) || '...'
      ELSE NEW.content
    END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_search_metadata ON messages;
CREATE TRIGGER trigger_update_conversation_search_metadata
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_search_metadata();

-- Add comments for documentation
COMMENT ON FUNCTION search_messages_in_conversations IS 'Search for messages within user''s conversations using full-text search';
COMMENT ON FUNCTION search_conversations_by_content IS 'Search for conversations that contain messages matching the search query';
COMMENT ON FUNCTION get_conversation_messages_context IS 'Get recent messages from a conversation with search match indicators';
COMMENT ON FUNCTION update_conversation_search_metadata IS 'Update conversation metadata when messages are added or updated';
