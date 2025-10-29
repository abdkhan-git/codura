# Username Generation System

This document explains how the automatic username generation system works in Codura.

## Overview

The system automatically generates unique usernames for users when they sign up. It also provides tools to generate usernames for existing users who don't have one.

## Features

- **Smart Username Generation**: Intelligently generates usernames based on:
  - GitHub username (for GitHub OAuth users)
  - Email address (for email/Google OAuth users)
  - Full name (as fallback)
  - Random generation (last resort)

- **Collision Handling**: Automatically handles username collisions with multiple strategies:
  - Numeric suffixes (username1, username2, etc.)
  - Random short suffixes (username_a3f2)
  - Year suffixes (username2025)

- **Automatic Assignment**: New users automatically get usernames during signup

- **Migration Support**: Existing users without usernames can be migrated

## How It Works

### For New Users

When a user signs up (via email, Google, or GitHub), the system:

1. Extracts relevant information (email, name, GitHub username)
2. Generates a base username using priority order:
   - GitHub username (if GitHub OAuth)
   - Email username part (before @)
   - Full name (converted to username format)
3. Checks availability in database
4. If taken, tries variations with suffixes
5. Assigns the unique username to the user

### Username Generation Logic

**Example transformations:**

| Input | Type | Generated Username |
|-------|------|-------------------|
| `john.doe@gmail.com` | Email | `johndoe` |
| `test_user123@company.com` | Email | `testuser` (if available) or `testuser1` |
| GitHub user: `octocat` | GitHub OAuth | `octocat` |
| `Jane Smith` | Full Name | `janesmith` |

**Rules:**
- Only alphanumeric characters and underscores allowed
- 3-30 characters length
- All lowercase
- No leading/trailing underscores

## For Existing Users

### Option 1: Via API Endpoint (Recommended)

```bash
# Check how many users need usernames
curl -X GET http://localhost:3000/api/admin/generate-usernames

# Generate usernames for all users without one
curl -X POST http://localhost:3000/api/admin/generate-usernames
```

Response:
```json
{
  "success": true,
  "message": "Username generation complete",
  "stats": {
    "successful": 10,
    "failed": 0,
    "total": 10
  }
}
```

### Option 2: Via Migration Script

```bash
# Install tsx if not already installed
npm install -g tsx

# Run the migration script
npx tsx scripts/migrate-usernames.ts
```

Output example:
```
🚀 Starting username migration...

📊 Found 5 users without usernames

✓ test@example.com -> @testuser
✓ john.doe@gmail.com -> @johndoe
✓ user@company.com -> @user1
✓ jane.smith@example.com -> @janesmith
✓ github-user@test.com -> @octocat

📈 Migration Summary:
  ✅ Successful: 5
  ❌ Failed: 0
  📊 Total: 5

✨ Migration complete!
```

### Option 3: Automatic on Next Login

Users without usernames will automatically get one assigned the next time they log in, thanks to the auth callback handler.

## Files

### Core Logic
- `lib/username-generator.ts` - Main username generation logic

### API Endpoints
- `app/api/admin/generate-usernames/route.ts` - Admin endpoint for batch generation

### Auth Integration
- `app/auth/callback/route.ts` - Auto-generates usernames during signup/login

### Migration Scripts
- `scripts/migrate-usernames.ts` - Standalone script for migrating existing users

## Security Considerations

- ✅ Usernames are sanitized to prevent injection attacks
- ✅ Uniqueness is guaranteed by database checks
- ✅ No sensitive information is exposed in usernames
- ✅ Random suffixes prevent username enumeration

## Troubleshooting

### "Failed to update database"
- Check Supabase connection
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`

### "No users without usernames found"
All users already have usernames! ✨

### "Auth user not found"
Some user accounts may have been deleted from auth but not from the users table. These will be skipped.

## Testing

To test the username generation:

```typescript
import { generateUniqueUsername } from '@/lib/username-generator';

// Test email-based username
const username1 = await generateUniqueUsername('john.doe@example.com', 'John Doe');
console.log(username1); // "johndoe" or "johndoe1" if taken

// Test GitHub username
const username2 = await generateUniqueUsername(
  'user@github.com',
  'GitHub User',
  'github',
  { user_name: 'octocat' }
);
console.log(username2); // "octocat" or "octocat1" if taken
```

## Future Enhancements

- [ ] Allow users to customize their username after generation
- [ ] Reserve special/restricted usernames (admin, support, etc.)
- [ ] Add username history tracking
- [ ] Implement username change requests with cooldown period
