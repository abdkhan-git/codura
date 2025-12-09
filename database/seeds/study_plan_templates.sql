-- Study Plan Templates Seed Data
-- Based on top curated DSA lists: Blind 75, NeetCode 150/250, Grind 75/169, Grokking, etc.

-- Insert Study Plan Templates
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


-- Now create milestones for each template (example for Blind 75)
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

-- Blind 75 Milestones
((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Arrays & Hashing',
'Master fundamental array operations and hash table techniques. Learn to solve problems using HashMaps, HashSets, and frequency counting.',
1,
ARRAY['Understand hash table time complexity', 'Master two-sum pattern', 'Learn frequency counting techniques', 'Practice array manipulation'],
12,
9,
6),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Two Pointers',
'Learn the two pointers technique for array and string problems. Essential pattern for optimizing brute force solutions.',
2,
ARRAY['Master left-right pointer technique', 'Learn fast-slow pointer pattern', 'Practice meeting pointers', 'Understand pointer manipulation'],
8,
5,
4),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Sliding Window',
'Master the sliding window pattern for substring and subarray problems. Learn to optimize O(n²) to O(n) solutions.',
3,
ARRAY['Understand fixed-size windows', 'Master variable-size windows', 'Learn window expansion/contraction', 'Practice optimization techniques'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Binary Search',
'Master binary search on sorted arrays and search space reduction. Learn variations and edge cases.',
4,
ARRAY['Perfect binary search implementation', 'Learn search space reduction', 'Master rotated array search', 'Handle edge cases correctly'],
8,
4,
3),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Linked Lists',
'Deep dive into linked list manipulation, reversal, and cycle detection. Essential for system design discussions.',
5,
ARRAY['Master reversal techniques', 'Learn cycle detection (Floyd)', 'Practice merge operations', 'Understand dummy node patterns'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Trees',
'Master binary tree traversal, BST operations, and tree construction. Critical for many interview questions.',
6,
ARRAY['Perfect all traversals (in/pre/post)', 'Master BST properties', 'Learn tree construction', 'Practice recursion patterns'],
14,
11,
7),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Heaps & Priority Queue',
'Learn heap operations and priority queue patterns. Essential for top-k and merge problems.',
7,
ARRAY['Understand heap properties', 'Master top-k pattern', 'Learn k-way merge', 'Practice priority queue operations'],
8,
5,
3),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Dynamic Programming',
'Master DP fundamentals and common patterns. Most challenging but highest ROI topic for interviews.',
8,
ARRAY['Understand memoization vs tabulation', 'Master 1D DP patterns', 'Learn 2D DP techniques', 'Practice state transitions'],
16,
11,
7),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Graphs',
'Master graph traversal (BFS/DFS), shortest paths, and union-find. Essential for system design and algorithms.',
9,
ARRAY['Perfect BFS/DFS implementation', 'Learn union-find pattern', 'Master shortest path algorithms', 'Practice topological sort'],
12,
9,
6),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Backtracking & Combinations',
'Learn backtracking pattern for permutations, combinations, and constraint satisfaction problems.',
10,
ARRAY['Master backtracking template', 'Learn pruning techniques', 'Practice permutation patterns', 'Understand state space trees'],
10,
6,
4),

((SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
'Bit Manipulation',
'Master bitwise operations and common bit manipulation tricks. Quick wins for certain problem types.',
11,
ARRAY['Understand bitwise operators', 'Learn common bit tricks', 'Master single number patterns', 'Practice bit counting'],
6,
5,
3);


-- Grind 75 Milestones (5-week structured plan)
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

((SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75'),
'Week 1: Foundation',
'Start with easiest problems to build confidence. Focus on arrays, strings, and basic data structures.',
1,
ARRAY['Build problem-solving confidence', 'Master basic array operations', 'Learn string manipulation', 'Practice basic recursion'],
15,
12,
10),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75'),
'Week 2: Core Patterns',
'Dive into essential patterns: two pointers, sliding window, and hash tables.',
2,
ARRAY['Master two pointers technique', 'Learn sliding window pattern', 'Perfect hash table usage', 'Practice pattern recognition'],
18,
15,
12),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75'),
'Week 3: Trees & Graphs',
'Focus on tree traversal, BST operations, and basic graph algorithms.',
3,
ARRAY['Master tree traversals', 'Learn BFS/DFS on graphs', 'Practice recursion on trees', 'Understand graph representations'],
20,
16,
13),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75'),
'Week 4: Dynamic Programming',
'Introduction to DP with classic problems and patterns.',
4,
ARRAY['Understand DP fundamentals', 'Learn memoization', 'Practice tabulation', 'Identify DP patterns'],
22,
14,
11),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grind 75'),
'Week 5: Advanced Topics',
'Tackle advanced problems: heaps, backtracking, and mixed patterns.',
5,
ARRAY['Master heap operations', 'Learn backtracking', 'Practice mixed patterns', 'Build interview confidence'],
20,
18,
14);


-- NeetCode 150 Milestones (more comprehensive)
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Arrays & Hashing',
'Comprehensive array and hashing problems with video explanations. All difficulty levels.',
1,
ARRAY['Master all hash table patterns', 'Learn array manipulation techniques', 'Practice optimization', 'Watch video explanations'],
15,
13,
9),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Two Pointers',
'Complete two pointers pattern coverage with easy to hard problems.',
2,
ARRAY['Master pointer manipulation', 'Learn all pointer patterns', 'Practice edge cases', 'Understand optimization'],
10,
7,
5),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Stack',
'Deep dive into stack data structure and its applications.',
3,
ARRAY['Master stack operations', 'Learn monotonic stack', 'Practice expression parsing', 'Understand stack applications'],
10,
8,
6),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Binary Search',
'Complete binary search pattern including variations and edge cases.',
4,
ARRAY['Perfect binary search', 'Master search variations', 'Learn search space reduction', 'Handle all edge cases'],
12,
9,
6),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Sliding Window',
'Comprehensive sliding window problems from easy to hard.',
5,
ARRAY['Master window patterns', 'Learn optimization', 'Practice variable windows', 'Understand time complexity'],
12,
8,
6),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Linked List',
'Complete linked list manipulation with all patterns.',
6,
ARRAY['Master all reversal patterns', 'Learn cycle detection', 'Practice merge operations', 'Understand advanced techniques'],
14,
10,
7),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Trees',
'Comprehensive tree problems covering all types and patterns.',
7,
ARRAY['Perfect all traversals', 'Master BST operations', 'Learn tree construction', 'Practice advanced recursion'],
18,
15,
10),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Tries',
'Master trie data structure and string search applications.',
8,
ARRAY['Understand trie structure', 'Learn trie implementation', 'Practice prefix matching', 'Master autocomplete patterns'],
8,
5,
3),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Heap / Priority Queue',
'Complete heap and priority queue patterns.',
9,
ARRAY['Master heap operations', 'Learn top-k patterns', 'Practice merge patterns', 'Understand heap applications'],
12,
8,
5),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Backtracking',
'Comprehensive backtracking problems and patterns.',
10,
ARRAY['Master backtracking template', 'Learn pruning', 'Practice all patterns', 'Understand complexity analysis'],
14,
10,
7),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Graphs',
'Complete graph algorithms and patterns.',
11,
ARRAY['Perfect BFS/DFS', 'Master shortest paths', 'Learn union-find', 'Practice topological sort'],
16,
13,
9),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Advanced Graphs',
'Advanced graph algorithms and optimizations.',
12,
ARRAY['Master Dijkstra', 'Learn Bellman-Ford', 'Practice MST algorithms', 'Understand graph optimization'],
12,
8,
5),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'1-D Dynamic Programming',
'Master 1D DP patterns and techniques.',
13,
ARRAY['Understand DP fundamentals', 'Master 1D patterns', 'Learn optimization', 'Practice state transitions'],
14,
12,
8),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'2-D Dynamic Programming',
'Master 2D DP patterns and advanced techniques.',
14,
ARRAY['Master 2D DP patterns', 'Learn grid problems', 'Practice optimization', 'Understand complex states'],
16,
13,
9),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Greedy',
'Master greedy algorithms and proof techniques.',
15,
ARRAY['Understand greedy approach', 'Learn proof techniques', 'Practice pattern recognition', 'Master optimization'],
10,
7,
5),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Intervals',
'Master interval manipulation and merge patterns.',
16,
ARRAY['Master merge intervals', 'Learn overlap detection', 'Practice scheduling problems', 'Understand time complexity'],
8,
6,
4),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Math & Geometry',
'Mathematical problems and geometric algorithms.',
17,
ARRAY['Master common formulas', 'Learn geometric algorithms', 'Practice number theory', 'Understand edge cases'],
10,
8,
5),

((SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
'Bit Manipulation',
'Complete bit manipulation patterns and tricks.',
18,
ARRAY['Master bitwise operators', 'Learn bit tricks', 'Practice optimization', 'Understand applications'],
8,
7,
5);


-- Grokking Patterns Milestones
INSERT INTO study_plan_template_milestones (template_id, title, description, milestone_order, learning_objectives, estimated_hours, total_problems, required_problems) VALUES

((SELECT id FROM study_plan_templates WHERE display_name = 'Grokking 28 Patterns'),
'Pattern 1-5: Foundation Patterns',
'Master Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, Cyclic Sort.',
1,
ARRAY['Perfect sliding window', 'Master two pointers', 'Learn Floyd cycle detection', 'Practice interval problems', 'Understand cyclic sort'],
20,
40,
25),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grokking 28 Patterns'),
'Pattern 6-10: Search & Sort',
'In-place Reversal, Tree BFS, Tree DFS, Two Heaps, Subsets.',
2,
ARRAY['Master linked list reversal', 'Perfect tree traversals', 'Learn heap patterns', 'Practice subset generation'],
22,
45,
30),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grokking 28 Patterns'),
'Pattern 11-15: Advanced Search',
'Modified Binary Search, Bitwise XOR, Top K Elements, K-way Merge, Knapsack.',
3,
ARRAY['Master binary search variations', 'Learn XOR tricks', 'Perfect top-k patterns', 'Understand DP knapsack'],
24,
50,
35),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grokking 28 Patterns'),
'Pattern 16-20: Graph & DP',
'Topological Sort, Multi-source BFS, Backtracking, Monotonic Stack, Trie.',
4,
ARRAY['Master graph algorithms', 'Learn backtracking', 'Perfect stack patterns', 'Understand trie operations'],
26,
55,
38),

((SELECT id FROM study_plan_templates WHERE display_name = 'Grokking 28 Patterns'),
'Pattern 21-28: Advanced Patterns',
'Union Find, Ordered Set, Merge Sort, Divide & Conquer, and more advanced patterns.',
5,
ARRAY['Master union-find', 'Learn divide & conquer', 'Perfect merge sort', 'Practice complex patterns'],
28,
60,
40);

-- Metadata is already set to defaults in the table schema

-- Mark some as featured
UPDATE study_plan_templates
SET is_featured = true
WHERE display_name IN ('Blind 75 Essentials', 'Grind 75', 'NeetCode 150', 'Grokking 28 Patterns', 'FAANG 90-Day Intensive');

COMMIT;
