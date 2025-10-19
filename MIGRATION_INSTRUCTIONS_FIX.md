# 🚨 **CRITICAL: Database Migration Instructions**

## **Issues Fixed:**

1. ✅ **"Failed to load posts" error** - Missing `get_social_feed` function
2. ✅ **"column reference 'user_id' is ambiguous"** - Fixed SQL function column aliases  
3. ✅ **Notifications foreign key errors** - Fixed foreign key constraints
4. ✅ **Missing RLS policies** - Added proper Row Level Security policies
5. ✅ **Activity feed errors** - Fixed ambiguous column references

## **🔧 Migration Files to Run (in order):**

### **1. Fix Social Feed Function**
```bash
# Run this migration first
supabase db push --file supabase/migrations/20250119_fix_social_feed_complete.sql
```

### **2. Fix Activity Feed Function**  
```bash
# Run this migration second
supabase db push --file supabase/migrations/20250119_fix_activity_feed_function.sql
```

### **3. Create Activity Function**
```bash
# Run this migration third
supabase db push --file supabase/migrations/20250119_create_activity_function.sql
```

## **🎯 What These Migrations Fix:**

### **Social Feed Issues:**
- ✅ Creates `get_social_feed` function with proper column aliases
- ✅ Fixes "column reference 'user_id' is ambiguous" errors
- ✅ Adds `p_connections_only` parameter support
- ✅ Creates helper functions for like/comment/repost counts
- ✅ Adds proper RLS policies for all social tables

### **Notifications Issues:**
- ✅ Fixes foreign key constraint errors
- ✅ Properly links `notifications.actor_id` to `auth.users.id`
- ✅ Adds RLS policies for notifications
- ✅ Handles missing relationships gracefully

### **Activity Feed Issues:**
- ✅ Creates `get_activity_feed` function
- ✅ Fixes ambiguous column references in activity queries
- ✅ Adds proper joins with user information
- ✅ Creates `create_activity` function for POST requests

## **🚀 After Running Migrations:**

### **Expected Results:**
1. **Social Feed** - Posts will load without "Failed to load posts" error
2. **Notifications** - Bell icon will work without foreign key errors  
3. **Activity Feed** - Activity feed will load without ambiguous column errors
4. **Post Creation** - Users can create posts and see them immediately
5. **Filtering** - "Connections Only" filter will work properly

### **Test the Fixes:**
1. **Go to `/network/feed`** - Should load posts without errors
2. **Click notification bell** - Should show notifications without errors
3. **Create a post** - Should appear in feed immediately
4. **Filter by "Connections Only"** - Should work properly
5. **Check activity feed** - Should load without ambiguous column errors

## **🔍 If Issues Persist:**

### **Check Migration Status:**
```bash
# Check if migrations ran successfully
supabase db diff
```

### **Verify Functions Exist:**
```sql
-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_social_feed', 'get_activity_feed', 'create_activity');
```

### **Check RLS Policies:**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('social_posts', 'notifications', 'activity_feed');
```

## **📱 UI Improvements Made:**

### **Post Creation Flow:**
- ✅ **Clear Post Type Selection** - "Post type:" label with Text/Image/Link buttons
- ✅ **Separate Media Upload** - "Upload Media" button for file attachments  
- ✅ **Emoji Picker** - "Emoji" button for adding emojis
- ✅ **Better Validation** - Post button disabled until content is added

### **Filter System:**
- ✅ **All Posts** - Shows all public posts + connections
- ✅ **Connections Only** - Shows only accepted connections + own posts
- ✅ **Content Types** - Filter by text, image, video, link, etc.
- ✅ **Smart Privacy** - Respects user privacy settings

### **Recent Activity Card:**
- ✅ **Profile Integration** - Added to user profile pages
- ✅ **Activity Types** - Shows posts, likes, comments, achievements
- ✅ **Timestamps** - Human-readable time formatting
- ✅ **Visual Icons** - Different icons for different activity types

## **🎉 Expected Outcome:**

After running these migrations, your social feed should work perfectly:

1. **No more "Failed to load posts" errors**
2. **No more foreign key constraint errors**  
3. **No more ambiguous column reference errors**
4. **Posts appear immediately after creation**
5. **Filtering works correctly**
6. **Notifications load without errors**
7. **Activity feed displays properly**

**The social networking system will be fully functional!** 🚀
