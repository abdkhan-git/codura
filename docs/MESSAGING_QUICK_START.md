# Messaging System - Quick Start Guide

## Step 1: Run the Database Migration

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents from: `scripts/20241027_revamp_messaging_system.sql`
5. Paste into the SQL editor
6. Click **Run**
7. Wait for completion (you should see "Success" message)

This sets up:
- Optimized message tables with real-time support
- Database functions for reactions, read receipts, etc.
- Updated RLS policies
- Real-time subscriptions

## Step 2: Test the Messages Page

Navigate to `/messages` in your app. You should see:

- **Left sidebar** - List of your conversations
- **Main area** - Chat interface (empty if no conversation selected)
- **Floating button** - Bottom-right corner for quick access

## Step 3: Start a Conversation

1. Click the **+** button in the conversations sidebar
2. Search for a user by name or username
3. Click on a user to start a direct message
4. The conversation will appear in your list

## Step 4: Send a Message

1. Type in the message input box
2. Press **Ctrl+Enter** (or **Cmd+Enter** on Mac) or click the send button
3. Message appears **instantly** (optimistic update)
4. Other user sees it in real-time

## Step 5: React to Messages

1. Hover over a message
2. Click the **😊** button
3. Pick an emoji
4. Reaction appears instantly on all devices

## Step 6: Edit Messages

1. Hover over your message
2. Click the **✏️** button
3. Edit the text
4. Click **Save**

## Step 7: Delete Messages

1. Hover over your message
2. Click the **🗑️** button
3. Confirm deletion
4. Message is removed from conversation

## Features Overview

### Real-time Messaging ✅
- Messages appear instantly when sent
- No need to refresh
- Works across multiple devices/tabs

### Message Reactions ✅
- Click emoji button to react
- See who reacted
- Remove reactions

### Read Receipts ✅
- See "Read by X" under messages
- Shows who has read your messages

### Typing Indicators (Hook Ready)
- Foundation implemented
- UI integration ready in conversations-list

### Message Editing ✅
- Edit your messages
- Shows "(edited)" indicator

### Message Deletion ✅
- Soft delete (message hidden but not removed)
- Shows as "deleted message"

### Conversation Management
- Mute conversations
- Pin conversations
- Archive conversations
- Leave group chats

## Using the Floating Messenger

The floating messenger appears as a button in the **bottom-right corner**:

- **Closed**: Shows unread count badge
- **Opened**: Shows full conversation list
- **In Chat**: Shows chat interface with back button

It's available on **every page** of your app for quick access.

## Common Tasks

### Send a message programmatically
```typescript
import { sendMessage } from '@/hooks/use-messages';

await sendMessage(conversationId, "Hello!", userId);
```

### Start a DM with someone
```typescript
import { startDirectMessage } from '@/hooks/use-conversations';

const conversationId = await startDirectMessage(userId, otherUserId);
```

### Get user conversations
```typescript
import { useConversations } from '@/hooks/use-conversations';

const { conversations } = useConversations(userId);
```

### Subscribe to real-time messages
```typescript
import { useRealtimeSubscription } from '@/hooks/use-realtime';

const channel = useRealtimeSubscription(
  'messages',
  `conversation_id=eq.${conversationId}`,
  (payload) => {
    console.log('Message update:', payload);
  }
);
```

## Troubleshooting

### Messages not showing in real-time?
- Check browser console for errors
- Verify conversation_id is correct
- Ensure you're a participant in the conversation
- Check network tab for subscription issues

### Can't send messages?
- Make sure you're authenticated
- Verify the conversation exists
- Check that you're in the conversation_participants table

### Reactions not working?
- Verify the message ID
- Check browser console for errors
- Try adding a different emoji

### Floating messenger not showing?
- Ensure you're authenticated
- Check if FloatingMessengerProvider is in layout
- Verify browser allows fixed positioning

## Next Steps

1. Test with a friend - open in 2 browser windows
2. Try the floating messenger on different pages
3. Test mobile responsiveness
4. Test on multiple devices

## Performance Tips

- Messages load in batches of 50
- Scroll up to load older messages
- Conversations list is cached
- Real-time subscriptions auto-cleanup

## Mobile Responsiveness

The messaging system is fully responsive:
- **Desktop**: Split view (sidebar + chat)
- **Tablet**: Collapsible sidebar
- **Mobile**: Full-screen chat with back button

## Need Help?

Check these files:
- `MESSAGING_SYSTEM_REVAMP.md` - Full architecture documentation
- `types/messaging.ts` - Type definitions
- `hooks/use-messages.ts` - Message operations
- `hooks/use-conversations.ts` - Conversation operations

