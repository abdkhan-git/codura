# Username Migration Instructions

## Quick Start - Migrate Existing Users

Since you have existing users without usernames (like Mag who uses GitHub auth), follow these steps to generate usernames for them:

### Option 1: Automatic on Next Login (Easiest)

**No action needed!** The next time a user logs in, the system will automatically generate a username for them if they don't have one.

- This happens in `app/auth/callback/route.ts` (already updated)
- Works for all authentication methods (email, Google, GitHub)

### Option 2: Run Migration Script (Immediate)

To generate usernames for ALL existing users right now:

```bash
# 1. Install tsx if you don't have it
npm install --save-dev tsx

# 2. Run the migration script
npx tsx scripts/migrate-usernames.ts
```

The script will:
- Find all users without usernames
- Generate intelligent usernames based on their email/GitHub/name
- Update the database
- Show you progress and results

### Option 3: Via API (For Production)

If you want to trigger this from a web interface:

1. **Create an admin page** (e.g., `/admin/tools`)

2. **Add a button that calls the API:**

```typescript
const handleGenerateUsernames = async () => {
  const response = await fetch('/api/admin/generate-usernames', {
    method: 'POST',
  });

  const result = await response.json();
  console.log(result);
  // Shows: { success: true, stats: { successful: 10, failed: 0, total: 10 } }
};
```

3. **Protect this page** with admin-only access

## What Happens to Existing Users?

### Mag (GitHub user with no username)

**Current state:**
- user_id: `[their-uuid]`
- username: `null`
- Clicking their profile → `/profile/null` → Error ❌

**After migration:**
- username: `magperez` (or similar, based on their GitHub username)
- Clicking their profile → `/profile/magperez` → Works ✅

### Email users without username

**Before:**
- email: `test@example.com`
- username: `null`

**After:**
- email: `test@example.com`
- username: `test` (or `test1` if taken, etc.)

## Verification

After running the migration, verify it worked:

```bash
# Check if any users still lack usernames
# Should return 0 if migration succeeded
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).is('username', null);
console.log('Users without usernames:', count);
"
```

## Rollback (if needed)

If something goes wrong, usernames can be reset:

```sql
-- Reset all usernames (run in Supabase SQL Editor)
UPDATE users SET username = NULL WHERE username IS NOT NULL;
```

Then re-run the migration with adjusted logic.

## Next Steps

Once all users have usernames:

1. ✅ Profile links will work (no more `/profile/null` errors)
2. ✅ User cards will be consistent
3. ✅ New users will automatically get usernames on signup
4. ✅ Users can optionally be allowed to change their username in settings (future feature)

## Monitoring

To see recently generated usernames:

```sql
-- View recent username assignments
SELECT
  username,
  full_name,
  email,
  updated_at
FROM users
WHERE username IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
```
