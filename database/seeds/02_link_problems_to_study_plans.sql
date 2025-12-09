-- Link actual problems to study plan milestones
-- Run this AFTER 01_problems_seed.sql and study_plan_templates.sql

BEGIN;

-- Helper function to get problem IDs by slugs
CREATE OR REPLACE FUNCTION get_problem_ids(slugs text[])
RETURNS integer[] AS $$
  SELECT ARRAY_AGG(id ORDER BY array_position(slugs, title_slug))
  FROM problems
  WHERE title_slug = ANY(slugs);
$$ LANGUAGE SQL;

-- ===== BLIND 75 ESSENTIALS MILESTONE UPDATES =====

-- Arrays & Hashing
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'two-sum',
  'contains-duplicate',
  'valid-anagram',
  'group-anagrams',
  'top-k-frequent-elements',
  'product-of-array-except-self',
  'longest-consecutive-sequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Arrays & Hashing';

-- Two Pointers
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'valid-palindrome',
  '3sum',
  'container-with-most-water'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Two Pointers';

-- Sliding Window
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'best-time-to-buy-and-sell-stock',
  'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement',
  'minimum-window-substring'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Sliding Window';

-- Binary Search
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'binary-search',
  'search-in-rotated-sorted-array',
  'find-minimum-in-rotated-sorted-array'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Binary Search';

-- Linked Lists
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'reverse-linked-list',
  'merge-two-sorted-lists',
  'linked-list-cycle',
  'reorder-list',
  'remove-nth-node-from-end-of-list',
  'merge-k-sorted-lists'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Linked Lists';

-- Trees
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'invert-binary-tree',
  'maximum-depth-of-binary-tree',
  'same-tree',
  'subtree-of-another-tree',
  'lowest-common-ancestor-of-a-binary-search-tree',
  'binary-tree-level-order-traversal',
  'validate-binary-search-tree',
  'kth-smallest-element-in-a-bst',
  'construct-binary-tree-from-preorder-and-inorder-traversal',
  'binary-tree-maximum-path-sum',
  'serialize-and-deserialize-binary-tree'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Trees';

-- Heaps & Priority Queue
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'merge-k-sorted-lists',
  'top-k-frequent-elements',
  'find-median-from-data-stream'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Heaps & Priority Queue';

-- Dynamic Programming
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'climbing-stairs',
  'house-robber',
  'house-robber-ii',
  'longest-palindromic-substring',
  'palindromic-substrings',
  'decode-ways',
  'coin-change',
  'maximum-product-subarray',
  'word-break',
  'longest-increasing-subsequence',
  'unique-paths',
  'jump-game'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Dynamic Programming';

-- Graphs
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'number-of-islands',
  'clone-graph',
  'pacific-atlantic-water-flow',
  'course-schedule',
  'course-schedule-ii',
  'longest-consecutive-sequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Graphs';

-- Backtracking & Combinations
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'combination-sum',
  'word-search'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Backtracking & Combinations';

-- Bit Manipulation
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'number-of-1-bits',
  'counting-bits',
  'reverse-bits',
  'missing-number',
  'sum-of-two-integers'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials')
  AND title = 'Bit Manipulation';


-- ===== NEETCODE 150 MILESTONE UPDATES =====

-- Arrays & Hashing
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'two-sum',
  'contains-duplicate',
  'valid-anagram',
  'group-anagrams',
  'top-k-frequent-elements',
  'product-of-array-except-self',
  'longest-consecutive-sequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Arrays & Hashing';

-- Two Pointers
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'valid-palindrome',
  '3sum',
  'container-with-most-water'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Two Pointers';

-- Stack
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'valid-parentheses'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Stack';

-- Binary Search
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'binary-search',
  'search-in-rotated-sorted-array',
  'find-minimum-in-rotated-sorted-array'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Binary Search';

-- Sliding Window
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'best-time-to-buy-and-sell-stock',
  'longest-substring-without-repeating-characters',
  'longest-repeating-character-replacement',
  'minimum-window-substring'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Sliding Window';

-- Linked List
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'reverse-linked-list',
  'merge-two-sorted-lists',
  'linked-list-cycle',
  'reorder-list',
  'remove-nth-node-from-end-of-list',
  'merge-k-sorted-lists'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Linked List';

-- Trees
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'invert-binary-tree',
  'maximum-depth-of-binary-tree',
  'same-tree',
  'subtree-of-another-tree',
  'lowest-common-ancestor-of-a-binary-search-tree',
  'binary-tree-level-order-traversal',
  'validate-binary-search-tree',
  'kth-smallest-element-in-a-bst',
  'construct-binary-tree-from-preorder-and-inorder-traversal',
  'binary-tree-maximum-path-sum',
  'serialize-and-deserialize-binary-tree'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Trees';

-- Tries
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'implement-trie-prefix-tree',
  'design-add-and-search-words-data-structure',
  'word-search-ii'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Tries';

-- Heap / Priority Queue
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'merge-k-sorted-lists',
  'top-k-frequent-elements',
  'find-median-from-data-stream'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Heap / Priority Queue';

-- Backtracking
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'combination-sum',
  'word-search',
  'word-search-ii'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Backtracking';

-- Graphs
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'number-of-islands',
  'clone-graph',
  'pacific-atlantic-water-flow',
  'course-schedule',
  'course-schedule-ii'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Graphs';

-- 1-D Dynamic Programming
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'climbing-stairs',
  'house-robber',
  'house-robber-ii',
  'palindromic-substrings',
  'decode-ways',
  'coin-change',
  'maximum-product-subarray',
  'word-break',
  'longest-increasing-subsequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = '1-D Dynamic Programming';

-- 2-D Dynamic Programming
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'longest-palindromic-substring',
  'unique-paths',
  'longest-increasing-subsequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = '2-D Dynamic Programming';

-- Greedy
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'maximum-subarray',
  'jump-game'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Greedy';

-- Intervals
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'insert-interval',
  'merge-intervals',
  'non-overlapping-intervals'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Intervals';

-- Bit Manipulation
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'number-of-1-bits',
  'counting-bits',
  'reverse-bits',
  'missing-number',
  'sum-of-two-integers'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150')
  AND title = 'Bit Manipulation';


-- ===== GRIND 75 WEEK-BY-WEEK UPDATES =====

-- Week 1: Foundation
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'two-sum',
  'valid-parentheses',
  'merge-two-sorted-lists',
  'best-time-to-buy-and-sell-stock',
  'valid-palindrome',
  'invert-binary-tree',
  'valid-anagram',
  'binary-search',
  'linked-list-cycle',
  'lowest-common-ancestor-of-a-binary-search-tree',
  'maximum-depth-of-binary-tree'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75')
  AND title = 'Week 1: Foundation';

-- Week 2: Core Patterns
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'reverse-linked-list',
  'contains-duplicate',
  'maximum-subarray',
  'climbing-stairs'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75')
  AND title = 'Week 2: Core Patterns';

-- Week 3: Trees & Graphs
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'binary-tree-level-order-traversal',
  'validate-binary-search-tree',
  'number-of-islands',
  'clone-graph'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75')
  AND title = 'Week 3: Trees & Graphs';

-- Week 4: Dynamic Programming
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'house-robber',
  'coin-change',
  'word-break',
  'longest-increasing-subsequence'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75')
  AND title = 'Week 4: Dynamic Programming';

-- Week 5: Advanced Topics
UPDATE study_plan_template_milestones
SET problem_ids = get_problem_ids(ARRAY[
  'merge-k-sorted-lists',
  'find-median-from-data-stream',
  'word-search-ii',
  'serialize-and-deserialize-binary-tree'
])
WHERE template_id = (SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75')
  AND title = 'Week 5: Advanced Topics';

-- Clean up helper function
DROP FUNCTION get_problem_ids(text[]);

-- Update problem counts to match actual linked problems
UPDATE study_plan_template_milestones m
SET total_problems = COALESCE(array_length(problem_ids, 1), 0)
WHERE template_id IN (
  SELECT id FROM study_plan_templates
  WHERE display_name IN ('Blind 75 Essentials', 'NeetCode 150', 'Grind 75')
);

COMMIT;

-- Verify the linkage
SELECT
  spt.display_name as template,
  spm.title as milestone,
  spm.milestone_order,
  array_length(spm.problem_ids, 1) as problems_count
FROM study_plan_templates spt
JOIN study_plan_template_milestones spm ON spm.template_id = spt.id
WHERE spt.display_name IN ('Blind 75 Essentials', 'NeetCode 150', 'Grind 75')
ORDER BY spt.display_name, spm.milestone_order;
