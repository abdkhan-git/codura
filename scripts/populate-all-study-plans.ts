/**
 * Script to populate all study plan templates with problems
 * Run this with: npx tsx scripts/populate-all-study-plans.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Known problem lists
const PROBLEM_LISTS: Record<string, string[]> = {
  blind_75_essentials: [
    "two-sum", "contains-duplicate", "valid-anagram", "group-anagrams", "top-k-frequent-elements",
    "product-of-array-except-self", "longest-consecutive-sequence", "valid-palindrome", "3sum",
    "container-with-most-water", "best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters",
    "longest-repeating-character-replacement", "minimum-window-substring", "binary-search",
    "search-in-rotated-sorted-array", "find-minimum-in-rotated-sorted-array", "reverse-linked-list",
    "merge-two-sorted-lists", "linked-list-cycle", "reorder-list", "remove-nth-node-from-end-of-list",
    "merge-k-sorted-lists", "invert-binary-tree", "maximum-depth-of-binary-tree", "same-tree",
    "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal",
    "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal",
    "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree", "find-median-from-data-stream",
    "climbing-stairs", "house-robber", "house-robber-ii", "longest-palindromic-substring", "palindromic-substrings",
    "decode-ways", "coin-change", "maximum-product-subarray", "word-break", "longest-increasing-subsequence",
    "unique-paths", "jump-game", "number-of-islands", "clone-graph", "pacific-atlantic-water-flow",
    "course-schedule", "course-schedule-ii", "combination-sum", "word-search", "number-of-1-bits",
    "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers",
  ],
  neetcode_150: [
    "two-sum", "contains-duplicate", "valid-anagram", "group-anagrams", "top-k-frequent-elements",
    "product-of-array-except-self", "longest-consecutive-sequence", "valid-palindrome", "3sum",
    "container-with-most-water", "valid-parentheses", "binary-search", "search-in-rotated-sorted-array",
    "find-minimum-in-rotated-sorted-array", "best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters",
    "longest-repeating-character-replacement", "minimum-window-substring", "reverse-linked-list",
    "merge-two-sorted-lists", "linked-list-cycle", "reorder-list", "remove-nth-node-from-end-of-list",
    "merge-k-sorted-lists", "invert-binary-tree", "maximum-depth-of-binary-tree", "same-tree",
    "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal",
    "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal",
    "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree", "implement-trie-prefix-tree",
    "design-add-and-search-words-data-structure", "word-search-ii", "find-median-from-data-stream",
    "combination-sum", "word-search", "number-of-islands", "clone-graph", "pacific-atlantic-water-flow",
    "course-schedule", "course-schedule-ii", "climbing-stairs", "house-robber", "house-robber-ii",
    "palindromic-substrings", "decode-ways", "coin-change", "maximum-product-subarray", "word-break",
    "longest-increasing-subsequence", "longest-palindromic-substring", "unique-paths", "maximum-subarray",
    "jump-game", "insert-interval", "merge-intervals", "non-overlapping-intervals", "number-of-1-bits",
    "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers",
  ],
  grind_75: [
    "two-sum", "valid-parentheses", "merge-two-sorted-lists", "best-time-to-buy-and-sell-stock",
    "valid-palindrome", "invert-binary-tree", "valid-anagram", "binary-search", "linked-list-cycle",
    "lowest-common-ancestor-of-a-binary-search-tree", "maximum-depth-of-binary-tree", "reverse-linked-list",
    "contains-duplicate", "maximum-subarray", "climbing-stairs", "binary-tree-level-order-traversal",
    "validate-binary-search-tree", "number-of-islands", "clone-graph", "house-robber", "coin-change",
    "word-break", "longest-increasing-subsequence", "merge-k-sorted-lists", "find-median-from-data-stream",
    "word-search-ii", "serialize-and-deserialize-binary-tree",
  ],
};

// Milestone configurations
const MILESTONE_CONFIGS: Record<string, Array<{ title: string; description: string; slugs: string[]; learning_objectives: string[]; estimated_hours: number }>> = {
  blind_75_essentials: [
    {
      title: "Arrays & Hashing",
      description: "Master fundamental array operations and hash table techniques.",
      slugs: ["two-sum", "contains-duplicate", "valid-anagram", "group-anagrams", "top-k-frequent-elements", "product-of-array-except-self", "longest-consecutive-sequence"],
      learning_objectives: ["Understand hash table time complexity", "Master two-sum pattern", "Learn frequency counting"],
      estimated_hours: 12,
    },
    {
      title: "Two Pointers",
      description: "Master the two-pointer technique for efficient array and string manipulation.",
      slugs: ["valid-palindrome", "3sum", "container-with-most-water"],
      learning_objectives: ["Master two-pointer technique", "Understand when to use two pointers", "Solve palindrome problems"],
      estimated_hours: 8,
    },
    {
      title: "Sliding Window",
      description: "Learn sliding window patterns for substring and subarray problems.",
      slugs: ["best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters", "longest-repeating-character-replacement", "minimum-window-substring"],
      learning_objectives: ["Master sliding window technique", "Understand window expansion/contraction", "Solve substring problems"],
      estimated_hours: 10,
    },
    {
      title: "Binary Search",
      description: "Master binary search and its variations.",
      slugs: ["binary-search", "search-in-rotated-sorted-array", "find-minimum-in-rotated-sorted-array"],
      learning_objectives: ["Master binary search algorithm", "Handle rotated arrays", "Find minimum in rotated arrays"],
      estimated_hours: 8,
    },
    {
      title: "Linked Lists",
      description: "Master linked list operations and common patterns.",
      slugs: ["reverse-linked-list", "merge-two-sorted-lists", "linked-list-cycle", "reorder-list", "remove-nth-node-from-end-of-list", "merge-k-sorted-lists"],
      learning_objectives: ["Master linked list manipulation", "Understand cycle detection", "Merge sorted lists"],
      estimated_hours: 12,
    },
    {
      title: "Trees",
      description: "Master binary tree traversal and common tree problems.",
      slugs: ["invert-binary-tree", "maximum-depth-of-binary-tree", "same-tree", "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree", "binary-tree-level-order-traversal", "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal", "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree"],
      learning_objectives: ["Master tree traversal (DFS/BFS)", "Understand BST properties", "Solve tree construction problems"],
      estimated_hours: 20,
    },
    {
      title: "Heaps & Priority Queue",
      description: "Learn heap data structure and priority queue patterns.",
      slugs: ["merge-k-sorted-lists", "top-k-frequent-elements", "find-median-from-data-stream"],
      learning_objectives: ["Understand heap operations", "Solve top-k problems", "Implement median finder"],
      estimated_hours: 8,
    },
    {
      title: "Dynamic Programming",
      description: "Master DP fundamentals including memoization, tabulation, and common patterns.",
      slugs: ["climbing-stairs", "house-robber", "house-robber-ii", "longest-palindromic-substring", "palindromic-substrings", "decode-ways", "coin-change", "maximum-product-subarray", "word-break", "longest-increasing-subsequence", "unique-paths", "jump-game"],
      learning_objectives: ["Understand DP patterns", "Master memoization", "Solve classic DP problems"],
      estimated_hours: 20,
    },
    {
      title: "Graphs",
      description: "Master graph traversal (BFS/DFS), topological sort, and union-find.",
      slugs: ["number-of-islands", "clone-graph", "pacific-atlantic-water-flow", "course-schedule", "course-schedule-ii"],
      learning_objectives: ["Master BFS/DFS", "Understand topological sort", "Solve graph problems"],
      estimated_hours: 14,
    },
    {
      title: "Backtracking & Combinations",
      description: "Learn backtracking patterns for combination and permutation problems.",
      slugs: ["combination-sum", "word-search"],
      learning_objectives: ["Master backtracking", "Solve combination problems", "Handle constraints"],
      estimated_hours: 8,
    },
    {
      title: "Bit Manipulation",
      description: "Master bitwise operations and common bit manipulation tricks.",
      slugs: ["number-of-1-bits", "counting-bits", "reverse-bits", "missing-number", "sum-of-two-integers"],
      learning_objectives: ["Understand bitwise operations", "Solve bit manipulation problems", "Optimize with bits"],
      estimated_hours: 8,
    },
  ],
};

async function populateTemplate(templateName: string) {
  console.log(`\n📚 Populating ${templateName}...`);

  // Get template
  const { data: template, error: templateError } = await supabase
    .from("study_plan_templates")
    .select("*")
    .eq("name", templateName)
    .single();

  if (templateError || !template) {
    console.error(`❌ Template ${templateName} not found`);
    return;
  }

  // Get problem slugs
  const problemSlugs = PROBLEM_LISTS[templateName];
  if (!problemSlugs || problemSlugs.length === 0) {
    console.log(`⚠️  No problem list defined for ${templateName}`);
    return;
  }

  // Fetch problem IDs
  const { data: problems, error: problemsError } = await supabase
    .from("problems")
    .select("id, title_slug, difficulty")
    .in("title_slug", problemSlugs);

  if (problemsError) {
    console.error(`❌ Error fetching problems:`, problemsError);
    return;
  }

  const foundCount = problems?.length || 0;
  const missingCount = problemSlugs.length - foundCount;
  
  if (missingCount > 0) {
    console.log(`⚠️  Found ${foundCount}/${problemSlugs.length} problems (${missingCount} missing)`);
  }

  // Create slug to ID map
  const slugToId = new Map<string, number>();
  problems?.forEach((p) => {
    slugToId.set(p.title_slug, p.id);
  });

  // Get milestone config
  const milestoneConfig = MILESTONE_CONFIGS[templateName] || [];

  // Delete existing milestones
  await supabase
    .from("study_plan_template_milestones")
    .delete()
    .eq("template_id", template.id);

  // Create milestones
  const milestonesData = milestoneConfig.map((config, index) => {
    const problemIds = config.slugs
      .map((slug) => slugToId.get(slug))
      .filter((id): id is number => id !== undefined);

    return {
      template_id: template.id,
      title: config.title,
      description: config.description,
      learning_objectives: config.learning_objectives,
      milestone_order: index + 1,
      problem_ids: problemIds,
      required_problems: Math.ceil(problemIds.length * 0.7),
      total_problems: problemIds.length,
      estimated_hours: config.estimated_hours,
    };
  });

  // Insert milestones
  const { error: milestonesError } = await supabase
    .from("study_plan_template_milestones")
    .insert(milestonesData);

  if (milestonesError) {
    console.error(`❌ Error creating milestones:`, milestonesError);
    return;
  }

  // Calculate totals
  const totalProblems = milestonesData.reduce((sum, m) => sum + m.total_problems, 0);
  const easyCount = problems?.filter((p) => p.difficulty === "Easy").length || 0;
  const mediumCount = problems?.filter((p) => p.difficulty === "Medium").length || 0;
  const hardCount = problems?.filter((p) => p.difficulty === "Hard").length || 0;

  // Update template
  await supabase
    .from("study_plan_templates")
    .update({
      total_problems: totalProblems,
      total_milestones: milestonesData.length,
      easy_problems: easyCount,
      medium_problems: mediumCount,
      hard_problems: hardCount,
    })
    .eq("id", template.id);

  console.log(`✅ Created ${milestonesData.length} milestones with ${totalProblems} problems`);
}

async function main() {
  console.log("🚀 Starting study plan population...\n");

  const templatesToPopulate = [
    "blind_75_essentials",
    "neetcode_150",
    "grind_75",
  ];

  for (const templateName of templatesToPopulate) {
    await populateTemplate(templateName);
  }

  console.log("\n✨ Done! All templates populated.");
}

main().catch(console.error);

