-- Complete Problems Database Seed
-- Based on Blind 75, NeetCode 150, Grind 75
-- Simplified to match actual schema

BEGIN;

-- Clear existing problems from seed (optional - only if you want to start fresh)
-- DELETE FROM problems WHERE leetcode_id IN (1,217,242,49,347,238,128,125,15,11,121,3,424,76,20,704,33,153,206,21,141,143,19,23,226,104,100,572,235,102,98,230,105,124,297,208,211,212,295,39,79,200,133,417,207,210,70,198,213,5,647,91,322,152,139,300,62,55,53,57,56,435,191,338,190,268,371);

-- Insert all problems (ignore duplicates)
INSERT INTO problems (
  title, title_slug, difficulty, description,
  leetcode_id, topic_tags, acceptance_rate
) VALUES

-- ===== ARRAYS & HASHING =====
('Two Sum', 'two-sum', 'Easy',
'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.',
1, '["Array", "Hash Table"]'::jsonb, 49.1),

('Contains Duplicate', 'contains-duplicate', 'Easy',
'Given an integer array nums, return true if any value appears at least twice.',
217, '["Array", "Hash Table", "Sorting"]'::jsonb, 60.8),

('Valid Anagram', 'valid-anagram', 'Easy',
'Given two strings s and t, return true if t is an anagram of s.',
242, '["Hash Table", "String", "Sorting"]'::jsonb, 62.5),

('Group Anagrams', 'group-anagrams', 'Medium',
'Given an array of strings, group the anagrams together.',
49, '["Array", "Hash Table", "String", "Sorting"]'::jsonb, 65.9),

('Top K Frequent Elements', 'top-k-frequent-elements', 'Medium',
'Given an integer array nums and an integer k, return the k most frequent elements.',
347, '["Array", "Hash Table", "Heap", "Bucket Sort"]'::jsonb, 63.4),

('Product of Array Except Self', 'product-of-array-except-self', 'Medium',
'Return an array answer such that answer[i] is equal to the product of all elements except nums[i].',
238, '["Array", "Prefix Sum"]'::jsonb, 64.2),

('Longest Consecutive Sequence', 'longest-consecutive-sequence', 'Medium',
'Given an unsorted array of integers, find the length of the longest consecutive elements sequence.',
128, '["Array", "Hash Table", "Union Find"]'::jsonb, 47.3),

-- ===== TWO POINTERS =====
('Valid Palindrome', 'valid-palindrome', 'Easy',
'Given a string s, return true if it is a palindrome.',
125, '["Two Pointers", "String"]'::jsonb, 43.8),

('3Sum', '3sum', 'Medium',
'Given an integer array nums, return all unique triplets that sum to zero.',
15, '["Array", "Two Pointers", "Sorting"]'::jsonb, 32.4),

('Container With Most Water', 'container-with-most-water', 'Medium',
'Find two lines that together with the x-axis form a container that holds the most water.',
11, '["Array", "Two Pointers", "Greedy"]'::jsonb, 54.1),

-- ===== SLIDING WINDOW =====
('Best Time to Buy and Sell Stock', 'best-time-to-buy-and-sell-stock', 'Easy',
'Find the maximum profit by choosing a single day to buy and another to sell.',
121, '["Array", "Dynamic Programming"]'::jsonb, 54.2),

('Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters', 'Medium',
'Find the length of the longest substring without repeating characters.',
3, '["Hash Table", "String", "Sliding Window"]'::jsonb, 33.8),

('Longest Repeating Character Replacement', 'longest-repeating-character-replacement', 'Medium',
'Find the length of the longest substring containing the same letter after at most k changes.',
424, '["Hash Table", "String", "Sliding Window"]'::jsonb, 52.1),

('Minimum Window Substring', 'minimum-window-substring', 'Hard',
'Find the minimum window substring of s that contains all characters of t.',
76, '["Hash Table", "String", "Sliding Window"]'::jsonb, 39.7),

-- ===== STACK =====
('Valid Parentheses', 'valid-parentheses', 'Easy',
'Determine if the input string of brackets is valid.',
20, '["String", "Stack"]'::jsonb, 40.2),

-- ===== BINARY SEARCH =====
('Binary Search', 'binary-search', 'Easy',
'Given a sorted array and target value, return the index or -1 if not found.',
704, '["Array", "Binary Search"]'::jsonb, 55.3),

('Search in Rotated Sorted Array', 'search-in-rotated-sorted-array', 'Medium',
'Search for a target value in a rotated sorted array.',
33, '["Array", "Binary Search"]'::jsonb, 38.9),

('Find Minimum in Rotated Sorted Array', 'find-minimum-in-rotated-sorted-array', 'Medium',
'Find the minimum element in a rotated sorted array.',
153, '["Array", "Binary Search"]'::jsonb, 49.2),

-- ===== LINKED LIST =====
('Reverse Linked List', 'reverse-linked-list', 'Easy',
'Reverse a singly linked list.',
206, '["Linked List", "Recursion"]'::jsonb, 72.1),

('Merge Two Sorted Lists', 'merge-two-sorted-lists', 'Easy',
'Merge two sorted linked lists into one sorted list.',
21, '["Linked List", "Recursion"]'::jsonb, 61.5),

('Linked List Cycle', 'linked-list-cycle', 'Easy',
'Determine if a linked list has a cycle.',
141, '["Hash Table", "Linked List", "Two Pointers"]'::jsonb, 47.1),

('Reorder List', 'reorder-list', 'Medium',
'Reorder list nodes in L0→Ln→L1→Ln-1→L2→Ln-2→… pattern.',
143, '["Linked List", "Two Pointers", "Stack"]'::jsonb, 51.3),

('Remove Nth Node From End of List', 'remove-nth-node-from-end-of-list', 'Medium',
'Remove the nth node from the end of a linked list.',
19, '["Linked List", "Two Pointers"]'::jsonb, 40.5),

('Merge K Sorted Lists', 'merge-k-sorted-lists', 'Hard',
'Merge k sorted linked lists into one sorted list.',
23, '["Linked List", "Divide and Conquer", "Heap", "Merge Sort"]'::jsonb, 48.7),

-- ===== TREES =====
('Invert Binary Tree', 'invert-binary-tree', 'Easy',
'Invert a binary tree (swap left and right children).',
226, '["Tree", "Depth-First Search", "Breadth-First Search"]'::jsonb, 73.5),

('Maximum Depth of Binary Tree', 'maximum-depth-of-binary-tree', 'Easy',
'Find the maximum depth of a binary tree.',
104, '["Tree", "Depth-First Search", "Breadth-First Search"]'::jsonb, 72.8),

('Same Tree', 'same-tree', 'Easy',
'Determine if two binary trees are identical.',
100, '["Tree", "Depth-First Search", "Breadth-First Search"]'::jsonb, 57.2),

('Subtree of Another Tree', 'subtree-of-another-tree', 'Easy',
'Check if subRoot is a subtree of root.',
572, '["Tree", "Depth-First Search", "String Matching"]'::jsonb, 46.8),

('Lowest Common Ancestor of a Binary Search Tree', 'lowest-common-ancestor-of-a-binary-search-tree', 'Medium',
'Find the lowest common ancestor of two nodes in a BST.',
235, '["Tree", "Depth-First Search", "Binary Search Tree"]'::jsonb, 62.1),

('Binary Tree Level Order Traversal', 'binary-tree-level-order-traversal', 'Medium',
'Return the level order traversal of a binary tree.',
102, '["Tree", "Breadth-First Search"]'::jsonb, 62.3),

('Validate Binary Search Tree', 'validate-binary-search-tree', 'Medium',
'Determine if a binary tree is a valid BST.',
98, '["Tree", "Depth-First Search", "Binary Search Tree"]'::jsonb, 31.6),

('Kth Smallest Element in a BST', 'kth-smallest-element-in-a-bst', 'Medium',
'Find the kth smallest element in a BST.',
230, '["Tree", "Depth-First Search", "Binary Search Tree"]'::jsonb, 68.5),

('Construct Binary Tree from Preorder and Inorder Traversal', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'Medium',
'Build a binary tree from preorder and inorder traversals.',
105, '["Array", "Hash Table", "Divide and Conquer", "Tree"]'::jsonb, 59.5),

('Binary Tree Maximum Path Sum', 'binary-tree-maximum-path-sum', 'Hard',
'Find the maximum path sum in a binary tree.',
124, '["Dynamic Programming", "Tree", "Depth-First Search"]'::jsonb, 37.9),

('Serialize and Deserialize Binary Tree', 'serialize-and-deserialize-binary-tree', 'Hard',
'Design an algorithm to serialize and deserialize a binary tree.',
297, '["String", "Tree", "Depth-First Search", "Breadth-First Search", "Design"]'::jsonb, 54.2),

-- ===== TRIES =====
('Implement Trie (Prefix Tree)', 'implement-trie-prefix-tree', 'Medium',
'Implement a trie with insert, search, and startsWith operations.',
208, '["Hash Table", "String", "Design", "Trie"]'::jsonb, 60.2),

('Design Add and Search Words Data Structure', 'design-add-and-search-words-data-structure', 'Medium',
'Design a data structure that supports adding words and searching with wildcards.',
211, '["String", "Depth-First Search", "Design", "Trie"]'::jsonb, 45.7),

('Word Search II', 'word-search-ii', 'Hard',
'Find all words in a 2D board that exist in a dictionary.',
212, '["Array", "String", "Backtracking", "Trie", "Matrix"]'::jsonb, 38.1),

-- ===== HEAP / PRIORITY QUEUE =====
('Find Median from Data Stream', 'find-median-from-data-stream', 'Hard',
'Design a data structure that supports adding numbers and finding the median.',
295, '["Two Pointers", "Design", "Sorting", "Heap", "Data Stream"]'::jsonb, 51.1),

-- ===== BACKTRACKING =====
('Combination Sum', 'combination-sum', 'Medium',
'Find all unique combinations in candidates that sum to target.',
39, '["Array", "Backtracking"]'::jsonb, 68.6),

('Word Search', 'word-search', 'Medium',
'Determine if a word exists in a 2D board.',
79, '["Array", "Backtracking", "Matrix"]'::jsonb, 40.1),

-- ===== GRAPHS =====
('Number of Islands', 'number-of-islands', 'Medium',
'Count the number of islands in a 2D grid.',
200, '["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"]'::jsonb, 56.7),

('Clone Graph', 'clone-graph', 'Medium',
'Return a deep copy of a connected undirected graph.',
133, '["Hash Table", "Depth-First Search", "Breadth-First Search", "Graph"]'::jsonb, 50.3),

('Pacific Atlantic Water Flow', 'pacific-atlantic-water-flow', 'Medium',
'Find cells that can flow to both Pacific and Atlantic oceans.',
417, '["Array", "Depth-First Search", "Breadth-First Search", "Matrix"]'::jsonb, 52.8),

('Course Schedule', 'course-schedule', 'Medium',
'Determine if you can finish all courses given prerequisites.',
207, '["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"]'::jsonb, 45.3),

('Course Schedule II', 'course-schedule-ii', 'Medium',
'Return the ordering of courses you should take.',
210, '["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"]'::jsonb, 48.2),

-- ===== DYNAMIC PROGRAMMING =====
('Climbing Stairs', 'climbing-stairs', 'Easy',
'Count the number of ways to climb n stairs taking 1 or 2 steps.',
70, '["Math", "Dynamic Programming", "Memoization"]'::jsonb, 51.4),

('House Robber', 'house-robber', 'Medium',
'Rob houses without robbing two adjacent houses.',
198, '["Array", "Dynamic Programming"]'::jsonb, 48.5),

('House Robber II', 'house-robber-ii', 'Medium',
'Rob houses arranged in a circle without robbing adjacent houses.',
213, '["Array", "Dynamic Programming"]'::jsonb, 40.5),

('Longest Palindromic Substring', 'longest-palindromic-substring', 'Medium',
'Find the longest palindromic substring in s.',
5, '["String", "Dynamic Programming"]'::jsonb, 32.4),

('Palindromic Substrings', 'palindromic-substrings', 'Medium',
'Count how many palindromic substrings are in the string.',
647, '["String", "Dynamic Programming"]'::jsonb, 66.5),

('Decode Ways', 'decode-ways', 'Medium',
'Count the number of ways to decode a string of digits.',
91, '["String", "Dynamic Programming"]'::jsonb, 32.1),

('Coin Change', 'coin-change', 'Medium',
'Find the minimum number of coins needed to make up an amount.',
322, '["Array", "Dynamic Programming", "Breadth-First Search"]'::jsonb, 42.1),

('Maximum Product Subarray', 'maximum-product-subarray', 'Medium',
'Find the contiguous subarray with the largest product.',
152, '["Array", "Dynamic Programming"]'::jsonb, 34.6),

('Word Break', 'word-break', 'Medium',
'Determine if string can be segmented into dictionary words.',
139, '["Hash Table", "String", "Dynamic Programming", "Trie"]'::jsonb, 45.1),

('Longest Increasing Subsequence', 'longest-increasing-subsequence', 'Medium',
'Find the length of the longest strictly increasing subsequence.',
300, '["Array", "Binary Search", "Dynamic Programming"]'::jsonb, 51.7),

('Unique Paths', 'unique-paths', 'Medium',
'Count unique paths from top-left to bottom-right in a grid.',
62, '["Math", "Dynamic Programming", "Combinatorics"]'::jsonb, 63.2),

('Jump Game', 'jump-game', 'Medium',
'Determine if you can reach the last index.',
55, '["Array", "Dynamic Programming", "Greedy"]'::jsonb, 38.4),

-- ===== GREEDY =====
('Maximum Subarray', 'maximum-subarray', 'Medium',
'Find the contiguous subarray with the largest sum.',
53, '["Array", "Divide and Conquer", "Dynamic Programming"]'::jsonb, 50.0),

-- ===== INTERVALS =====
('Insert Interval', 'insert-interval', 'Medium',
'Insert a new interval and merge if necessary.',
57, '["Array"]'::jsonb, 38.7),

('Merge Intervals', 'merge-intervals', 'Medium',
'Merge all overlapping intervals.',
56, '["Array", "Sorting"]'::jsonb, 45.9),

('Non-overlapping Intervals', 'non-overlapping-intervals', 'Medium',
'Find minimum number of intervals to remove to make rest non-overlapping.',
435, '["Array", "Dynamic Programming", "Greedy", "Sorting"]'::jsonb, 50.3),

-- ===== BIT MANIPULATION =====
('Number of 1 Bits', 'number-of-1-bits', 'Easy',
'Count the number of 1 bits in an unsigned integer.',
191, '["Divide and Conquer", "Bit Manipulation"]'::jsonb, 65.3),

('Counting Bits', 'counting-bits', 'Easy',
'Return an array where ans[i] is the number of 1 bits in i.',
338, '["Dynamic Programming", "Bit Manipulation"]'::jsonb, 75.1),

('Reverse Bits', 'reverse-bits', 'Easy',
'Reverse bits of a 32-bit unsigned integer.',
190, '["Divide and Conquer", "Bit Manipulation"]'::jsonb, 51.7),

('Missing Number', 'missing-number', 'Easy',
'Find the missing number from 0 to n.',
268, '["Array", "Hash Table", "Math", "Binary Search", "Bit Manipulation", "Sorting"]'::jsonb, 61.2),

('Sum of Two Integers', 'sum-of-two-integers', 'Medium',
'Calculate sum of two integers without using + or - operators.',
371, '["Math", "Bit Manipulation"]'::jsonb, 51.0)
ON CONFLICT (leetcode_id) DO NOTHING;

COMMIT;
