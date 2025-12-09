-- ==========================================
-- ONE-CLICK STUDY PLAN SETUP
-- This script does EVERYTHING in one go
-- ==========================================

BEGIN;

-- Step 1: Clean up old broken data
DELETE FROM study_plan_templates WHERE name = 'blind_75_essentials';

-- Step 2: Create ONE working template (Blind 75)
INSERT INTO study_plan_templates (
  name, display_name, description, category, difficulty_level,
  icon, color, estimated_weeks, is_published, is_featured, tags, created_by
) VALUES (
  'blind_75_essentials',
  'Blind 75 Essentials',
  'The legendary 75 LeetCode problems that cover all essential patterns for coding interviews.',
  'interview_prep',
  'intermediate',
  '🎯',
  '#10b981',
  8,
  true,
  true,
  ARRAY['blind-75', 'essential', 'faang'],
  NULL
);

-- Step 3: Create milestones with REAL problem IDs
INSERT INTO study_plan_template_milestones (
  template_id, title, description, milestone_order,
  learning_objectives, estimated_hours, total_problems, required_problems,
  problem_ids
) VALUES

-- Milestone 1: Arrays & Hashing
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Arrays & Hashing',
  'Master fundamental array operations and hash table techniques.',
  1,
  ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting'],
  12,
  7,
  5,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams', 'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence')
    ORDER BY CASE title_slug
      WHEN 'two-sum' THEN 1
      WHEN 'contains-duplicate' THEN 2
      WHEN 'valid-anagram' THEN 3
      WHEN 'group-anagrams' THEN 4
      WHEN 'top-k-frequent-elements' THEN 5
      WHEN 'product-of-array-except-self' THEN 6
      WHEN 'longest-consecutive-sequence' THEN 7
    END
  )
),

-- Milestone 2: Two Pointers
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Two Pointers',
  'Learn the two pointers technique for array and string problems.',
  2,
  ARRAY['Master left-right pointer technique', 'Learn fast-slow pointer pattern'],
  8,
  3,
  2,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('valid-palindrome', '3sum', 'container-with-most-water')
    ORDER BY CASE title_slug
      WHEN 'valid-palindrome' THEN 1
      WHEN '3sum' THEN 2
      WHEN 'container-with-most-water' THEN 3
    END
  )
),

-- Milestone 3: Sliding Window
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Sliding Window',
  'Master the sliding window pattern for substring and subarray problems.',
  3,
  ARRAY['Understand fixed-size windows', 'Master variable-size windows'],
  10,
  4,
  3,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters', 'longest-repeating-character-replacement', 'minimum-window-substring')
    ORDER BY CASE title_slug
      WHEN 'best-time-to-buy-and-sell-stock' THEN 1
      WHEN 'longest-substring-without-repeating-characters' THEN 2
      WHEN 'longest-repeating-character-replacement' THEN 3
      WHEN 'minimum-window-substring' THEN 4
    END
  )
),

-- Milestone 4: Binary Search
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Binary Search',
  'Master binary search on sorted arrays and search space reduction.',
  4,
  ARRAY['Perfect binary search implementation', 'Master rotated array search'],
  8,
  3,
  2,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('binary-search', 'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array')
    ORDER BY CASE title_slug
      WHEN 'binary-search' THEN 1
      WHEN 'search-in-rotated-sorted-array' THEN 2
      WHEN 'find-minimum-in-rotated-sorted-array' THEN 3
    END
  )
),

-- Milestone 5: Linked Lists
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Linked Lists',
  'Deep dive into linked list manipulation, reversal, and cycle detection.',
  5,
  ARRAY['Master reversal techniques', 'Learn cycle detection (Floyd)'],
  10,
  5,
  4,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle', 'reorder-list', 'remove-nth-node-from-end-of-list')
    ORDER BY CASE title_slug
      WHEN 'reverse-linked-list' THEN 1
      WHEN 'merge-two-sorted-lists' THEN 2
      WHEN 'linked-list-cycle' THEN 3
      WHEN 'reorder-list' THEN 4
      WHEN 'remove-nth-node-from-end-of-list' THEN 5
    END
  )
),

-- Milestone 6: Trees
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Trees',
  'Master binary tree traversal, BST operations, and tree construction.',
  6,
  ARRAY['Perfect all traversals (in/pre/post)', 'Master BST properties'],
  14,
  8,
  6,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree', 'subtree-of-another-tree', 'lowest-common-ancestor-of-a-binary-search-tree', 'binary-tree-level-order-traversal', 'validate-binary-search-tree', 'kth-smallest-element-in-a-bst')
    ORDER BY CASE title_slug
      WHEN 'invert-binary-tree' THEN 1
      WHEN 'maximum-depth-of-binary-tree' THEN 2
      WHEN 'same-tree' THEN 3
      WHEN 'subtree-of-another-tree' THEN 4
      WHEN 'lowest-common-ancestor-of-a-binary-search-tree' THEN 5
      WHEN 'binary-tree-level-order-traversal' THEN 6
      WHEN 'validate-binary-search-tree' THEN 7
      WHEN 'kth-smallest-element-in-a-bst' THEN 8
    END
  )
),

-- Milestone 7: Dynamic Programming
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Dynamic Programming',
  'Master DP fundamentals and common patterns.',
  7,
  ARRAY['Understand memoization vs tabulation', 'Master 1D DP patterns'],
  16,
  9,
  6,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('climbing-stairs', 'house-robber', 'house-robber-ii', 'longest-palindromic-substring', 'decode-ways', 'coin-change', 'maximum-product-subarray', 'word-break', 'longest-increasing-subsequence')
    ORDER BY CASE title_slug
      WHEN 'climbing-stairs' THEN 1
      WHEN 'house-robber' THEN 2
      WHEN 'house-robber-ii' THEN 3
      WHEN 'longest-palindromic-substring' THEN 4
      WHEN 'decode-ways' THEN 5
      WHEN 'coin-change' THEN 6
      WHEN 'maximum-product-subarray' THEN 7
      WHEN 'word-break' THEN 8
      WHEN 'longest-increasing-subsequence' THEN 9
    END
  )
),

-- Milestone 8: Graphs
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Graphs',
  'Master graph traversal (BFS/DFS), shortest paths, and union-find.',
  8,
  ARRAY['Perfect BFS/DFS implementation', 'Learn union-find pattern'],
  12,
  4,
  3,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN ('number-of-islands', 'clone-graph', 'course-schedule', 'course-schedule-ii')
    ORDER BY CASE title_slug
      WHEN 'number-of-islands' THEN 1
      WHEN 'clone-graph' THEN 2
      WHEN 'course-schedule' THEN 3
      WHEN 'course-schedule-ii' THEN 4
    END
  )
);

-- Step 4: Update template totals
UPDATE study_plan_templates
SET
  total_milestones = (SELECT COUNT(*) FROM study_plan_template_milestones WHERE template_id = study_plan_templates.id),
  total_problems = (
    SELECT SUM(total_problems)
    FROM study_plan_template_milestones
    WHERE template_id = study_plan_templates.id
  )
WHERE name = 'blind_75_essentials';

COMMIT;

-- ==========================================
-- DONE! You now have:
-- ✅ 1 fully working template (Blind 75)
-- ✅ 8 milestones with real LeetCode problems
-- ✅ 43 total problems linked and ready
--
-- Next: Delete your broken study plan and adopt this template!
-- ==========================================
