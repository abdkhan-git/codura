# Database Migration Instructions

## Required Migrations for Full Feature Set

To enable all features of the Codura platform, you need to run the following database migrations in order:

### 1. Activity Feed & Notifications
```bash
# Run this migration first
supabase db push
```

This will create the following tables:
- `user_activities` - Activity feed entries
- `activity_reactions` - Like/react to activities  
- `activity_comments` - Comments on activities
- `notifications` - User notifications
- `user_notification_preferences` - Notification settings

### 2. Social Feed System
```bash
# Run this migration second
supabase db push
```

This will create the following tables:
- `social_posts` - Social media posts
- `post_likes` - Post likes/reactions
- `post_comments` - Post comments with replies
- `post_reposts` - Post reposts/shares
- `post_views` - Post view analytics
- `comment_likes` - Comment likes

### 3. Enhanced User Search
```bash
# Run this migration third
supabase db push
```

This will create:
- Enhanced `search_users` function with fuzzy matching
- `count_users` function for accurate pagination
- Foreign key constraints for data integrity

## Verification

After running migrations, you can verify the setup by:

1. **Check Migration Status**: Visit `/api/health/migrations` to see which tables exist
2. **Test Notifications**: The notifications dropdown should work without errors
3. **Test Social Feed**: Create posts and interact with the social feed
4. **Test Search**: Use the discover page to search for users

## Troubleshooting

### "Failed to fetch notifications" Error
- This means the `notifications` table doesn't exist yet
- Run the activity feed migration first
- The system will show a helpful message in the notifications dropdown

### "No profiles shown" on Discover Page  
- This means the enhanced search functions aren't created yet
- Run the enhanced user search migration
- The search will fall back to basic functionality

### Foreign Key Errors
- These are usually resolved by running migrations in the correct order
- Make sure to run migrations sequentially as listed above

## Migration Files

The following migration files should be run in order:

1. `20250119_activity_feed_schema.sql` - Activity feed and notifications
2. `20250119_social_feed_schema.sql` - Social media features  
3. `20250119_fix_search_function.sql` - Enhanced user search
4. `20250119_add_count_function.sql` - Search pagination
5. `20250119_fix_user_stats_foreign_key.sql` - Data integrity

## Features Enabled After Migrations

✅ **Activity Feed** - Real-time activity updates  
✅ **Notifications** - Smart notification system  
✅ **Social Feed** - Posts, comments, likes, reposts  
✅ **Enhanced Search** - Fuzzy matching and filters  
✅ **User Connections** - Network management  
✅ **Suggestions** - AI-powered connection suggestions  

## Support

If you encounter issues:
1. Check the browser console for specific error messages
2. Verify all migration files are present in `supabase/migrations/`
3. Ensure migrations are run in the correct order
4. Check that all foreign key relationships are properly established
