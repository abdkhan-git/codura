-- Cleanup and Reseed Study Plan Templates
-- This script safely removes old templates and creates fresh ones

BEGIN;

-- Step 1: Delete all existing template data (cascades to milestones)
DELETE FROM study_plan_templates;

-- Step 2: Insert fresh templates
INSERT INTO study_plan_templates (name, display_name, description, category, difficulty_level, icon, color, estimated_weeks, is_published, is_featured, tags, created_by) VALUES

-- 1. Blind 75 - The Classic
('blind_75_essentials', 'Blind 75 Essentials', 'The legendary 75 LeetCode problems that cover all essential patterns for coding interviews. Originally shared on Blind, this list has helped thousands land FAANG offers.', 'interview_prep', 'intermediate', '🎯', '#10b981', 8, true, true, ARRAY['blind-75', 'essential', 'faang', 'patterns'], NULL),

-- 2. Grind 75
('grind_75', 'Grind 75', 'Updated version of Blind 75 by the original creator. Distilled into 50-75 essential questions spread across a strategic 5-week schedule for optimal learning.', 'interview_prep', 'intermediate', '⚡', '#3b82f6', 5, true, true, ARRAY['grind-75', 'optimized', 'weekly-plan'], NULL),

-- 3. NeetCode 150
('neetcode_150', 'NeetCode 150', 'Comprehensive expansion of Blind 75 with 75 additional problems. Includes detailed video explanations for each problem, covering easy, medium, and hard difficulties.', 'interview_prep', 'intermediate', '📺', '#8b5cf6', 10, true, true, ARRAY['neetcode-150', 'video-explanations', 'comprehensive'], NULL),

-- 4. NeetCode 250 - Advanced
('neetcode_250_complete', 'NeetCode 250 Complete', 'The ultimate NeetCode collection with 250 curated problems covering every important pattern and edge case. Perfect for thorough interview preparation.', 'interview_prep', 'advanced', '🚀', '#ec4899', 16, true, true, ARRAY['neetcode-250', 'advanced', 'complete'], NULL),

-- 5. Grind 169
('grind_169', 'Grind 169', 'Extended Grind list with 169 carefully selected problems. Provides comprehensive coverage of all data structures and algorithms needed for top tech companies.', 'interview_prep', 'advanced', '💪', '#f59e0b', 12, true, true, ARRAY['grind-169', 'extended', 'comprehensive'], NULL),

-- 6. LeetCode Top Interview 150
('leetcode_top_150', 'LeetCode Top 150', 'Official LeetCode curated list of the most frequently asked interview questions. Covers all major topics with balanced difficulty distribution.', 'interview_prep', 'intermediate', '🏆', '#06b6d4', 10, true, true, ARRAY['leetcode-official', 'top-150', 'frequently-asked'], NULL),

-- 7. Grokking Coding Patterns
('grokking_28_patterns', 'Grokking 28 Patterns', 'Master 28 essential coding patterns including Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, and more. Pattern-based approach with 500+ problems.', 'algorithms', 'intermediate', '🧩', '#14b8a6', 14, true, true, ARRAY['patterns', 'grokking', 'comprehensive'], NULL),

-- 8. Data Structures Mastery
('data_structures_deep_dive', 'Data Structures Deep Dive', 'Comprehensive study of all fundamental data structures: Arrays, Linked Lists, Trees, Graphs, Heaps, Hash Tables, and advanced structures like Tries and Segment Trees.', 'data_structures', 'intermediate', '🏗️', '#6366f1', 12, true, true, ARRAY['data-structures', 'fundamentals', 'mastery'], NULL),

-- 9. FAANG 90-Day Bootcamp
('faang_90_day_intensive', 'FAANG 90-Day Intensive', 'Structured 3-month roadmap covering DSA, System Design, and Behavioral prep. Designed for serious candidates targeting FAANG/MANGA companies with weekly milestones.', 'interview_prep', 'advanced', '🎓', '#ef4444', 12, true, true, ARRAY['faang', '90-day', 'bootcamp', 'system-design'], NULL),

-- 10. Dynamic Programming Mastery
('dp_mastery_0_to_hero', 'DP Mastery: 0 to Hero', 'Complete Dynamic Programming journey from basics to advanced. Covers all DP patterns: 0/1 Knapsack, Unbounded Knapsack, LCS, LIS, Palindromes, and state machine DP.', 'algorithms', 'advanced', '🧮', '#a855f7', 8, true, true, ARRAY['dynamic-programming', 'dp', 'advanced-algorithms'], NULL),

-- 11. Graph Algorithms Complete
('graph_theory_algorithms', 'Graph Theory & Algorithms', 'Master graph traversal (BFS/DFS), shortest paths (Dijkstra, Bellman-Ford), MST (Kruskal, Prim), topological sort, and advanced graph algorithms.', 'algorithms', 'advanced', '🕸️', '#84cc16', 6, true, true, ARRAY['graphs', 'graph-theory', 'advanced'], NULL),

-- 12. System Design Primer
('system_design_interview_prep', 'System Design Interview Prep', 'Learn to design scalable systems: Load Balancing, Caching, Database Sharding, CAP Theorem, Microservices, and real-world system design patterns.', 'system_design', 'advanced', '🏛️', '#f97316', 8, true, false, ARRAY['system-design', 'scalability', 'architecture'], NULL),

-- 13. Beginner Fundamentals
('dsa_fundamentals_beginners', 'DSA Fundamentals for Beginners', 'Perfect starting point for beginners. Learn basic data structures, simple algorithms, and problem-solving techniques with easy-to-medium problems.', 'data_structures', 'beginner', '🌱', '#22c55e', 8, true, true, ARRAY['beginner', 'fundamentals', 'basics'], NULL),

-- 14. Google Interview Prep
('google_specific_preparation', 'Google-Specific Preparation', 'Focused preparation for Google interviews with emphasis on algorithms, system design, and behavioral questions. Based on recent Google interview patterns.', 'company_specific', 'advanced', '🔍', '#4285f4', 10, true, false, ARRAY['google', 'company-specific', 'faang'], NULL),

-- 15. String & Array Mastery
('strings_arrays_mastery', 'Strings & Arrays Mastery', 'Deep dive into the most common interview topics. Master string manipulation, array techniques, sliding window, two pointers, and prefix sum patterns.', 'algorithms', 'intermediate', '📝', '#8b5cf6', 6, true, false, ARRAY['strings', 'arrays', 'patterns'], NULL);


-- Step 3: Create milestones for Blind 75
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

-- Blind 75 Milestones
((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Arrays & Hashing',
'Master fundamental array operations and hash table techniques. Learn to solve problems using HashMaps, HashSets, and frequency counting.',
1,
ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting techniques', 'Practice array manipulation'],
12,
9,
6),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Two Pointers',
'Learn the two pointers technique for array and string problems. Essential pattern for optimizing brute force solutions.',
2,
ARRAY['Master left-right pointer technique', 'Learn fast-slow pointer pattern', 'Practice meeting pointers', 'Understand pointer manipulation'],
8,
5,
4),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Sliding Window',
'Master the sliding window pattern for substring and subarray problems. Learn to optimize O(n²) to O(n) solutions.',
3,
ARRAY['Understand fixed-size windows', 'Master variable-size windows', 'Learn window expansion/contraction', 'Practice optimization techniques'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Binary Search',
'Master binary search on sorted arrays and search space reduction. Learn variations and edge cases.',
4,
ARRAY['Perfect binary search implementation', 'Learn search space reduction', 'Master rotated array search', 'Handle edge cases correctly'],
8,
4,
3),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Linked Lists',
'Deep dive into linked list manipulation, reversal, and cycle detection. Essential for system design discussions.',
5,
ARRAY['Master reversal techniques', 'Learn cycle detection (Floyd)', 'Practice merge operations', 'Understand dummy node patterns'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Trees',
'Master binary tree traversal, BST operations, and tree construction. Critical for many interview questions.',
6,
ARRAY['Perfect all traversals (in/pre/post)', 'Master BST properties', 'Learn tree construction', 'Practice recursion patterns'],
14,
11,
7),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Heaps & Priority Queue',
'Learn heap operations and priority queue patterns. Essential for top-k and merge problems.',
7,
ARRAY['Understand heap properties', 'Master top-k pattern', 'Learn k-way merge', 'Practice priority queue operations'],
8,
5,
3),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Dynamic Programming',
'Master DP fundamentals and common patterns. Most challenging but highest ROI topic for interviews.',
8,
ARRAY['Understand memoization vs tabulation', 'Master 1D DP patterns', 'Learn 2D DP techniques', 'Practice state transitions'],
16,
11,
7),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Graphs',
'Master graph traversal (BFS/DFS), shortest paths, and union-find. Essential for system design and algorithms.',
9,
ARRAY['Perfect BFS/DFS implementation', 'Learn union-find pattern', 'Master shortest path algorithms', 'Practice topological sort'],
12,
9,
6),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Backtracking & Combinations',
'Learn backtracking pattern for permutations, combinations, and constraint satisfaction problems.',
10,
ARRAY['Master backtracking template', 'Learn pruning techniques', 'Practice permutation patterns', 'Understand state space trees'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE name = 'blind_75_essentials'),
'Bit Manipulation',
'Master bitwise operations and common bit manipulation tricks. Quick wins for certain problem types.',
11,
ARRAY['Understand bitwise operators', 'Learn common bit tricks', 'Master single number patterns', 'Practice bit counting'],
6,
5,
3);


-- Step 4: Create milestones for Grind 75
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

((SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
'Week 1: Foundation',
'Start with easiest problems to build confidence. Focus on arrays, strings, and basic data structures.',
1,
ARRAY['Build problem-solving confidence', 'Master basic array operations', 'Learn string manipulation', 'Practice basic recursion'],
15,
12,
10),

((SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
'Week 2: Core Patterns',
'Dive into essential patterns: two pointers, sliding window, and hash tables.',
2,
ARRAY['Master two pointers technique', 'Learn sliding window pattern', 'Perfect hash table usage', 'Practice pattern recognition'],
18,
15,
12),

((SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
'Week 3: Trees & Graphs',
'Focus on tree traversal, BST operations, and basic graph algorithms.',
3,
ARRAY['Master tree traversals', 'Learn BFS/DFS on graphs', 'Practice recursion on trees', 'Understand graph representations'],
20,
16,
13),

((SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
'Week 4: Dynamic Programming',
'Introduction to DP with classic problems and patterns.',
4,
ARRAY['Understand DP fundamentals', 'Learn memoization', 'Practice tabulation', 'Identify DP patterns'],
22,
14,
11),

((SELECT id FROM study_plan_templates WHERE name = 'grind_75'),
'Week 5: Advanced Topics',
'Tackle advanced problems: heaps, backtracking, and mixed patterns.',
5,
ARRAY['Master heap operations', 'Learn backtracking', 'Practice mixed patterns', 'Build interview confidence'],
20,
18,
14);

-- Step 5: Mark featured templates
UPDATE study_plan_templates
SET is_featured = true
WHERE name IN ('blind_75_essentials', 'grind_75', 'neetcode_150', 'grokking_28_patterns', 'faang_90_day_intensive');

COMMIT;
