-- ==========================================
-- GRIND 75 COMPLETE (75 problems)
-- Source: https://www.techinterviewhandbook.org/grind75
-- Week-by-week structured approach
-- ==========================================

BEGIN;

-- Clean up existing Grind 75 template
DELETE FROM study_plan_templates WHERE name = 'grind_75';

-- Create Grind 75 template
INSERT INTO study_plan_templates (
  name, display_name, description, category, difficulty_level,
  icon, color, estimated_weeks, is_published, is_featured, tags, created_by
) VALUES (
  'grind_75',
  'Grind 75',
  'Updated version of Blind 75 by the original creator. Distilled into 75 essential questions spread across a strategic 8-week schedule for optimal learning.',
  'interview_prep',
  'intermediate',
  '⚡',
  '#3b82f6',
  8,
  true,
  true,
  ARRAY['grind-75', 'optimized', 'weekly-plan', 'structured'],
  NULL
);

-- Create weekly milestones with REAL problem IDs
INSERT INTO study_plan_template_milestones (
  template_id, title, description, milestone_order,
  learning_objectives, estimated_hours, total_problems, required_problems,
  problem_ids
) VALUES

-- Week 1: Foundation (13 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 1: Foundation',
  'Start with easiest problems to build confidence. Focus on arrays, strings, and basic data structures.',
  1,
  ARRAY['Build problem-solving confidence', 'Master basic patterns', 'Practice core data structures', 'Learn edge case handling'],
  15,
  13,
  11,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'two-sum',
      'valid-parentheses',
      'merge-two-sorted-lists',
      'best-time-to-buy-and-sell-stock',
      'valid-palindrome',
      'invert-binary-tree',
      'valid-anagram',
      'binary-search',
      'flood-fill',
      'lowest-common-ancestor-of-a-binary-search-tree',
      'balanced-binary-tree',
      'linked-list-cycle',
      'implement-queue-using-stacks'
    )
    ORDER BY CASE title_slug
      WHEN 'two-sum' THEN 1
      WHEN 'valid-parentheses' THEN 2
      WHEN 'merge-two-sorted-lists' THEN 3
      WHEN 'best-time-to-buy-and-sell-stock' THEN 4
      WHEN 'valid-palindrome' THEN 5
      WHEN 'invert-binary-tree' THEN 6
      WHEN 'valid-anagram' THEN 7
      WHEN 'binary-search' THEN 8
      WHEN 'flood-fill' THEN 9
      WHEN 'lowest-common-ancestor-of-a-binary-search-tree' THEN 10
      WHEN 'balanced-binary-tree' THEN 11
      WHEN 'linked-list-cycle' THEN 12
      WHEN 'implement-queue-using-stacks' THEN 13
    END
  )
),

-- Week 2: Building Momentum (12 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 2: Building Momentum',
  'Progress to slightly harder problems while reinforcing fundamentals.',
  2,
  ARRAY['Strengthen pattern recognition', 'Master tree traversals', 'Learn linked list techniques', 'Practice simple DP'],
  16,
  12,
  10,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'first-bad-version',
      'ransom-note',
      'climbing-stairs',
      'longest-palindrome',
      'reverse-linked-list',
      'majority-element',
      'add-binary',
      'diameter-of-binary-tree',
      'middle-of-the-linked-list',
      'maximum-depth-of-binary-tree',
      'contains-duplicate',
      'maximum-subarray'
    )
    ORDER BY CASE title_slug
      WHEN 'first-bad-version' THEN 1
      WHEN 'ransom-note' THEN 2
      WHEN 'climbing-stairs' THEN 3
      WHEN 'longest-palindrome' THEN 4
      WHEN 'reverse-linked-list' THEN 5
      WHEN 'majority-element' THEN 6
      WHEN 'add-binary' THEN 7
      WHEN 'diameter-of-binary-tree' THEN 8
      WHEN 'middle-of-the-linked-list' THEN 9
      WHEN 'maximum-depth-of-binary-tree' THEN 10
      WHEN 'contains-duplicate' THEN 11
      WHEN 'maximum-subarray' THEN 12
    END
  )
),

-- Week 3: Core Patterns (8 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 3: Core Patterns',
  'Dive into essential patterns: intervals, BFS, and graph basics.',
  3,
  ARRAY['Master interval merging', 'Learn BFS traversal', 'Practice graph problems', 'Understand stack patterns'],
  12,
  8,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'insert-interval',
      '01-matrix',
      'k-closest-points-to-origin',
      'longest-substring-without-repeating-characters',
      '3sum',
      'binary-tree-level-order-traversal',
      'clone-graph',
      'evaluate-reverse-polish-notation'
    )
    ORDER BY CASE title_slug
      WHEN 'insert-interval' THEN 1
      WHEN '01-matrix' THEN 2
      WHEN 'k-closest-points-to-origin' THEN 3
      WHEN 'longest-substring-without-repeating-characters' THEN 4
      WHEN '3sum' THEN 5
      WHEN 'binary-tree-level-order-traversal' THEN 6
      WHEN 'clone-graph' THEN 7
      WHEN 'evaluate-reverse-polish-notation' THEN 8
    END
  )
),

-- Week 4: Intermediate Challenges (8 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 4: Intermediate Challenges',
  'Tackle medium-hard problems with graphs, DP, and design.',
  4,
  ARRAY['Master graph algorithms', 'Learn Trie data structure', 'Practice DP optimization', 'Understand design problems'],
  14,
  8,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'course-schedule',
      'implement-trie-prefix-tree',
      'coin-change',
      'product-of-array-except-self',
      'min-stack',
      'validate-binary-search-tree',
      'number-of-islands',
      'rotting-oranges'
    )
    ORDER BY CASE title_slug
      WHEN 'course-schedule' THEN 1
      WHEN 'implement-trie-prefix-tree' THEN 2
      WHEN 'coin-change' THEN 3
      WHEN 'product-of-array-except-self' THEN 4
      WHEN 'min-stack' THEN 5
      WHEN 'validate-binary-search-tree' THEN 6
      WHEN 'number-of-islands' THEN 7
      WHEN 'rotting-oranges' THEN 8
    END
  )
),

-- Week 5: Advanced Patterns (8 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 5: Advanced Patterns',
  'Focus on harder array, tree, and graph problems.',
  5,
  ARRAY['Master binary search variations', 'Learn backtracking', 'Practice interval techniques', 'Understand tree LCA'],
  14,
  8,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'search-in-rotated-sorted-array',
      'combination-sum',
      'permutations',
      'merge-intervals',
      'lowest-common-ancestor-of-a-binary-tree',
      'time-based-key-value-store',
      'accounts-merge',
      'sort-colors'
    )
    ORDER BY CASE title_slug
      WHEN 'search-in-rotated-sorted-array' THEN 1
      WHEN 'combination-sum' THEN 2
      WHEN 'permutations' THEN 3
      WHEN 'merge-intervals' THEN 4
      WHEN 'lowest-common-ancestor-of-a-binary-tree' THEN 5
      WHEN 'time-based-key-value-store' THEN 6
      WHEN 'accounts-merge' THEN 7
      WHEN 'sort-colors' THEN 8
    END
  )
),

-- Week 6: DP & Strings (9 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 6: Dynamic Programming & Strings',
  'Deep dive into DP patterns and complex string problems.',
  6,
  ARRAY['Master partition DP', 'Learn string parsing', 'Practice matrix problems', 'Understand backtracking with subsets'],
  16,
  9,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'word-break',
      'partition-equal-subset-sum',
      'string-to-integer-atoi',
      'spiral-matrix',
      'subsets',
      'binary-tree-right-side-view',
      'longest-palindromic-substring',
      'unique-paths',
      'construct-binary-tree-from-preorder-and-inorder-traversal'
    )
    ORDER BY CASE title_slug
      WHEN 'word-break' THEN 1
      WHEN 'partition-equal-subset-sum' THEN 2
      WHEN 'string-to-integer-atoi' THEN 3
      WHEN 'spiral-matrix' THEN 4
      WHEN 'subsets' THEN 5
      WHEN 'binary-tree-right-side-view' THEN 6
      WHEN 'longest-palindromic-substring' THEN 7
      WHEN 'unique-paths' THEN 8
      WHEN 'construct-binary-tree-from-preorder-and-inorder-traversal' THEN 9
    END
  )
),

-- Week 7: Mixed Practice (7 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 7: Mixed Practice',
  'Tackle diverse problem types to strengthen weak areas.',
  7,
  ARRAY['Master two pointers', 'Learn string backtracking', 'Practice greedy algorithms', 'Understand LRU cache design'],
  12,
  7,
  6,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'container-with-most-water',
      'letter-combinations-of-a-phone-number',
      'word-search',
      'find-all-anagrams-in-a-string',
      'minimum-height-trees',
      'task-scheduler',
      'lru-cache'
    )
    ORDER BY CASE title_slug
      WHEN 'container-with-most-water' THEN 1
      WHEN 'letter-combinations-of-a-phone-number' THEN 2
      WHEN 'word-search' THEN 3
      WHEN 'find-all-anagrams-in-a-string' THEN 4
      WHEN 'minimum-height-trees' THEN 5
      WHEN 'task-scheduler' THEN 6
      WHEN 'lru-cache' THEN 7
    END
  )
),

-- Week 8: Final Push (10 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
  'Week 8: Final Push - Hard Problems',
  'Conquer the hardest problems to complete your preparation.',
  8,
  ARRAY['Master hard tree problems', 'Learn advanced DP', 'Practice complex graph algorithms', 'Tackle challenging design problems'],
  18,
  10,
  8,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'kth-smallest-element-in-a-bst',
      'minimum-window-substring',
      'serialize-and-deserialize-binary-tree',
      'trapping-rain-water',
      'find-median-from-data-stream',
      'word-ladder',
      'basic-calculator',
      'maximum-profit-in-job-scheduling',
      'merge-k-sorted-lists',
      'largest-rectangle-in-histogram'
    )
    ORDER BY CASE title_slug
      WHEN 'kth-smallest-element-in-a-bst' THEN 1
      WHEN 'minimum-window-substring' THEN 2
      WHEN 'serialize-and-deserialize-binary-tree' THEN 3
      WHEN 'trapping-rain-water' THEN 4
      WHEN 'find-median-from-data-stream' THEN 5
      WHEN 'word-ladder' THEN 6
      WHEN 'basic-calculator' THEN 7
      WHEN 'maximum-profit-in-job-scheduling' THEN 8
      WHEN 'merge-k-sorted-lists' THEN 9
      WHEN 'largest-rectangle-in-histogram' THEN 10
    END
  )
);

-- Update template totals
UPDATE study_plan_templates
SET
  total_milestones = (SELECT COUNT(*) FROM study_plan_template_milestones WHERE template_id = study_plan_templates.id),
  total_problems = (
    SELECT SUM(total_problems)
    FROM study_plan_template_milestones
    WHERE template_id = study_plan_templates.id
  )
WHERE name = 'grind_75';

COMMIT;

-- ==========================================
-- DONE! Grind 75 template created with:
-- ✅ 8 milestones (week-by-week structure)
-- ✅ 75 total problems
-- ✅ Strategic difficulty progression
-- ✅ All problems linked via title_slug
-- ==========================================
