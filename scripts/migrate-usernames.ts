/**
 * Migration script to generate usernames for existing users
 * Run with: npx tsx scripts/migrate-usernames.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables (try both .env.local and .env)
const envLocalResult = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const envResult = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Loading environment variables...');
if (envLocalResult.parsed) {
  console.log('✓ Loaded .env.local');
} else if (envResult.parsed) {
  console.log('✓ Loaded .env');
} else {
  console.log('⚠ No .env file found, using environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n📝 Please ensure these are set in your .env or .env.local file\n');
  process.exit(1);
}

console.log('✓ Supabase URL found');
console.log('✓ Service role key found\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Sanitize username
 */
function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30)
    .replace(/^_+|_+$/g, '');
}

/**
 * Extract base username from email and metadata
 */
function extractBaseUsername(
  email: string,
  fullName?: string,
  provider?: string,
  userMetadata?: any
): string {
  // Priority 1: GitHub username
  if (provider === 'github' && userMetadata?.user_name) {
    return sanitizeUsername(userMetadata.user_name);
  }

  // Priority 2: Email username
  if (email) {
    const emailBase = email.split('@')[0];
    const cleanBase = emailBase.replace(/[._-]/g, '').replace(/\d+$/, '');

    if (cleanBase.length >= 3) {
      return sanitizeUsername(cleanBase);
    }

    return sanitizeUsername(emailBase);
  }

  // Priority 3: Full name
  if (fullName) {
    const nameBase = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameBase.length >= 3) {
      return nameBase;
    }
  }

  // Fallback
  return `user${Date.now().toString(36)}`;
}

/**
 * Check if username is available
 */
async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  return !data;
}

/**
 * Generate unique username
 */
async function generateUniqueUsername(
  email: string,
  fullName?: string,
  provider?: string,
  userMetadata?: any
): Promise<string> {
  const baseUsername = extractBaseUsername(email, fullName, provider, userMetadata);

  if (baseUsername.length < 3) {
    return generateUniqueUsername(`${baseUsername}${Date.now()}@temp.com`, fullName);
  }

  // Try base username
  if (await isUsernameAvailable(baseUsername)) {
    return baseUsername;
  }

  // Try with numbers
  for (let i = 1; i <= 99; i++) {
    const candidate = sanitizeUsername(`${baseUsername}${i}`);
    if (await isUsernameAvailable(candidate)) {
      return candidate;
    }
  }

  // Try with random suffix
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const randomUsername = sanitizeUsername(`${baseUsername}_${randomSuffix}`);

  if (await isUsernameAvailable(randomUsername)) {
    return randomUsername;
  }

  // Final fallback
  return sanitizeUsername(`user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
}

/**
 * Main migration function
 */
async function migrateUsernames() {
  console.log('🚀 Starting username migration...\n');

  // Get all users without usernames
  const { data: usersWithoutUsername, error: fetchError } = await supabase
    .from('users')
    .select('user_id, email, full_name')
    .is('username', null);

  if (fetchError) {
    console.error('❌ Failed to fetch users:', fetchError);
    process.exit(1);
  }

  if (!usersWithoutUsername || usersWithoutUsername.length === 0) {
    console.log('✅ No users without usernames found. Migration complete!');
    process.exit(0);
  }

  console.log(`📊 Found ${usersWithoutUsername.length} users without usernames\n`);

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const user of usersWithoutUsername) {
    try {
      // Get auth user data
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
        user.user_id
      );

      if (authError || !authData.user) {
        throw new Error('Auth user not found');
      }

      const authUser = authData.user;
      const provider = authUser.app_metadata?.provider || 'email';

      // Generate username
      const username = await generateUniqueUsername(
        authUser.email || '',
        user.full_name,
        provider,
        authUser.user_metadata
      );

      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({ username, updated_at: new Date().toISOString() })
        .eq('user_id', user.user_id);

      if (updateError) {
        throw updateError;
      }

      console.log(`✓ ${user.email || user.user_id} -> @${username}`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ ${user.email || user.user_id}: ${error.message}`);
      failedCount++;
      errors.push({ userId: user.user_id, error: error.message });
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failedCount}`);
  console.log(`  📊 Total: ${successCount + failedCount}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach((err) => {
      console.log(`  - User ${err.userId}: ${err.error}`);
    });
  }

  console.log('\n✨ Migration complete!');
}

// Run migration
migrateUsernames()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
