/**
 * Export study plan problem slugs to JSON
 *
 * This script exports problem slugs for popular study plans in a clean JSON format
 * that can be easily consumed by other tools or scripts.
 *
 * Usage: npx tsx scripts/export-study-plan-slugs.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface StudyPlanExport {
  name: string;
  display_name: string;
  description: string;
  source_url?: string;
  total_problems: number;
  categories: {
    category: string;
    order: number;
    problems: string[];
  }[];
  all_problems: string[]; // Unique list of all problem slugs
}

async function exportStudyPlan(displayName: string, sourceUrl?: string): Promise<StudyPlanExport | null> {
  // Get template
  const { data: template } = await supabase
    .from('study_plan_templates')
    .select('*')
    .eq('display_name', displayName)
    .single();

  if (!template) {
    console.error(`Template not found: ${displayName}`);
    return null;
  }

  // Get milestones
  const { data: milestones } = await supabase
    .from('study_plan_template_milestones')
    .select('*')
    .eq('template_id', template.id)
    .order('milestone_order');

  if (!milestones || milestones.length === 0) {
    console.error(`No milestones found for: ${displayName}`);
    return null;
  }

  const categories: StudyPlanExport['categories'] = [];
  const allProblemsSet = new Set<string>();

  // Fetch problems for each milestone
  for (const milestone of milestones) {
    if (!milestone.problem_ids || milestone.problem_ids.length === 0) {
      categories.push({
        category: milestone.title,
        order: milestone.milestone_order,
        problems: [],
      });
      continue;
    }

    const { data: problems } = await supabase
      .from('problems')
      .select('title_slug')
      .in('id', milestone.problem_ids);

    const slugs = (problems || []).map(p => p.title_slug);
    slugs.forEach(slug => allProblemsSet.add(slug));

    categories.push({
      category: milestone.title,
      order: milestone.milestone_order,
      problems: slugs,
    });
  }

  return {
    name: template.name,
    display_name: template.display_name,
    description: template.description,
    source_url: sourceUrl,
    total_problems: allProblemsSet.size,
    categories,
    all_problems: Array.from(allProblemsSet).sort(),
  };
}

async function main() {
  console.log('📤 Exporting study plan problem slugs...\n');

  const exports: Record<string, StudyPlanExport> = {};

  // Define study plans to export with their source URLs
  const plansToExport = [
    {
      displayName: 'Blind 75 Essentials',
      sourceUrl: 'https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU',
    },
    {
      displayName: 'NeetCode 150',
      sourceUrl: 'https://neetcode.io/practice',
    },
    {
      displayName: 'Grind 75',
      sourceUrl: 'https://www.techinterviewhandbook.org/grind75/',
    },
    {
      displayName: 'Grind 169',
      sourceUrl: 'https://www.techinterviewhandbook.org/grind75/',
    },
    {
      displayName: 'NeetCode 250 Complete',
      sourceUrl: 'https://neetcode.io/practice',
    },
  ];

  for (const plan of plansToExport) {
    console.log(`📋 Exporting: ${plan.displayName}...`);
    const exported = await exportStudyPlan(plan.displayName, plan.sourceUrl);

    if (exported) {
      exports[plan.displayName] = exported;
      console.log(`   ✅ ${exported.total_problems} unique problems across ${exported.categories.length} categories`);
    } else {
      console.log(`   ⚠️  Could not export ${plan.displayName}`);
    }
  }

  // Save to file
  const outputDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'study-plan-problems.json');
  fs.writeFileSync(outputPath, JSON.stringify(exports, null, 2));
  console.log(`\n✅ Exported to: ${outputPath}`);

  // Also create individual files for each plan
  for (const [name, data] of Object.entries(exports)) {
    const filename = `${data.name}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  console.log(`✅ Individual plan files saved to: ${outputDir}`);

  // Create a simple slug-only version for easy reference
  const slugsOnly: Record<string, string[]> = {};
  for (const [name, data] of Object.entries(exports)) {
    slugsOnly[name] = data.all_problems;
  }

  const slugsOnlyPath = path.join(outputDir, 'study-plan-slugs-only.json');
  fs.writeFileSync(slugsOnlyPath, JSON.stringify(slugsOnly, null, 2));
  console.log(`✅ Slug-only version saved to: ${slugsOnlyPath}`);

  console.log('\n✨ Export complete!\n');
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
