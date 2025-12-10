/**
 * Script to populate Supabase database with LeetCode problems
 * Run this script to fetch problems from LeetCode and store them in your database
 *
 * Usage: npx tsx scripts/populate-problems.ts
 */

// Load environment variables from .env file
import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
import {
  fetchProblemsInBatches,
  transformProblemForDB,
} from '../lib/leetcode-fetcher';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Starting LeetCode problems import...\n');

  try {
    // Step 1: Fetch all problems from LeetCode
    console.log('📥 Fetching problems from LeetCode GraphQL API...');
    const problems = await fetchProblemsInBatches(100);
    console.log(`✅ Fetched ${problems.length} problems\n`);

    // Step 2: Transform problems to database format
    console.log('🔄 Transforming problems for database...');
    const transformedProblems = problems.map(transformProblemForDB);
    console.log(`✅ Transformed ${transformedProblems.length} problems\n`);

    // Step 3: Insert problems in batches (Supabase has a limit)
    console.log('💾 Inserting problems into database...');
    const batchSize = 100;
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < transformedProblems.length; i += batchSize) {
      const batch = transformedProblems.slice(i, i + batchSize);

      console.log(
        `   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedProblems.length / batchSize)}...`
      );

      const { data, error } = await supabase
        .from('problems')
        .upsert(batch, {
          onConflict: 'leetcode_id',
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error(`   ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        const count = data?.length || 0;
        inserted += count;
        console.log(`   ✅ Processed ${count} problems`);
      }

      // Small delay to avoid overwhelming Supabase
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n📊 Import Summary:');
    console.log(`   Total problems fetched: ${problems.length}`);
    console.log(`   Successfully inserted/updated: ${inserted}`);
    console.log(`   Errors: ${errors}`);

    // Step 4: Verify the data
    console.log('\n🔍 Verifying database...');
    const { count, error: countError } = await supabase
      .from('problems')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('   ❌ Error counting problems:', countError);
    } else {
      console.log(`   ✅ Database now contains ${count} problems`);
    }

    // Step 5: Show breakdown by difficulty
    const { data: easyCount } = await supabase
      .from('problems')
      .select('id', { count: 'exact', head: true })
      .eq('difficulty', 'Easy');

    const { data: mediumCount } = await supabase
      .from('problems')
      .select('id', { count: 'exact', head: true })
      .eq('difficulty', 'Medium');

    const { data: hardCount } = await supabase
      .from('problems')
      .select('id', { count: 'exact', head: true })
      .eq('difficulty', 'Hard');

    console.log('\n📈 Breakdown by difficulty:');
    console.log(`   🟢 Easy: ${easyCount?.length || 0}`);
    console.log(`   🟡 Medium: ${mediumCount?.length || 0}`);
    console.log(`   🔴 Hard: ${hardCount?.length || 0}`);

    console.log('\n✨ Import completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('👋 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
