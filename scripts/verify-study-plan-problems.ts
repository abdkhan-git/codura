/**
 * Script to verify and analyze study plan problems in the database
 *
 * This script:
 * 1. Fetches all study plan templates and their milestones
 * 2. Verifies that all problem slugs exist in the database
 * 3. Generates a comprehensive report of each study plan
 * 4. Identifies missing problems and duplicates
 *
 * Usage: npx tsx scripts/verify-study-plan-problems.ts
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
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Problem {
  id: number;
  title: string;
  title_slug: string;
  difficulty: string;
  leetcode_id: number;
  category: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  milestone_order: number;
  problem_ids: number[];
  total_problems: number;
  required_problems: number;
  estimated_hours: number;
}

interface StudyPlanTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  difficulty_level: string;
  estimated_weeks: number;
  total_problems: number;
  is_published: boolean;
  is_featured: boolean;
}

async function getAllStudyPlanTemplates(): Promise<StudyPlanTemplate[]> {
  const { data, error } = await supabase
    .from('study_plan_templates')
    .select('*')
    .eq('is_published', true)
    .order('display_name');

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return data || [];
}

async function getMilestonesForTemplate(templateId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('study_plan_template_milestones')
    .select('*')
    .eq('template_id', templateId)
    .order('milestone_order');

  if (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }

  return data || [];
}

async function getProblemsById(problemIds: number[]): Promise<Problem[]> {
  if (!problemIds || problemIds.length === 0) return [];

  const { data, error } = await supabase
    .from('problems')
    .select('id, title, title_slug, difficulty, leetcode_id, category')
    .in('id', problemIds);

  if (error) {
    console.error('Error fetching problems:', error);
    return [];
  }

  return data || [];
}

async function getAllProblems(): Promise<Problem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('id, title, title_slug, difficulty, leetcode_id, category');

  if (error) {
    console.error('Error fetching all problems:', error);
    return [];
  }

  return data || [];
}

function formatProblemList(problems: Problem[]): string {
  return problems
    .map((p, idx) => `${idx + 1}. [${p.title}](https://leetcode.com/problems/${p.title_slug}/) - ${p.difficulty}`)
    .join('\n');
}

function generateMarkdownReport(
  template: StudyPlanTemplate,
  milestones: Milestone[],
  problemsByMilestone: Map<string, Problem[]>
): string {
  let markdown = `# ${template.display_name}\n\n`;
  markdown += `**Category:** ${template.category}\n`;
  markdown += `**Difficulty:** ${template.difficulty_level}\n`;
  markdown += `**Estimated Duration:** ${template.estimated_weeks} weeks\n`;
  markdown += `**Total Problems:** ${template.total_problems}\n`;
  markdown += `**Featured:** ${template.is_featured ? 'Yes' : 'No'}\n\n`;
  markdown += `## Description\n\n${template.description}\n\n`;
  markdown += `---\n\n`;

  let totalProblems = 0;
  const allSlugs = new Set<string>();
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };

  for (const milestone of milestones) {
    const problems = problemsByMilestone.get(milestone.id) || [];
    totalProblems += problems.length;

    markdown += `## ${milestone.milestone_order}. ${milestone.title}\n\n`;
    markdown += `**Problems:** ${problems.length}`;
    if (milestone.required_problems) {
      markdown += ` (${milestone.required_problems} required)`;
    }
    markdown += `\n`;
    markdown += `**Estimated Hours:** ${milestone.estimated_hours || 'N/A'}\n\n`;

    if (milestone.description) {
      markdown += `${milestone.description}\n\n`;
    }

    if (problems.length > 0) {
      markdown += `### Problems\n\n`;
      markdown += formatProblemList(problems);
      markdown += `\n\n`;

      // Count difficulties and track unique slugs
      problems.forEach(p => {
        allSlugs.add(p.title_slug);
        if (p.difficulty === 'Easy') difficultyCount.Easy++;
        else if (p.difficulty === 'Medium') difficultyCount.Medium++;
        else if (p.difficulty === 'Hard') difficultyCount.Hard++;
      });
    } else {
      markdown += `*No problems linked yet*\n\n`;
    }

    markdown += `---\n\n`;
  }

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Milestones:** ${milestones.length}\n`;
  markdown += `- **Total Problems (with duplicates):** ${totalProblems}\n`;
  markdown += `- **Unique Problems:** ${allSlugs.size}\n`;
  markdown += `- **Difficulty Breakdown:**\n`;
  markdown += `  - Easy: ${difficultyCount.Easy}\n`;
  markdown += `  - Medium: ${difficultyCount.Medium}\n`;
  markdown += `  - Hard: ${difficultyCount.Hard}\n`;

  return markdown;
}

async function main() {
  console.log('🔍 Verifying Study Plan Problems...\n');

  // Fetch all templates
  console.log('📚 Fetching study plan templates...');
  const templates = await getAllStudyPlanTemplates();
  console.log(`✅ Found ${templates.length} published templates\n`);

  // Fetch all problems for lookup
  console.log('🎯 Fetching all problems...');
  const allProblems = await getAllProblems();
  console.log(`✅ Found ${allProblems.length} problems in database\n`);

  const problemLookup = new Map(allProblems.map(p => [p.id, p]));

  // Create reports directory
  const reportsDir = path.join(process.cwd(), 'reports', 'study-plans');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Process each template
  const featuredTemplates = ['Blind 75 Essentials', 'NeetCode 150', 'Grind 75', 'Grind 169', 'NeetCode 250 Complete'];

  for (const template of templates) {
    if (!featuredTemplates.includes(template.display_name)) {
      continue; // Skip non-featured templates for now
    }

    console.log(`\n📋 Processing: ${template.display_name}`);

    // Fetch milestones
    const milestones = await getMilestonesForTemplate(template.id);
    console.log(`   Found ${milestones.length} milestones`);

    // Fetch problems for each milestone
    const problemsByMilestone = new Map<string, Problem[]>();
    let totalProblems = 0;
    const uniqueSlugs = new Set<string>();

    for (const milestone of milestones) {
      const problems = await getProblemsById(milestone.problem_ids || []);
      problemsByMilestone.set(milestone.id, problems);
      totalProblems += problems.length;
      problems.forEach(p => uniqueSlugs.add(p.title_slug));
    }

    console.log(`   Total problems: ${totalProblems} (${uniqueSlugs.size} unique)`);

    // Generate markdown report
    const markdown = generateMarkdownReport(template, milestones, problemsByMilestone);
    const filename = `${template.name}.md`;
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, markdown);
    console.log(`   ✅ Report saved to: ${filepath}`);
  }

  // Generate summary JSON
  console.log('\n📊 Generating summary JSON...');
  const summary = {
    generated_at: new Date().toISOString(),
    total_templates: templates.length,
    total_problems: allProblems.length,
    templates: await Promise.all(
      templates
        .filter(t => featuredTemplates.includes(t.display_name))
        .map(async (template) => {
          const milestones = await getMilestonesForTemplate(template.id);
          const allProblemIds = milestones.flatMap(m => m.problem_ids || []);
          const uniqueProblems = new Set(allProblemIds);

          return {
            name: template.display_name,
            slug: template.name,
            category: template.category,
            difficulty: template.difficulty_level,
            estimated_weeks: template.estimated_weeks,
            total_milestones: milestones.length,
            total_problems: allProblemIds.length,
            unique_problems: uniqueProblems.size,
            is_featured: template.is_featured,
          };
        })
    ),
  };

  const summaryPath = path.join(reportsDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved to: ${summaryPath}`);

  console.log('\n✨ Verification complete!\n');
  console.log('📁 Reports saved to:', reportsDir);
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
