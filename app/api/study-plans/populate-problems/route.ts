import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Known problem lists mapped to their title slugs
const PROBLEM_LISTS: Record<string, string[]> = {
  blind_75_essentials: [
    "two-sum",
    "contains-duplicate",
    "valid-anagram",
    "group-anagrams",
    "top-k-frequent-elements",
    "product-of-array-except-self",
    "longest-consecutive-sequence",
    "valid-palindrome",
    "3sum",
    "container-with-most-water",
    "best-time-to-buy-and-sell-stock",
    "longest-substring-without-repeating-characters",
    "longest-repeating-character-replacement",
    "minimum-window-substring",
    "binary-search",
    "search-in-rotated-sorted-array",
    "find-minimum-in-rotated-sorted-array",
    "reverse-linked-list",
    "merge-two-sorted-lists",
    "linked-list-cycle",
    "reorder-list",
    "remove-nth-node-from-end-of-list",
    "merge-k-sorted-lists",
    "invert-binary-tree",
    "maximum-depth-of-binary-tree",
    "same-tree",
    "subtree-of-another-tree",
    "lowest-common-ancestor-of-a-binary-search-tree",
    "binary-tree-level-order-traversal",
    "validate-binary-search-tree",
    "kth-smallest-element-in-a-bst",
    "construct-binary-tree-from-preorder-and-inorder-traversal",
    "binary-tree-maximum-path-sum",
    "serialize-and-deserialize-binary-tree",
    "find-median-from-data-stream",
    "climbing-stairs",
    "house-robber",
    "house-robber-ii",
    "longest-palindromic-substring",
    "palindromic-substrings",
    "decode-ways",
    "coin-change",
    "maximum-product-subarray",
    "word-break",
    "longest-increasing-subsequence",
    "unique-paths",
    "jump-game",
    "number-of-islands",
    "clone-graph",
    "pacific-atlantic-water-flow",
    "course-schedule",
    "course-schedule-ii",
    "combination-sum",
    "word-search",
    "number-of-1-bits",
    "counting-bits",
    "reverse-bits",
    "missing-number",
    "sum-of-two-integers",
  ],
  neetcode_150: [
    "two-sum",
    "contains-duplicate",
    "valid-anagram",
    "group-anagrams",
    "top-k-frequent-elements",
    "product-of-array-except-self",
    "longest-consecutive-sequence",
    "valid-palindrome",
    "3sum",
    "container-with-most-water",
    "valid-parentheses",
    "binary-search",
    "search-in-rotated-sorted-array",
    "find-minimum-in-rotated-sorted-array",
    "best-time-to-buy-and-sell-stock",
    "longest-substring-without-repeating-characters",
    "longest-repeating-character-replacement",
    "minimum-window-substring",
    "reverse-linked-list",
    "merge-two-sorted-lists",
    "linked-list-cycle",
    "reorder-list",
    "remove-nth-node-from-end-of-list",
    "merge-k-sorted-lists",
    "invert-binary-tree",
    "maximum-depth-of-binary-tree",
    "same-tree",
    "subtree-of-another-tree",
    "lowest-common-ancestor-of-a-binary-search-tree",
    "binary-tree-level-order-traversal",
    "validate-binary-search-tree",
    "kth-smallest-element-in-a-bst",
    "construct-binary-tree-from-preorder-and-inorder-traversal",
    "binary-tree-maximum-path-sum",
    "serialize-and-deserialize-binary-tree",
    "implement-trie-prefix-tree",
    "design-add-and-search-words-data-structure",
    "word-search-ii",
    "find-median-from-data-stream",
    "combination-sum",
    "word-search",
    "number-of-islands",
    "clone-graph",
    "pacific-atlantic-water-flow",
    "course-schedule",
    "course-schedule-ii",
    "climbing-stairs",
    "house-robber",
    "house-robber-ii",
    "palindromic-substrings",
    "decode-ways",
    "coin-change",
    "maximum-product-subarray",
    "word-break",
    "longest-increasing-subsequence",
    "longest-palindromic-substring",
    "unique-paths",
    "maximum-subarray",
    "jump-game",
    "insert-interval",
    "merge-intervals",
    "non-overlapping-intervals",
    "number-of-1-bits",
    "counting-bits",
    "reverse-bits",
    "missing-number",
    "sum-of-two-integers",
  ],
  grind_75: [
    "two-sum",
    "valid-parentheses",
    "merge-two-sorted-lists",
    "best-time-to-buy-and-sell-stock",
    "valid-palindrome",
    "invert-binary-tree",
    "valid-anagram",
    "binary-search",
    "linked-list-cycle",
    "lowest-common-ancestor-of-a-binary-search-tree",
    "maximum-depth-of-binary-tree",
    "reverse-linked-list",
    "contains-duplicate",
    "maximum-subarray",
    "climbing-stairs",
    "binary-tree-level-order-traversal",
    "validate-binary-search-tree",
    "number-of-islands",
    "clone-graph",
    "house-robber",
    "coin-change",
    "word-break",
    "longest-increasing-subsequence",
    "merge-k-sorted-lists",
    "find-median-from-data-stream",
    "word-search-ii",
    "serialize-and-deserialize-binary-tree",
  ],
  neetcode_250_complete: [
    // All problems from NeetCode 150 (duplicated here to avoid spread operator issues)
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
    // Additional problems for 250 (common patterns and advanced topics)
    "4sum",
    "trapping-rain-water",
    "longest-palindromic-subsequence",
    "edit-distance",
    "burst-balloons",
    "regular-expression-matching",
    "wildcard-matching",
    "minimum-path-sum",
    "unique-paths-ii",
    "maximal-square",
    "longest-common-subsequence",
    "partition-equal-subset-sum",
    "target-sum",
    "interleaving-string",
    "stone-game",
    "best-time-to-buy-and-sell-stock-ii",
    "best-time-to-buy-and-sell-stock-iii",
    "best-time-to-buy-and-sell-stock-iv",
    "best-time-to-buy-and-sell-stock-with-cooldown",
    "best-time-to-buy-and-sell-stock-with-transaction-fee",
    "dungeon-game",
    "cherry-pickup",
    "minimum-cost-to-cut-a-stick",
    "palindrome-partitioning",
    "palindrome-partitioning-ii",
    "word-break-ii",
    "concatenated-words",
    "word-ladder",
    "word-ladder-ii",
    "surrounded-regions",
    "walls-and-gates",
    "rotting-oranges",
    "shortest-path-in-binary-matrix",
    "as-far-from-land-as-possible",
    "snakes-and-ladders",
    "open-the-lock",
    "perfect-squares",
    "minimum-genetic-mutation",
    "shortest-path-visiting-all-nodes",
    "redundant-connection",
    "redundant-connection-ii",
    "accounts-merge",
    "number-of-provinces",
    "graph-valid-tree",
    "evaluate-division",
    "network-delay-time",
    "cheapest-flights-within-k-stops",
    "reconstruct-itinerary",
    "min-cost-to-connect-all-points",
    "swim-in-rising-water",
    "alien-dictionary",
    "sequence-reconstruction",
    "parallel-courses",
    "minimum-height-trees",
    "reorder-routes-to-make-all-paths-lead-to-the-city-zero",
    "critical-connections-in-a-network",
    "find-eventual-safe-states",
    "is-graph-bipartite",
    "possible-bipartition",
    "flower-planting-with-no-adjacent",
  ],
};

// Milestone configurations for each template
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { template_name } = body;

    if (!template_name || !PROBLEM_LISTS[template_name]) {
      return NextResponse.json(
        { error: "Invalid template name or template not found" },
        { status: 400 }
      );
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from("study_plan_templates")
      .select("*")
      .eq("name", template_name)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found in database" },
        { status: 404 }
      );
    }

    // Get problem slugs for this template
    const problemSlugs = PROBLEM_LISTS[template_name];
    
    // Fetch problem IDs from database
    const { data: problems, error: problemsError } = await supabase
      .from("problems")
      .select("id, title_slug")
      .in("title_slug", problemSlugs);

    if (problemsError) {
      console.error("Error fetching problems:", problemsError);
      return NextResponse.json(
        { error: "Failed to fetch problems" },
        { status: 500 }
      );
    }

    // Create a map of slug -> id
    const slugToId = new Map<string, number>();
    problems?.forEach((p) => {
      slugToId.set(p.title_slug, p.id);
    });

    // Get milestone config for this template
    const milestoneConfig = MILESTONE_CONFIGS[template_name] || [];

    // Delete existing milestones for this template
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
        required_problems: Math.ceil(problemIds.length * 0.7), // Require 70% completion
        total_problems: problemIds.length,
        estimated_hours: config.estimated_hours,
      };
    });

    // Insert milestones
    const { error: milestonesError } = await supabase
      .from("study_plan_template_milestones")
      .insert(milestonesData);

    if (milestonesError) {
      console.error("Error creating milestones:", milestonesError);
      return NextResponse.json(
        { error: "Failed to create milestones" },
        { status: 500 }
      );
    }

    // Update template totals
    const totalProblems = milestonesData.reduce((sum, m) => sum + m.total_problems, 0);
    const easyCount = 0; // Would need to fetch from problems table
    const mediumCount = 0;
    const hardCount = 0;

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

    return NextResponse.json({
      success: true,
      message: `Populated ${totalProblems} problems across ${milestonesData.length} milestones`,
      milestones_created: milestonesData.length,
      problems_added: totalProblems,
    });
  } catch (error) {
    console.error("Error in populate problems route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

