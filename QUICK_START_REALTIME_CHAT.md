# Quick Start - Real-Time Chat

## ✅ Pre-Flight Checklist

Before starting the dev server, make sure:

- [ ] `.env` file has `PORT=3000` (check line 14)
- [ ] All Node processes killed: `taskkill /F /IM node.exe`
- [ ] Browser console ready (F12) to watch for logs

## 🚀 Start Dev Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 15.5.3
- Local: http://localhost:3000  ← Should be 3000!
- Experiments (Turbopack):
  * turboPackVersion: enabled
```

Visit: `http://localhost:3000`

## 🧪 Test Real-Time Chat

### 1. Open Two Browser Windows
- Window 1: `http://localhost:3000`
- Window 2: `http://localhost:3000` (or different browser)

### 2. Login to Both
- Login with same account or different accounts

### 3. Start a Chat Conversation
- Open messages in Window 1
- Open messages in Window 2

### 4. Test Features

#### ✅ Messages Appear Instantly
- Type message in Window 1
- Should appear instantly in Window 2
- Should see checkmark: ✓ (sent) → ✓✓ (delivered/read)

#### ✅ Typing Indicators Show
- Start typing in Window 1
- Window 2 should show "User is typing..."
- Stop typing → indicator disappears

#### ✅ Reactions Update in Real-Time
- Click emoji on a message in Window 1
- Reaction appears instantly in Window 2
- Shows reaction count

#### ✅ Last Message Updates in List
- Send message in group chat
- Conversation list in Window 2 updates instantly
- Shows new last message without refresh

#### ✅ Read Receipts Show
- Send message from Window 1
- Open chat in Window 2 to see it
- Window 1 should show ✓✓ (double check)

## 🔍 Debug in Browser Console

**Expected logs when opening chat:**
```
✅ Subscribed to messages for: [conversation-id]
📨 Fetching messages for conversation: [conversation-id]
✅ Subscribed to read receipts for: [conversation-id]
✅ Subscribed to typing indicators for conversation: [conversation-id]
```

**If you see errors:**
```
❌ Channel error subscribing to messages
```

**Check:**
1. Is Supabase Real-Time enabled in dashboard?
2. Are your RLS policies correct?
3. Is NEXT_PUBLIC_SUPABASE_URL correct in .env?

## 🛑 If Something Breaks

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Clear next cache (optional)
rmdir /s /q .next

# Reinstall dependencies (if needed)
npm install

# Start fresh
npm run dev
```

## 📊 Monitor Network

DevTools → Network tab:

1. Filter by "WS" (WebSocket)
2. Should see: `wss://prxtkrteujbptauwhnxs.supabase.co/realtime/v1/...`
3. Status: `101 Switching Protocols` (WebSocket connected)
4. Should NOT show "Close" or "Error"

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Running on 3001, 3002, etc | Kill node: `taskkill /F /IM node.exe` |
| "Channel error" | Check Supabase Real-Time is enabled |
| Messages slow to load | Check `/api/conversations/[id]/messages` response time |
| Typing indicators missing | Verify RLS allows read on `conversation_typing_indicators` |
| No real-time updates | Check browser console for errors |

## 📚 Documentation

For detailed info, see:
- `REALTIME_CHAT_FIXES.md` - What was broken and how it was fixed
- `REALTIME_CHAT_REQUIREMENTS.md` - Full configuration guide
- `DATABASE_SCHEMA_ANALYSIS.md` - Why no migrations were needed

## ✨ What's New

Your app now has:

✅ **Real-Time Messages**
- Messages appear instantly (no polling)
- Works in group chats and DMs
- Optimistic updates with confirmation

✅ **Typing Indicators**
- See when others are typing
- Auto-removes after 5 seconds
- Works in all conversation types

✅ **Reactions**
- Add emoji reactions to messages
- Updates instantly for all users
- Shows reaction count

✅ **Read Receipts**
- Single check: message delivered
- Double check: message read
- Works for all participants

✅ **Last Message Preview**
- Group chat list updates instantly
- No need to refresh to see new messages
- Sorted by recent activity

## 🎯 Next Steps

1. Test all features with another user
2. Monitor performance in production
3. Consider adding:
   - Message search
   - File uploads
   - Reactions limit
   - Typing timeout customization

## 💡 Pro Tips

**Keyboard Shortcuts:**
- Enter: Send message
- Shift+Enter: New line
- Escape: Close emoji picker

**For Testing:**
- Use different browsers for multi-user testing
- Open DevTools in both windows to monitor logs
- Check Network tab to see real-time WebSocket events

## 🆘 Still Having Issues?

1. Check the documentation files listed above
2. Look at browser console logs (F12 → Console)
3. Check Network tab for WebSocket connection
4. Verify Supabase project settings

Good luck! 🚀
