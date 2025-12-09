-- ==========================================
-- BLIND 75 COMPLETE (76 problems)
-- Source: https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU
-- ==========================================

BEGIN;

-- Clean up existing Blind 75 template
DELETE FROM study_plan_templates WHERE name = 'blind_75_essentials';

-- Create Blind 75 template
INSERT INTO study_plan_templates (
  name, display_name, description, category, difficulty_level,
  icon, color, estimated_weeks, is_published, is_featured, tags, created_by
) VALUES (
  'blind_75_essentials',
  'Blind 75 Essentials',
  'The legendary 75 LeetCode problems that cover all essential patterns for coding interviews. Originally shared on Blind, this list has helped thousands land FAANG offers.',
  'interview_prep',
  'intermediate',
  '🎯',
  '#10b981',
  8,
  true,
  true,
  ARRAY['blind-75', 'essential', 'faang', 'patterns'],
  NULL
);

-- Create milestones with REAL problem IDs
INSERT INTO study_plan_template_milestones (
  template_id, title, description, milestone_order,
  learning_objectives, estimated_hours, total_problems, required_problems,
  problem_ids
) VALUES

-- Milestone 1: Array (10 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Array',
  'Master fundamental array operations including sliding window, two pointers, and dynamic programming.',
  1,
  ARRAY['Master two-sum pattern', 'Learn sliding window technique', 'Understand prefix sum', 'Practice array manipulation'],
  15,
  10,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'two-sum',
      'best-time-to-buy-and-sell-stock',
      'contains-duplicate',
      'product-of-array-except-self',
      'maximum-subarray',
      'maximum-product-subarray',
      'find-minimum-in-rotated-sorted-array',
      'search-in-rotated-sorted-array',
      '3sum',
      'container-with-most-water'
    )
    ORDER BY CASE title_slug
      WHEN 'two-sum' THEN 1
      WHEN 'best-time-to-buy-and-sell-stock' THEN 2
      WHEN 'contains-duplicate' THEN 3
      WHEN 'product-of-array-except-self' THEN 4
      WHEN 'maximum-subarray' THEN 5
      WHEN 'maximum-product-subarray' THEN 6
      WHEN 'find-minimum-in-rotated-sorted-array' THEN 7
      WHEN 'search-in-rotated-sorted-array' THEN 8
      WHEN '3sum' THEN 9
      WHEN 'container-with-most-water' THEN 10
    END
  )
),

-- Milestone 2: Binary (5 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Binary & Bit Manipulation',
  'Master bitwise operations and common bit manipulation tricks.',
  2,
  ARRAY['Understand bitwise operators', 'Learn common bit tricks', 'Master XOR patterns', 'Practice bit counting'],
  8,
  5,
  4,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'sum-of-two-integers',
      'number-of-1-bits',
      'counting-bits',
      'missing-number',
      'reverse-bits'
    )
    ORDER BY CASE title_slug
      WHEN 'sum-of-two-integers' THEN 1
      WHEN 'number-of-1-bits' THEN 2
      WHEN 'counting-bits' THEN 3
      WHEN 'missing-number' THEN 4
      WHEN 'reverse-bits' THEN 5
    END
  )
),

-- Milestone 3: Dynamic Programming (11 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Dynamic Programming',
  'Master DP fundamentals including memoization, tabulation, and common patterns.',
  3,
  ARRAY['Understand memoization vs tabulation', 'Master 1D DP patterns', 'Learn state transitions', 'Practice optimization'],
  20,
  11,
  8,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'climbing-stairs',
      'coin-change',
      'longest-increasing-subsequence',
      'longest-common-subsequence',
      'word-break',
      'combination-sum-iv',
      'house-robber',
      'house-robber-ii',
      'decode-ways',
      'unique-paths',
      'jump-game'
    )
    ORDER BY CASE title_slug
      WHEN 'climbing-stairs' THEN 1
      WHEN 'coin-change' THEN 2
      WHEN 'longest-increasing-subsequence' THEN 3
      WHEN 'longest-common-subsequence' THEN 4
      WHEN 'word-break' THEN 5
      WHEN 'combination-sum-iv' THEN 6
      WHEN 'house-robber' THEN 7
      WHEN 'house-robber-ii' THEN 8
      WHEN 'decode-ways' THEN 9
      WHEN 'unique-paths' THEN 10
      WHEN 'jump-game' THEN 11
    END
  )
),

-- Milestone 4: Graph (8 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Graph',
  'Master graph traversal (BFS/DFS), topological sort, and union-find.',
  4,
  ARRAY['Perfect BFS/DFS implementation', 'Learn topological sort', 'Master union-find pattern', 'Practice graph construction'],
  14,
  8,
  6,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'clone-graph',
      'course-schedule',
      'pacific-atlantic-water-flow',
      'number-of-islands',
      'longest-consecutive-sequence',
      'alien-dictionary',
      'graph-valid-tree',
      'number-of-connected-components-in-an-undirected-graph'
    )
    ORDER BY CASE title_slug
      WHEN 'clone-graph' THEN 1
      WHEN 'course-schedule' THEN 2
      WHEN 'pacific-atlantic-water-flow' THEN 3
      WHEN 'number-of-islands' THEN 4
      WHEN 'longest-consecutive-sequence' THEN 5
      WHEN 'alien-dictionary' THEN 6
      WHEN 'graph-valid-tree' THEN 7
      WHEN 'number-of-connected-components-in-an-undirected-graph' THEN 8
    END
  )
),

-- Milestone 5: Interval (5 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Interval',
  'Learn interval merging, overlapping detection, and scheduling problems.',
  5,
  ARRAY['Master interval merging', 'Learn overlap detection', 'Practice sorting + greedy', 'Understand sweep line'],
  8,
  5,
  4,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'insert-interval',
      'merge-intervals',
      'non-overlapping-intervals',
      'meeting-rooms',
      'meeting-rooms-ii'
    )
    ORDER BY CASE title_slug
      WHEN 'insert-interval' THEN 1
      WHEN 'merge-intervals' THEN 2
      WHEN 'non-overlapping-intervals' THEN 3
      WHEN 'meeting-rooms' THEN 4
      WHEN 'meeting-rooms-ii' THEN 5
    END
  )
),

-- Milestone 6: Linked List (6 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Linked List',
  'Deep dive into linked list manipulation, reversal, and cycle detection.',
  6,
  ARRAY['Master reversal techniques', 'Learn cycle detection (Floyd)', 'Practice merge operations', 'Understand dummy node patterns'],
  10,
  6,
  5,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'reverse-linked-list',
      'linked-list-cycle',
      'merge-two-sorted-lists',
      'merge-k-sorted-lists',
      'remove-nth-node-from-end-of-list',
      'reorder-list'
    )
    ORDER BY CASE title_slug
      WHEN 'reverse-linked-list' THEN 1
      WHEN 'linked-list-cycle' THEN 2
      WHEN 'merge-two-sorted-lists' THEN 3
      WHEN 'merge-k-sorted-lists' THEN 4
      WHEN 'remove-nth-node-from-end-of-list' THEN 5
      WHEN 'reorder-list' THEN 6
    END
  )
),

-- Milestone 7: Matrix (4 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Matrix',
  'Master 2D array traversal, rotation, and graph-style problems on grids.',
  7,
  ARRAY['Learn matrix traversal patterns', 'Master rotation techniques', 'Practice DFS/BFS on grids', 'Understand in-place manipulation'],
  8,
  4,
  3,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'set-matrix-zeroes',
      'spiral-matrix',
      'rotate-image',
      'word-search'
    )
    ORDER BY CASE title_slug
      WHEN 'set-matrix-zeroes' THEN 1
      WHEN 'spiral-matrix' THEN 2
      WHEN 'rotate-image' THEN 3
      WHEN 'word-search' THEN 4
    END
  )
),

-- Milestone 8: String (10 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'String',
  'Master string manipulation, sliding window, and palindrome patterns.',
  8,
  ARRAY['Master sliding window on strings', 'Learn palindrome techniques', 'Practice hash table with strings', 'Understand string manipulation'],
  14,
  10,
  7,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'longest-substring-without-repeating-characters',
      'longest-repeating-character-replacement',
      'minimum-window-substring',
      'valid-anagram',
      'group-anagrams',
      'valid-parentheses',
      'valid-palindrome',
      'longest-palindromic-substring',
      'palindromic-substrings',
      'encode-and-decode-strings'
    )
    ORDER BY CASE title_slug
      WHEN 'longest-substring-without-repeating-characters' THEN 1
      WHEN 'longest-repeating-character-replacement' THEN 2
      WHEN 'minimum-window-substring' THEN 3
      WHEN 'valid-anagram' THEN 4
      WHEN 'group-anagrams' THEN 5
      WHEN 'valid-parentheses' THEN 6
      WHEN 'valid-palindrome' THEN 7
      WHEN 'longest-palindromic-substring' THEN 8
      WHEN 'palindromic-substrings' THEN 9
      WHEN 'encode-and-decode-strings' THEN 10
    END
  )
),

-- Milestone 9: Tree (14 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Tree',
  'Master binary tree traversal, BST operations, tree construction, and serialization.',
  9,
  ARRAY['Perfect all traversals (in/pre/post)', 'Master BST properties', 'Learn tree construction', 'Practice serialization'],
  18,
  14,
  10,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'maximum-depth-of-binary-tree',
      'same-tree',
      'invert-binary-tree',
      'binary-tree-maximum-path-sum',
      'binary-tree-level-order-traversal',
      'serialize-and-deserialize-binary-tree',
      'subtree-of-another-tree',
      'construct-binary-tree-from-preorder-and-inorder-traversal',
      'validate-binary-search-tree',
      'kth-smallest-element-in-a-bst',
      'lowest-common-ancestor-of-a-binary-search-tree',
      'implement-trie-prefix-tree',
      'design-add-and-search-words-data-structure',
      'word-search-ii'
    )
    ORDER BY CASE title_slug
      WHEN 'maximum-depth-of-binary-tree' THEN 1
      WHEN 'same-tree' THEN 2
      WHEN 'invert-binary-tree' THEN 3
      WHEN 'binary-tree-maximum-path-sum' THEN 4
      WHEN 'binary-tree-level-order-traversal' THEN 5
      WHEN 'serialize-and-deserialize-binary-tree' THEN 6
      WHEN 'subtree-of-another-tree' THEN 7
      WHEN 'construct-binary-tree-from-preorder-and-inorder-traversal' THEN 8
      WHEN 'validate-binary-search-tree' THEN 9
      WHEN 'kth-smallest-element-in-a-bst' THEN 10
      WHEN 'lowest-common-ancestor-of-a-binary-search-tree' THEN 11
      WHEN 'implement-trie-prefix-tree' THEN 12
      WHEN 'design-add-and-search-words-data-structure' THEN 13
      WHEN 'word-search-ii' THEN 14
    END
  )
),

-- Milestone 10: Heap (3 problems)
(
  (SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
  'Heap / Priority Queue',
  'Learn heap operations and priority queue patterns for top-k and streaming problems.',
  10,
  ARRAY['Understand heap properties', 'Master top-k pattern', 'Learn median maintenance', 'Practice priority queue operations'],
  6,
  3,
  2,
  ARRAY(
    SELECT id FROM problems
    WHERE title_slug IN (
      'merge-k-sorted-lists',
      'top-k-frequent-elements',
      'find-median-from-data-stream'
    )
    ORDER BY CASE title_slug
      WHEN 'merge-k-sorted-lists' THEN 1
      WHEN 'top-k-frequent-elements' THEN 2
      WHEN 'find-median-from-data-stream' THEN 3
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
WHERE name = 'blind_75_essentials';

COMMIT;

-- ==========================================
-- DONE! Blind 75 template created with:
-- ✅ 10 milestones (by category)
-- ✅ 76 total problems (note: Blind "75" actually has 76!)
-- ✅ All problems linked via title_slug
-- ==========================================
