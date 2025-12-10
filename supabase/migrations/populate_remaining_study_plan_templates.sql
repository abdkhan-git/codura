-- =====================================================
-- Populate Remaining Study Plan Templates with Problem Milestones
-- =====================================================
-- This migration populates milestones for templates not fully covered before.
-- It reuses helper functions to map title slugs -> problem IDs.
-- If a template is missing, the block simply skips.

BEGIN;

-- Helper to get problem IDs from slugs (ordered as provided)
CREATE OR REPLACE FUNCTION get_problem_ids_safe(slugs TEXT[])
RETURNS INTEGER[] AS $$
  SELECT COALESCE(ARRAY_AGG(id ORDER BY array_position(slugs, title_slug)), ARRAY[]::INTEGER[])
  FROM problems
  WHERE title_slug = ANY(slugs);
$$ LANGUAGE sql;

-- Helper to create a milestone safely
CREATE OR REPLACE FUNCTION create_milestone_safe(
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
  problem_ids_array := get_problem_ids_safe(p_slugs);
  IF array_length(problem_ids_array, 1) > 0 THEN
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids,
      total_problems, required_problems, estimated_hours, learning_objectives
    ) VALUES (
      p_template_id, p_title, p_description, p_order, problem_ids_array,
      array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)),
      p_hours, p_learning_objectives
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Utility to finalize totals for a template
CREATE OR REPLACE FUNCTION finalize_template_totals(p_template_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE study_plan_templates
  SET
    total_milestones = (
      SELECT COUNT(*) FROM study_plan_template_milestones m WHERE m.template_id = p_template_id
    ),
    total_problems = (
      SELECT COALESCE(SUM(total_problems), 0) FROM study_plan_template_milestones m WHERE m.template_id = p_template_id
    )
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NeetCode 250 Complete
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'neetcode_250_complete';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    -- Split into 8 broad milestones to keep sizes reasonable
    PERFORM create_milestone_safe(v_template_id, 'Arrays & Hashing', 'Core arrays and hashing problems', 1,
      ARRAY['two-sum','contains-duplicate','valid-anagram','group-anagrams','top-k-frequent-elements','product-of-array-except-self','longest-consecutive-sequence','4sum','trapping-rain-water'],
      ARRAY['Master arrays','Master hashing','Sliding window basics'], 14);

    PERFORM create_milestone_safe(v_template_id, 'Two Pointers & Sliding Window', 'Two pointers and windowing', 2,
      ARRAY['valid-palindrome','3sum','container-with-most-water','longest-substring-without-repeating-characters','longest-repeating-character-replacement','minimum-window-substring'],
      ARRAY['Two pointers','Sliding window patterns'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Binary Search', 'Binary search and variants', 3,
      ARRAY['binary-search','search-in-rotated-sorted-array','find-minimum-in-rotated-sorted-array','longest-palindromic-subsequence','edit-distance'],
      ARRAY['Binary search patterns'], 10);

    PERFORM create_milestone_safe(v_template_id, 'Linked Lists & Heaps', 'Lists and heap usage', 4,
      ARRAY['reverse-linked-list','merge-two-sorted-lists','linked-list-cycle','reorder-list','remove-nth-node-from-end-of-list','merge-k-sorted-lists','find-median-from-data-stream'],
      ARRAY['Linked list ops','Heap patterns'], 14);

    PERFORM create_milestone_safe(v_template_id, 'Trees & Tries', 'Tree traversals and tries', 5,
      ARRAY['invert-binary-tree','maximum-depth-of-binary-tree','same-tree','subtree-of-another-tree','lowest-common-ancestor-of-a-binary-search-tree','binary-tree-level-order-traversal','validate-binary-search-tree','kth-smallest-element-in-a-bst','construct-binary-tree-from-preorder-and-inorder-traversal','binary-tree-maximum-path-sum','serialize-and-deserialize-binary-tree','implement-trie-prefix-tree','design-add-and-search-words-data-structure','word-search-ii'],
      ARRAY['Tree traversals','BST ops','Trie basics'], 18);

    PERFORM create_milestone_safe(v_template_id, 'Graphs', 'Core graph algorithms', 6,
      ARRAY['number-of-islands','clone-graph','pacific-atlantic-water-flow','course-schedule','course-schedule-ii','network-delay-time','cheapest-flights-within-k-stops','reconstruct-itinerary'],
      ARRAY['BFS/DFS','Topo sort','Shortest paths'], 16);

    PERFORM create_milestone_safe(v_template_id, 'Dynamic Programming', 'DP fundamentals and advanced', 7,
      ARRAY['climbing-stairs','house-robber','house-robber-ii','palindromic-substrings','decode-ways','coin-change','maximum-product-subarray','word-break','longest-increasing-subsequence','longest-palindromic-substring','unique-paths','maximum-subarray','jump-game','partition-equal-subset-sum','target-sum','interleaving-string','best-time-to-buy-and-sell-stock-ii','best-time-to-buy-and-sell-stock-iii','best-time-to-buy-and-sell-stock-iv','best-time-to-buy-and-sell-stock-with-cooldown','best-time-to-buy-and-sell-stock-with-transaction-fee'],
      ARRAY['1-D DP','2-D DP','Knapsack variants'], 24);

    PERFORM create_milestone_safe(v_template_id, 'Intervals & Misc', 'Intervals, backtracking, bits', 8,
      ARRAY['insert-interval','merge-intervals','non-overlapping-intervals','combination-sum','word-search','number-of-1-bits','counting-bits','reverse-bits','missing-number','sum-of-two-integers'],
      ARRAY['Intervals','Backtracking','Bit manipulation'], 12);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- LeetCode Top 150 (approximate using NeetCode 150 core set)
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'leetcode_top_150';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    -- Reuse core NeetCode 150 set split into 5 milestones
    PERFORM create_milestone_safe(v_template_id, 'Arrays & Hashing', 'Core arrays/hash', 1,
      ARRAY['two-sum','contains-duplicate','valid-anagram','group-anagrams','top-k-frequent-elements','product-of-array-except-self','longest-consecutive-sequence'],
      ARRAY['Arrays','Hash tables'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Two Pointers & Sliding Window', 'Pointers and windows', 2,
      ARRAY['valid-palindrome','3sum','container-with-most-water','best-time-to-buy-and-sell-stock','longest-substring-without-repeating-characters','longest-repeating-character-replacement','minimum-window-substring'],
      ARRAY['Two pointers','Sliding window'], 14);

    PERFORM create_milestone_safe(v_template_id, 'Binary Search & Linked Lists', 'Search and lists', 3,
      ARRAY['binary-search','search-in-rotated-sorted-array','find-minimum-in-rotated-sorted-array','reverse-linked-list','merge-two-sorted-lists','linked-list-cycle','reorder-list','remove-nth-node-from-end-of-list'],
      ARRAY['Binary search','Linked lists'], 14);

    PERFORM create_milestone_safe(v_template_id, 'Trees & Graphs', 'Tree/graph fundamentals', 4,
      ARRAY['invert-binary-tree','maximum-depth-of-binary-tree','same-tree','subtree-of-another-tree','lowest-common-ancestor-of-a-binary-search-tree','binary-tree-level-order-traversal','validate-binary-search-tree','kth-smallest-element-in-a-bst','number-of-islands','clone-graph','course-schedule','course-schedule-ii'],
      ARRAY['Trees','Graphs','Topo sort'], 18);

    PERFORM create_milestone_safe(v_template_id, 'Dynamic Programming & Intervals', 'DP and intervals', 5,
      ARRAY['climbing-stairs','house-robber','house-robber-ii','palindromic-substrings','decode-ways','coin-change','maximum-product-subarray','word-break','longest-increasing-subsequence','unique-paths','maximum-subarray','jump-game','insert-interval','merge-intervals','non-overlapping-intervals'],
      ARRAY['DP patterns','Intervals'], 18);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- Strings & Arrays Mastery
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'strings_arrays_mastery';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Arrays Basics', 'Core array manipulation', 1,
      ARRAY['two-sum','contains-duplicate','product-of-array-except-self','longest-consecutive-sequence','top-k-frequent-elements'],
      ARRAY['Array patterns','Frequency counts'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Sliding Window', 'Window techniques', 2,
      ARRAY['best-time-to-buy-and-sell-stock','longest-substring-without-repeating-characters','longest-repeating-character-replacement','minimum-window-substring'],
      ARRAY['Sliding window'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Two Pointers', 'Two-pointer techniques', 3,
      ARRAY['valid-palindrome','3sum','container-with-most-water'],
      ARRAY['Two pointers'], 10);

    PERFORM create_milestone_safe(v_template_id, 'Strings', 'String-specific problems', 4,
      ARRAY['valid-anagram','group-anagrams','palindromic-substrings','longest-palindromic-substring'],
      ARRAY['String hashing','Palindromes'], 12);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- DSA Fundamentals for Beginners
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'dsa_fundamentals_for_beginners';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Warmup', 'Easy warmup problems', 1,
      ARRAY['two-sum','valid-parentheses','merge-two-sorted-lists','best-time-to-buy-and-sell-stock'],
      ARRAY['Basics','Confidence'], 10);

    PERFORM create_milestone_safe(v_template_id, 'Arrays & Strings', 'Beginner arrays/strings', 2,
      ARRAY['contains-duplicate','valid-anagram','product-of-array-except-self','longest-substring-without-repeating-characters'],
      ARRAY['Arrays','Strings'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Linked Lists & Trees Intro', 'Intro to linked lists/trees', 3,
      ARRAY['reverse-linked-list','linked-list-cycle','invert-binary-tree','maximum-depth-of-binary-tree'],
      ARRAY['Lists','Tree basics'], 12);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- DP Mastery: 0 to Hero
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'dp_mastery_0_to_hero';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'DP Fundamentals', 'Intro DP patterns', 1,
      ARRAY['climbing-stairs','house-robber','house-robber-ii','maximum-subarray','jump-game'],
      ARRAY['1-D DP','State transitions'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Subsequence DP', 'Subsequence-style DP', 2,
      ARRAY['longest-increasing-subsequence','palindromic-substrings','longest-palindromic-substring','longest-common-subsequence'],
      ARRAY['Subsequence DP'], 14);

    PERFORM create_milestone_safe(v_template_id, 'Knapsack & Paths', 'Knapsack-like and grid DP', 3,
      ARRAY['coin-change','partition-equal-subset-sum','target-sum','unique-paths','min-cost-climbing-stairs'],
      ARRAY['Knapsack','Grid DP'], 14);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- Graph Theory & Algorithms
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'graph_theory_algorithms';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Traversal & BFS/DFS', 'Core traversal problems', 1,
      ARRAY['number-of-islands','clone-graph','pacific-atlantic-water-flow'],
      ARRAY['BFS/DFS'], 10);

    PERFORM create_milestone_safe(v_template_id, 'Topological & Dependency', 'Topo sort & prereqs', 2,
      ARRAY['course-schedule','course-schedule-ii','alien-dictionary'],
      ARRAY['Topological sort'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Shortest Paths & MST', 'Paths and spanning trees', 3,
      ARRAY['network-delay-time','cheapest-flights-within-k-stops','min-cost-to-connect-all-points'],
      ARRAY['Shortest paths','MST'], 14);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- Google-Specific Preparation (reuse broad set)
-- =====================================================
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'google_specific_preparation';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Core DSA', 'Google-favorite DSA', 1,
      ARRAY['two-sum','group-anagrams','longest-substring-without-repeating-characters','top-k-frequent-elements','longest-consecutive-sequence'],
      ARRAY['Arrays/Hashing'], 12);

    PERFORM create_milestone_safe(v_template_id, 'Graphs & Trees', 'Graph and tree questions', 2,
      ARRAY['number-of-islands','course-schedule','validate-binary-search-tree','lowest-common-ancestor-of-a-binary-search-tree','serialize-and-deserialize-binary-tree'],
      ARRAY['Graphs','Trees'], 14);

    PERFORM create_milestone_safe(v_template_id, 'DP & Recursion', 'DP-heavy questions', 3,
      ARRAY['coin-change','word-break','longest-increasing-subsequence','decode-ways','jump-game'],
      ARRAY['DP patterns'], 12);

    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- Strings & Arrays already handled; Grokking 28 Patterns & FAANG plans reuse broad sets
-- =====================================================

-- Grokking 28 Patterns (representative subset)
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'grokking_28_patterns';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Sliding Window', 'Pattern: Sliding Window', 1,
      ARRAY['longest-substring-without-repeating-characters','longest-repeating-character-replacement','minimum-window-substring'],
      ARRAY['Sliding window'], 10);
    PERFORM create_milestone_safe(v_template_id, 'Two Pointers', 'Pattern: Two Pointers', 2,
      ARRAY['valid-palindrome','3sum','container-with-most-water'],
      ARRAY['Two pointers'], 10);
    PERFORM create_milestone_safe(v_template_id, 'Fast & Slow Pointers', 'Pattern: Cycle detection', 3,
      ARRAY['linked-list-cycle'],
      ARRAY['Cycle detection'], 6);
    PERFORM create_milestone_safe(v_template_id, 'Intervals', 'Pattern: Intervals', 4,
      ARRAY['merge-intervals','non-overlapping-intervals','insert-interval'],
      ARRAY['Interval merging'], 10);
    PERFORM create_milestone_safe(v_template_id, 'Graph/Topo', 'Pattern: Topological / BFS', 5,
      ARRAY['course-schedule','course-schedule-ii'],
      ARRAY['Topo sort'], 10);
    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- FAANG 90-Day Intensive (reuse rich mixed set)
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'faang_90_day_intensive';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;

    PERFORM create_milestone_safe(v_template_id, 'Weeks 1-3: Arrays/Hashing', 'FAANG prep arrays/hash', 1,
      ARRAY['two-sum','group-anagrams','top-k-frequent-elements','product-of-array-except-self','longest-consecutive-sequence'],
      ARRAY['Arrays/Hashing'], 16);
    PERFORM create_milestone_safe(v_template_id, 'Weeks 4-6: Pointers/Window', 'Pointers/window', 2,
      ARRAY['3sum','container-with-most-water','longest-substring-without-repeating-characters','minimum-window-substring'],
      ARRAY['Pointers/Window'], 16);
    PERFORM create_milestone_safe(v_template_id, 'Weeks 7-9: Trees/Graphs', 'Trees and graphs', 3,
      ARRAY['validate-binary-search-tree','lowest-common-ancestor-of-a-binary-search-tree','binary-tree-level-order-traversal','number-of-islands','course-schedule'],
      ARRAY['Trees/Graphs'], 18);
    PERFORM create_milestone_safe(v_template_id, 'Weeks 10-12: DP/Intervals', 'DP and intervals', 4,
      ARRAY['coin-change','word-break','longest-increasing-subsequence','jump-game','merge-intervals','non-overlapping-intervals'],
      ARRAY['DP','Intervals'], 18);
    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- FAANG Interview Prep - 75 Essential Problems (reuse Blind 75 core)
DO $$
DECLARE v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'faang_interview_prep_75_essential_problems';
  IF v_template_id IS NOT NULL THEN
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    -- Use Blind 75 structure
    PERFORM create_milestone_safe(v_template_id, 'Arrays & Hashing', 'Core arrays/hash', 1,
      ARRAY['two-sum','contains-duplicate','valid-anagram','group-anagrams','top-k-frequent-elements','product-of-array-except-self','longest-consecutive-sequence'],
      ARRAY['Arrays/Hashing'], 12);
    PERFORM create_milestone_safe(v_template_id, 'Two Pointers', 'Two pointers', 2,
      ARRAY['valid-palindrome','3sum','container-with-most-water'],
      ARRAY['Two pointers'], 10);
    PERFORM create_milestone_safe(v_template_id, 'Sliding Window', 'Sliding window', 3,
      ARRAY['best-time-to-buy-and-sell-stock','longest-substring-without-repeating-characters','longest-repeating-character-replacement','minimum-window-substring'],
      ARRAY['Windowing'], 12);
    PERFORM create_milestone_safe(v_template_id, 'Trees & Graphs', 'Trees/graphs', 4,
      ARRAY['invert-binary-tree','validate-binary-search-tree','kth-smallest-element-in-a-bst','number-of-islands','course-schedule'],
      ARRAY['Trees/Graphs'], 14);
    PERFORM create_milestone_safe(v_template_id, 'DP & Intervals', 'DP/Intervals', 5,
      ARRAY['climbing-stairs','house-robber','coin-change','longest-increasing-subsequence','jump-game','merge-intervals'],
      ARRAY['DP','Intervals'], 14);
    PERFORM finalize_template_totals(v_template_id);
  END IF;
END $$;

-- =====================================================
-- Cleanup helper functions
-- =====================================================
DROP FUNCTION IF EXISTS finalize_template_totals(UUID);
DROP FUNCTION IF EXISTS create_milestone_safe(UUID, TEXT, TEXT, INTEGER, TEXT[], TEXT[], INTEGER);
DROP FUNCTION IF EXISTS get_problem_ids_safe(TEXT[]);

COMMIT;

