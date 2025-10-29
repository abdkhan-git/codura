/**
 * Smart username generation utility
 * Generates unique usernames based on various sources like email, GitHub, Google, etc.
 */

import { createClient } from '@/utils/supabase/server';

/**
 * Extract base username from various sources
 */
function extractBaseUsername(email: string, fullName?: string, provider?: string, providerUsername?: string): string {
  // Priority 1: Use provider username if available (GitHub, LinkedIn)
  if (providerUsername) {
    return sanitizeUsername(providerUsername);
  }

  // Priority 2: Extract from email
  if (email) {
    // Get the part before @
    const emailBase = email.split('@')[0];

    // Common patterns to handle
    // Remove common separators and numbers at the end for cleaner base
    const cleanBase = emailBase
      .replace(/[._-]/g, '') // Remove separators
      .replace(/\d+$/, ''); // Remove trailing numbers

    if (cleanBase.length >= 3) {
      return sanitizeUsername(cleanBase);
    }

    // Fallback to original email base if cleaned version is too short
    return sanitizeUsername(emailBase);
  }

  // Priority 3: Use full name
  if (fullName) {
    // Convert "John Doe" -> "johndoe"
    const nameBase = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (nameBase.length >= 3) {
      return nameBase;
    }
  }

  // Fallback: Generate random username
  return `user${Date.now().toString(36)}`;
}

/**
 * Sanitize username to meet requirements
 * - Only alphanumeric and underscores
 * - 3-30 characters
 * - Lowercase
 */
function sanitizeUsername(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '') // Remove invalid characters
    .slice(0, 30) // Max 30 chars
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Check if username exists in database
 */
async function isUsernameAvailable(username: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  return !data && !error;
}

/**
 * Generate a unique username with collision handling
 */
export async function generateUniqueUsername(
  email: string,
  fullName?: string,
  provider?: string,
  providerMetadata?: any
): Promise<string> {
  // Extract provider-specific username if available
  let providerUsername: string | undefined;

  if (provider === 'github' && providerMetadata?.user_name) {
    providerUsername = providerMetadata.user_name;
  } else if (provider === 'google' && providerMetadata?.email) {
    // Google doesn't provide username, will use email
    providerUsername = undefined;
  }

  // Get base username
  const baseUsername = extractBaseUsername(email, fullName, provider, providerUsername);

  // Ensure base username meets minimum length
  if (baseUsername.length < 3) {
    return generateUniqueUsername(`${baseUsername}${Date.now()}@temp.com`, fullName);
  }

  // Try base username first
  if (await isUsernameAvailable(baseUsername)) {
    return baseUsername;
  }

  // If taken, try with smart suffixes
  const strategies = [
    // Strategy 1: Add numbers (1-99)
    ...Array.from({ length: 99 }, (_, i) => `${baseUsername}${i + 1}`),

    // Strategy 2: Add random short suffix
    `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`,

    // Strategy 3: Add year
    `${baseUsername}${new Date().getFullYear()}`,

    // Strategy 4: Add random 3-digit number
    `${baseUsername}${Math.floor(Math.random() * 900) + 100}`,

    // Strategy 5: Truncate and add longer random suffix
    `${baseUsername.slice(0, 20)}_${Math.random().toString(36).slice(2, 8)}`,
  ];

  // Try each strategy
  for (const candidate of strategies) {
    const sanitized = sanitizeUsername(candidate);
    if (sanitized.length >= 3 && await isUsernameAvailable(sanitized)) {
      return sanitized;
    }
  }

  // Fallback: Generate completely random username (should rarely happen)
  const randomUsername = `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return sanitizeUsername(randomUsername);
}

/**
 * Generate username from user data (for existing users)
 */
export async function generateUsernameFromUserData(user: {
  id: string;
  email?: string;
  full_name?: string;
  app_metadata?: any;
  user_metadata?: any;
}): Promise<string> {
  const provider = user.app_metadata?.provider || 'email';
  const providerMetadata = user.user_metadata || {};
  const email = user.email || '';
  const fullName = user.full_name || providerMetadata.full_name || providerMetadata.name || '';

  return generateUniqueUsername(email, fullName, provider, providerMetadata);
}

/**
 * Update user with generated username
 */
export async function assignUsernameToUser(userId: string, username: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update({ username, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error(`Failed to assign username to user ${userId}:`, error);
    return false;
  }

  console.log(`Assigned username "${username}" to user ${userId}`);
  return true;
}

/**
 * Batch process: Generate usernames for all users without one
 */
export async function generateUsernamesForExistingUsers(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}> {
  const supabase = await createClient();

  // Get all users without usernames
  const { data: usersWithoutUsername, error: fetchError } = await supabase
    .from('users')
    .select('user_id, email, full_name')
    .is('username', null);

  if (fetchError) {
    console.error('Failed to fetch users without usernames:', fetchError);
    return { success: 0, failed: 0, errors: [{ userId: 'N/A', error: fetchError.message }] };
  }

  if (!usersWithoutUsername || usersWithoutUsername.length === 0) {
    console.log('No users without usernames found.');
    return { success: 0, failed: 0, errors: [] };
  }

  console.log(`Found ${usersWithoutUsername.length} users without usernames. Generating...`);

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  // Process each user
  for (const user of usersWithoutUsername) {
    try {
      // Get full auth user data for provider info
      const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);

      if (!authUser.user) {
        throw new Error('Auth user not found');
      }

      // Generate username
      const username = await generateUsernameFromUserData({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: user.full_name,
        app_metadata: authUser.user.app_metadata,
        user_metadata: authUser.user.user_metadata,
      });

      // Assign username
      const success = await assignUsernameToUser(user.user_id, username);

      if (success) {
        successCount++;
      } else {
        failedCount++;
        errors.push({ userId: user.user_id, error: 'Failed to update database' });
      }
    } catch (error: any) {
      console.error(`Error processing user ${user.user_id}:`, error);
      failedCount++;
      errors.push({ userId: user.user_id, error: error.message || 'Unknown error' });
    }
  }

  console.log(`Username generation complete: ${successCount} success, ${failedCount} failed`);

  return { success: successCount, failed: failedCount, errors };
}
