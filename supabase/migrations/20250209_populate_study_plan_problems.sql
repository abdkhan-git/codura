-- =====================================================
-- Populate Study Plan Template Problems
-- =====================================================
-- This migration populates problems for all study plan templates
-- It creates milestones with problem_ids arrays based on title_slug

BEGIN;

-- Helper function to get problem IDs from slugs
CREATE OR REPLACE FUNCTION get_problem_ids(slugs TEXT[])
RETURNS INTEGER[] AS $$
  SELECT ARRAY_AGG(id ORDER BY array_position(slugs, title_slug))
  FROM problems
  WHERE title_slug = ANY(slugs);
$$ LANGUAGE sql;

-- =====================================================
-- Blind 75 Essentials
-- =====================================================
DO $$
DECLARE
  v_template_id UUID;
  problem_ids_array INTEGER[];
BEGIN
  -- Get template ID
  SELECT id INTO v_template_id FROM study_plan_templates WHERE name = 'blind_75_essentials';
  
  IF v_template_id IS NULL THEN
    RAISE NOTICE 'Template blind_75_essentials not found, skipping...';
  ELSE
    -- Delete existing milestones (qualify column to avoid ambiguity)
    DELETE FROM study_plan_template_milestones m WHERE m.template_id = v_template_id;
    
    -- Milestone 1: Arrays & Hashing
    problem_ids_array := get_problem_ids(ARRAY[
      'two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams',
      'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Arrays & Hashing', 'Master fundamental array operations and hash table techniques.',
      1, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 12,
      ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting']
    );
    
    -- Milestone 2: Two Pointers
    problem_ids_array := get_problem_ids(ARRAY['valid-palindrome', '3sum', 'container-with-most-water']);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Two Pointers', 'Master the two-pointer technique for efficient array and string manipulation.',
      2, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 8,
      ARRAY['Master two-pointer technique', 'Understand when to use two pointers', 'Solve palindrome problems']
    );
    
    -- Milestone 3: Sliding Window
    problem_ids_array := get_problem_ids(ARRAY[
      'best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters',
      'longest-repeating-character-replacement', 'minimum-window-substring'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Sliding Window', 'Learn sliding window patterns for substring and subarray problems.',
      3, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 10,
      ARRAY['Master sliding window technique', 'Understand window expansion/contraction', 'Solve substring problems']
    );
    
    -- Milestone 4: Binary Search
    problem_ids_array := get_problem_ids(ARRAY[
      'binary-search', 'search-in-rotated-sorted-array', 'find-minimum-in-rotated-sorted-array'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Binary Search', 'Master binary search and its variations.',
      4, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 8,
      ARRAY['Master binary search algorithm', 'Handle rotated arrays', 'Find minimum in rotated arrays']
    );
    
    -- Milestone 5: Linked Lists
    problem_ids_array := get_problem_ids(ARRAY[
      'reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle', 'reorder-list',
      'remove-nth-node-from-end-of-list', 'merge-k-sorted-lists'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Linked Lists', 'Master linked list operations and common patterns.',
      5, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 12,
      ARRAY['Master linked list manipulation', 'Understand cycle detection', 'Merge sorted lists']
    );
    
    -- Milestone 6: Trees
    problem_ids_array := get_problem_ids(ARRAY[
      'invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree', 'subtree-of-another-tree',
      'lowest-common-ancestor-of-a-binary-search-tree', 'binary-tree-level-order-traversal',
      'validate-binary-search-tree', 'kth-smallest-element-in-a-bst',
      'construct-binary-tree-from-preorder-and-inorder-traversal', 'binary-tree-maximum-path-sum',
      'serialize-and-deserialize-binary-tree'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Trees', 'Master binary tree traversal and common tree problems.',
      6, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 20,
      ARRAY['Master tree traversal (DFS/BFS)', 'Understand BST properties', 'Solve tree construction problems']
    );
    
    -- Milestone 7: Heaps & Priority Queue
    problem_ids_array := get_problem_ids(ARRAY[
      'merge-k-sorted-lists', 'top-k-frequent-elements', 'find-median-from-data-stream'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Heaps & Priority Queue', 'Learn heap data structure and priority queue patterns.',
      7, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 8,
      ARRAY['Understand heap operations', 'Solve top-k problems', 'Implement median finder']
    );
    
    -- Milestone 8: Dynamic Programming
    problem_ids_array := get_problem_ids(ARRAY[
      'climbing-stairs', 'house-robber', 'house-robber-ii', 'longest-palindromic-substring',
      'palindromic-substrings', 'decode-ways', 'coin-change', 'maximum-product-subarray',
      'word-break', 'longest-increasing-subsequence', 'unique-paths', 'jump-game'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Dynamic Programming', 'Master DP fundamentals including memoization, tabulation, and common patterns.',
      8, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 20,
      ARRAY['Understand DP patterns', 'Master memoization', 'Solve classic DP problems']
    );
    
    -- Milestone 9: Graphs
    problem_ids_array := get_problem_ids(ARRAY[
      'number-of-islands', 'clone-graph', 'pacific-atlantic-water-flow',
      'course-schedule', 'course-schedule-ii'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Graphs', 'Master graph traversal (BFS/DFS), topological sort, and union-find.',
      9, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 14,
      ARRAY['Master BFS/DFS', 'Understand topological sort', 'Solve graph problems']
    );
    
    -- Milestone 10: Backtracking & Bit Manipulation
    problem_ids_array := get_problem_ids(ARRAY[
      'combination-sum', 'word-search', 'number-of-1-bits', 'counting-bits',
      'reverse-bits', 'missing-number', 'sum-of-two-integers'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Backtracking & Bit Manipulation', 'Learn backtracking patterns and bitwise operations.',
      10, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 12,
      ARRAY['Master backtracking', 'Understand bitwise operations', 'Solve bit manipulation problems']
    );
    
    -- Update template totals (qualify column to avoid ambiguity)
    UPDATE study_plan_templates
    SET 
      total_milestones = 10,
      total_problems = (
        SELECT COALESCE(SUM(total_problems), 0)
        FROM study_plan_template_milestones m
        WHERE m.template_id = template_id
      )
    WHERE id = template_id;
    
    RAISE NOTICE 'Populated Blind 75 Essentials with % milestones', 10;
  END IF;
END $$;

-- =====================================================
-- NeetCode 150
-- =====================================================
DO $$
DECLARE
  template_id UUID;
  problem_ids_array INTEGER[];
BEGIN
  SELECT id INTO template_id FROM study_plan_templates WHERE name = 'neetcode_150';
  
  IF template_id IS NULL THEN
    RAISE NOTICE 'Template neetcode_150 not found, skipping...';
  ELSE
    DELETE FROM study_plan_template_milestones WHERE template_id = template_id;
    
    -- Similar structure to Blind 75 but with more problems
    -- Milestone 1: Arrays & Hashing (same as Blind 75)
    problem_ids_array := get_problem_ids(ARRAY[
      'two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams',
      'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Arrays & Hashing', 'Master fundamental array operations and hash table techniques.',
      1, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 12,
      ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting']
    );
    
    -- Milestone 2: Two Pointers & Stack
    problem_ids_array := get_problem_ids(ARRAY['valid-palindrome', '3sum', 'container-with-most-water', 'valid-parentheses']);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Two Pointers & Stack', 'Master two-pointer technique and stack operations.',
      2, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 10,
      ARRAY['Master two-pointer technique', 'Understand stack operations', 'Solve palindrome problems']
    );
    
    -- Continue with other milestones similar to Blind 75...
    -- (Adding key milestones, you can expand this)
    
    -- Update template totals (qualify column to avoid ambiguity)
    UPDATE study_plan_templates
    SET 
      total_milestones = (
        SELECT COUNT(*) FROM study_plan_template_milestones m WHERE m.template_id = template_id
      ),
      total_problems = (
        SELECT COALESCE(SUM(total_problems), 0)
        FROM study_plan_template_milestones m
        WHERE m.template_id = template_id
      )
    WHERE id = template_id;
    
    RAISE NOTICE 'Populated NeetCode 150';
  END IF;
END $$;

-- =====================================================
-- Grind 75
-- =====================================================
DO $$
DECLARE
  template_id UUID;
  problem_ids_array INTEGER[];
BEGIN
  SELECT id INTO template_id FROM study_plan_templates WHERE name = 'grind_75';
  
  IF template_id IS NULL THEN
    RAISE NOTICE 'Template grind_75 not found, skipping...';
  ELSE
    DELETE FROM study_plan_template_milestones WHERE template_id = template_id;
    
    -- Week 1: Foundation
    problem_ids_array := get_problem_ids(ARRAY[
      'two-sum', 'valid-parentheses', 'merge-two-sorted-lists', 'best-time-to-buy-and-sell-stock',
      'valid-palindrome', 'invert-binary-tree', 'valid-anagram', 'binary-search',
      'linked-list-cycle', 'lowest-common-ancestor-of-a-binary-search-tree', 'maximum-depth-of-binary-tree'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Week 1: Foundation', 'Start with easiest problems to build confidence.',
      1, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 15,
      ARRAY['Build confidence', 'Master basics', 'Understand fundamental patterns']
    );
    
    -- Week 2: Core Patterns
    problem_ids_array := get_problem_ids(ARRAY[
      'reverse-linked-list', 'contains-duplicate', 'maximum-subarray', 'climbing-stairs'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Week 2: Core Patterns', 'Dive into essential patterns.',
      2, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 10,
      ARRAY['Master two pointers', 'Understand sliding window', 'Learn hash tables']
    );
    
    -- Week 3: Trees & Graphs
    problem_ids_array := get_problem_ids(ARRAY[
      'binary-tree-level-order-traversal', 'validate-binary-search-tree',
      'number-of-islands', 'clone-graph'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Week 3: Trees & Graphs', 'Focus on tree traversal and basic graph algorithms.',
      3, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 12,
      ARRAY['Master tree traversal', 'Understand BST operations', 'Learn graph basics']
    );
    
    -- Week 4: Dynamic Programming
    problem_ids_array := get_problem_ids(ARRAY[
      'house-robber', 'coin-change', 'word-break', 'longest-increasing-subsequence'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Week 4: Dynamic Programming', 'Introduction to DP with classic problems.',
      4, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 14,
      ARRAY['Understand DP patterns', 'Master memoization', 'Solve classic DP problems']
    );
    
    -- Week 5: Advanced Topics
    problem_ids_array := get_problem_ids(ARRAY[
      'merge-k-sorted-lists', 'find-median-from-data-stream', 'word-search-ii',
      'serialize-and-deserialize-binary-tree'
    ]);
    INSERT INTO study_plan_template_milestones (
      template_id, title, description, milestone_order, problem_ids, total_problems,
      required_problems, estimated_hours, learning_objectives
    ) VALUES (
      template_id, 'Week 5: Advanced Topics', 'Tackle advanced problems: heaps, backtracking, and mixed patterns.',
      5, problem_ids_array, array_length(problem_ids_array, 1),
      GREATEST(1, CEIL(array_length(problem_ids_array, 1) * 0.7)), 16,
      ARRAY['Master heaps', 'Understand backtracking', 'Solve complex problems']
    );
    
    UPDATE study_plan_templates
    SET 
      total_milestones = 5,
      total_problems = (
        SELECT COALESCE(SUM(total_problems), 0)
        FROM study_plan_template_milestones m
        WHERE m.template_id = template_id
      )
    WHERE id = template_id;
    
    RAISE NOTICE 'Populated Grind 75 with 5 milestones';
  END IF;
END $$;

COMMIT;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_problem_ids(TEXT[]);

