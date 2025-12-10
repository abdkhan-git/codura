-- =====================================================
-- Populate ALL Study Plan Template Problems
-- =====================================================
-- Comprehensive migration to populate problems for all study plan templates
-- This creates milestones with problem_ids arrays based on title_slug

BEGIN;

-- Helper function to get problem IDs from slugs (handles missing problems gracefully)
CREATE OR REPLACE FUNCTION get_problem_ids(slugs TEXT[])
RETURNS INTEGER[] AS $$
  SELECT COALESCE(
    ARRAY_AGG(id ORDER BY array_position(slugs, title_slug)),
    ARRAY[]::INTEGER[]
  )
  FROM problems
  WHERE title_slug = ANY(slugs);
$$ LANGUAGE sql;

-- Helper function to create milestone
CREATE OR REPLACE FUNCTION create_milestone(
  p_template_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_order INTEGER,
  p_slugs TEXT[],
  p_learning_objectives TEXT[],
  p_hours INTEGER
) RETURNS VOID AS $$
DECLARE
  problem_ids_array INTEGER[];
BEGIN
  problem_ids_array := get_problem_ids(p_slugs);
  
  IF array_length(problem_ids_array, 1) > 0 THEN
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      p_template_id, p_title, p_description, p_order, problem_ids_array,
      array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)),
      p_hours, p_learning_objectives
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Blind 75 Essentials
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'blind_75_essentials';
  
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    
    PERFORM create_milestone(v_template_id, 'Arrays & Hashing', 'Master fundamental array operations and hash table techniques.', 1,
      ARRAY['two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams', 'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence'],
      ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting'], 12);
    
    PERFORM create_milestone(v_template_id, 'Two Pointers', 'Master the two-pointer technique.', 2,
      ARRAY['valid-palindrome', '3sum', 'container-with-most-water'],
      ARRAY['Master two-pointer technique', 'Understand when to use two pointers'], 8);
    
    PERFORM create_milestone(v_template_id, 'Sliding Window', 'Learn sliding window patterns.', 3,
      ARRAY['best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters', 'longest-repeating-character-replacement', 'minimum-window-substring'],
      ARRAY['Master sliding window technique', 'Understand window expansion/contraction'], 10);
    
    PERFORM create_milestone(v_template_id, 'Binary Search', 'Master binary search and its variations.', 4,
      ARRAY['binary-search', 'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array'],
      ARRAY['Master binary search algorithm', 'Handle rotated arrays'], 8);
    
    PERFORM create_milestone(v_template_id, 'Linked Lists', 'Master linked list operations.', 5,
      ARRAY['reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle', 'reorder-list', 'remove-nth-node-from-end-of-list', 'merge-k-sorted-lists'],
      ARRAY['Master linked list manipulation', 'Understand cycle detection'], 12);
    
    PERFORM create_milestone(v_template_id, 'Trees', 'Master binary tree traversal.', 6,
      ARRAY['invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree', 'subtree-of-another-tree', 'lowest-common-ancestor-of-a-binary-search-tree', 'binary-tree-level-order-traversal', 'validate-binary-search-tree', 'kth-smallest-element-in-a-bst', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'binary-tree-maximum-path-sum', 'serialize-and-deserialize-binary-tree'],
      ARRAY['Master tree traversal (DFS/BFS)', 'Understand BST properties'], 20);
    
    PERFORM create_milestone(v_template_id, 'Heaps & Priority Queue', 'Learn heap data structure.', 7,
      ARRAY['merge-k-sorted-lists', 'top-k-frequent-elements', 'find-median-from-data-stream'],
      ARRAY['Understand heap operations', 'Solve top-k problems'], 8);
    
    PERFORM create_milestone(v_template_id, 'Dynamic Programming', 'Master DP fundamentals.', 8,
      ARRAY['climbing-stairs', 'house-robber', 'house-robber-ii', 'longest-palindromic-substring', 'palindromic-substrings', 'decode-ways', 'coin-change', 'maximum-product-subarray', 'word-break', 'longest-increasing-subsequence', 'unique-paths', 'jump-game'],
      ARRAY['Understand DP patterns', 'Master memoization'], 20);
    
    PERFORM create_milestone(v_template_id, 'Graphs', 'Master graph traversal.', 9,
      ARRAY['number-of-islands', 'clone-graph', 'pacific-atlantic-water-flow', 'course-schedule', 'course-schedule-ii'],
      ARRAY['Master BFS/DFS', 'Understand topological sort'], 14);
    
    PERFORM create_milestone(v_template_id, 'Backtracking & Bit Manipulation', 'Learn backtracking and bitwise operations.', 10,
      ARRAY['combination-sum', 'word-search', 'number-of-1-bits', 'counting-bits', 'reverse-bits', 'missing-number', 'sum-of-two-integers'],
      ARRAY['Master backtracking', 'Understand bitwise operations'], 12);
    
    UPDATE study_plan_templates SET 
      total_milestones = 10,
      total_problems = (SELECT COALESCE(SUM(total_problems), 0) FROM study_plan_template_milestones m WHERE m.template_id = v_template_id)
    WHERE id = v_template_id;
  END IF;
END $$;

-- =====================================================
-- Grind 75
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'grind_75';
  
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    
    PERFORM create_milestone(v_template_id, 'Week 1: Foundation', 'Start with easiest problems to build confidence.', 1,
      ARRAY['two-sum', 'valid-parentheses', 'merge-two-sorted-lists', 'best-time-to-buy-and-sell-stock', 'valid-palindrome', 'invert-binary-tree', 'valid-anagram', 'binary-search', 'linked-list-cycle', 'lowest-common-ancestor-of-a-binary-search-tree', 'maximum-depth-of-binary-tree'],
      ARRAY['Build confidence', 'Master basics'], 15);
    
    PERFORM create_milestone(v_template_id, 'Week 2: Core Patterns', 'Dive into essential patterns.', 2,
      ARRAY['reverse-linked-list', 'contains-duplicate', 'maximum-subarray', 'climbing-stairs'],
      ARRAY['Master two pointers', 'Understand sliding window'], 10);
    
    PERFORM create_milestone(v_template_id, 'Week 3: Trees & Graphs', 'Focus on tree traversal.', 3,
      ARRAY['binary-tree-level-order-traversal', 'validate-binary-search-tree', 'number-of-islands', 'clone-graph'],
      ARRAY['Master tree traversal', 'Understand BST operations'], 12);
    
    PERFORM create_milestone(v_template_id, 'Week 4: Dynamic Programming', 'Introduction to DP.', 4,
      ARRAY['house-robber', 'coin-change', 'word-break', 'longest-increasing-subsequence'],
      ARRAY['Understand DP patterns', 'Master memoization'], 14);
    
    PERFORM create_milestone(v_template_id, 'Week 5: Advanced Topics', 'Tackle advanced problems.', 5,
      ARRAY['merge-k-sorted-lists', 'find-median-from-data-stream', 'word-search-ii', 'serialize-and-deserialize-binary-tree'],
      ARRAY['Master heaps', 'Understand backtracking'], 16);
    
    UPDATE study_plan_templates SET 
      total_milestones = 5,
      total_problems = (SELECT COALESCE(SUM(total_problems), 0) FROM study_plan_template_milestones m WHERE m.template_id = v_template_id)
    WHERE id = v_template_id;
  END IF;
END $$;

-- =====================================================
-- NeetCode 150
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'neetcode_150';
  
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    
    -- Similar structure to Blind 75 but expanded
    PERFORM create_milestone(v_template_id, 'Arrays & Hashing', 'Master fundamental array operations.', 1,
      ARRAY['two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams', 'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence'],
      ARRAY['Understand hash table time complexity', 'Master two-sum pattern'], 12);
    
    PERFORM create_milestone(v_template_id, 'Two Pointers & Stack', 'Master two-pointer and stack operations.', 2,
      ARRAY['valid-palindrome', '3sum', 'container-with-most-water', 'valid-parentheses'],
      ARRAY['Master two-pointer technique', 'Understand stack operations'], 10);
    
    PERFORM create_milestone(v_template_id, 'Sliding Window', 'Learn sliding window patterns.', 3,
      ARRAY['best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters', 'longest-repeating-character-replacement', 'minimum-window-substring'],
      ARRAY['Master sliding window technique'], 10);
    
    PERFORM create_milestone(v_template_id, 'Binary Search', 'Master binary search.', 4,
      ARRAY['binary-search', 'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array'],
      ARRAY['Master binary search algorithm'], 8);
    
    PERFORM create_milestone(v_template_id, 'Linked Lists', 'Master linked list operations.', 5,
      ARRAY['reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle', 'reorder-list', 'remove-nth-node-from-end-of-list', 'merge-k-sorted-lists'],
      ARRAY['Master linked list manipulation'], 12);
    
    PERFORM create_milestone(v_template_id, 'Trees', 'Master binary tree traversal.', 6,
      ARRAY['invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree', 'subtree-of-another-tree', 'lowest-common-ancestor-of-a-binary-search-tree', 'binary-tree-level-order-traversal', 'validate-binary-search-tree', 'kth-smallest-element-in-a-bst', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'binary-tree-maximum-path-sum', 'serialize-and-deserialize-binary-tree'],
      ARRAY['Master tree traversal (DFS/BFS)'], 20);
    
    PERFORM create_milestone(v_template_id, 'Tries', 'Master trie data structure.', 7,
      ARRAY['implement-trie-prefix-tree', 'design-add-and-search-words-data-structure', 'word-search-ii'],
      ARRAY['Understand trie operations'], 10);
    
    PERFORM create_milestone(v_template_id, 'Heaps', 'Learn heap data structure.', 8,
      ARRAY['merge-k-sorted-lists', 'top-k-frequent-elements', 'find-median-from-data-stream'],
      ARRAY['Understand heap operations'], 8);
    
    PERFORM create_milestone(v_template_id, 'Backtracking', 'Learn backtracking patterns.', 9,
      ARRAY['combination-sum', 'word-search', 'word-search-ii'],
      ARRAY['Master backtracking'], 8);
    
    PERFORM create_milestone(v_template_id, 'Graphs', 'Master graph traversal.', 10,
      ARRAY['number-of-islands', 'clone-graph', 'pacific-atlantic-water-flow', 'course-schedule', 'course-schedule-ii'],
      ARRAY['Master BFS/DFS'], 14);
    
    PERFORM create_milestone(v_template_id, 'Dynamic Programming', 'Master DP fundamentals.', 11,
      ARRAY['climbing-stairs', 'house-robber', 'house-robber-ii', 'palindromic-substrings', 'decode-ways', 'coin-change', 'maximum-product-subarray', 'word-break', 'longest-increasing-subsequence', 'longest-palindromic-substring', 'unique-paths', 'maximum-subarray', 'jump-game'],
      ARRAY['Understand DP patterns'], 20);
    
    PERFORM create_milestone(v_template_id, 'Intervals', 'Master interval problems.', 12,
      ARRAY['insert-interval', 'merge-intervals', 'non-overlapping-intervals'],
      ARRAY['Master interval merging'], 8);
    
    PERFORM create_milestone(v_template_id, 'Bit Manipulation', 'Master bitwise operations.', 13,
      ARRAY['number-of-1-bits', 'counting-bits', 'reverse-bits', 'missing-number', 'sum-of-two-integers'],
      ARRAY['Understand bitwise operations'], 8);
    
    UPDATE study_plan_templates SET 
      total_milestones = 13,
      total_problems = (SELECT COALESCE(SUM(total_problems), 0) FROM study_plan_template_milestones m WHERE m.template_id = v_template_id)
    WHERE id = v_template_id;
  END IF;
END $$;

-- =====================================================
-- NeetCode 250 Complete (uses curate-custom API for dynamic population)
-- =====================================================
-- This will be populated via the curate-custom API endpoint
-- as it requires dynamic problem selection

-- =====================================================
-- Grind 169 (extended version - uses similar structure to Grind 75)
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'grind_169';
  
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    
    -- Extended version with more problems per milestone
    PERFORM create_milestone(v_template_id, 'Week 1-2: Foundation', 'Build strong fundamentals.', 1,
      ARRAY['two-sum', 'valid-parentheses', 'merge-two-sorted-lists', 'best-time-to-buy-and-sell-stock', 'valid-palindrome', 'invert-binary-tree', 'valid-anagram', 'binary-search', 'linked-list-cycle', 'lowest-common-ancestor-of-a-binary-search-tree', 'maximum-depth-of-binary-tree', 'reverse-linked-list', 'contains-duplicate', 'maximum-subarray'],
      ARRAY['Build confidence', 'Master basics'], 20);
    
    PERFORM create_milestone(v_template_id, 'Week 3-4: Core Patterns', 'Master essential patterns.', 2,
      ARRAY['climbing-stairs', 'binary-tree-level-order-traversal', 'validate-binary-search-tree', 'number-of-islands', 'clone-graph', 'house-robber', 'coin-change'],
      ARRAY['Master patterns', 'Understand algorithms'], 18);
    
    PERFORM create_milestone(v_template_id, 'Week 5-6: Advanced Topics', 'Tackle complex problems.', 3,
      ARRAY['word-break', 'longest-increasing-subsequence', 'merge-k-sorted-lists', 'find-median-from-data-stream', 'word-search-ii', 'serialize-and-deserialize-binary-tree'],
      ARRAY['Master advanced techniques'], 20);
    
    UPDATE study_plan_templates SET 
      total_milestones = 3,
      total_problems = (SELECT COALESCE(SUM(total_problems), 0) FROM study_plan_template_milestones m WHERE m.template_id = v_template_id)
    WHERE id = v_template_id;
  END IF;
END $$;

-- =====================================================
-- DP Mastery: 0 to Hero (will use curate-custom API)
-- =====================================================
-- This template will be populated via the curate-custom API
-- which automatically detects "DP" from the name and curates problems

-- Update all templates to refresh their totals
UPDATE study_plan_templates
SET 
  total_milestones = (
    SELECT COUNT(*) FROM study_plan_template_milestones m
    WHERE m.template_id = study_plan_templates.id
  ),
  total_problems = (
    SELECT COALESCE(SUM(total_problems), 0)
    FROM study_plan_template_milestones m
    WHERE m.template_id = study_plan_templates.id
  )
WHERE EXISTS (
  SELECT 1 FROM study_plan_template_milestones m
  WHERE m.template_id = study_plan_templates.id
);

COMMIT;

-- Clean up helper functions
DROP FUNCTION IF EXISTS create_milestone(UUID, TEXT, TEXT, INTEGER, TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS get_problem_ids(TEXT[]);

