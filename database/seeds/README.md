# Study Plans Database Seeds

## Overview

This directory contains comprehensive database seeds for **15 curated study plan templates** with **75+ real LeetCode problems** from the most popular interview preparation lists.

## What's Included

### 📚 Study Plan Templates (15 total)
1. **Blind 75 Essentials** - The legendary 75 problems
2. **Grind 75** - Week-by-week optimized plan
3. **NeetCode 150** - Comprehensive with video explanations
4. **NeetCode 250 Complete** - Ultimate collection
5. **Grind 169** - Extended comprehensive list
6. **LeetCode Top 150** - Official curated list
7. **Grokking 28 Patterns** - Pattern-based learning
8. **Data Structures Deep Dive** - All fundamental structures
9. **FAANG 90-Day Intensive** - Complete bootcamp
10. **DP Mastery: 0 to Hero** - Dynamic Programming complete
11. **Graph Theory & Algorithms** - Graph mastery
12. **System Design Interview Prep** - Scalability & architecture
13. **DSA Fundamentals for Beginners** - Perfect starting point
14. **Google-Specific Preparation** - Company-focused
15. **Strings & Arrays Mastery** - Most common topics

### 🎯 Real Problems (75+ problems)
Each problem includes:
- ✅ **LeetCode problem number** and direct URL
- 📊 **Difficulty level** (Easy/Medium/Hard)
- 🏷️ **Pattern tags** (sliding-window, two-pointers, etc.)
- 🏢 **Company tags** (Google, Amazon, Facebook, etc.)
- ⏱️ **Time & space complexity**
- 📈 **Acceptance rate, likes, dislikes**
- 📝 **Clear problem description**

## Installation

Run the migration and seed files in order:

```bash
# 1. First, run the template milestones migration (if not already run)
psql your_database < ../supabase/migrations/20250203_study_plan_template_milestones.sql

# 2. Create the study plan templates
psql your_database < study_plan_templates.sql

# 3. Seed the problems
psql your_database < 01_problems_seed.sql

# 4. Link problems to milestones
psql your_database < 02_link_problems_to_study_plans.sql

# 5. Add smart features (auto-updates, recommendations, etc.)
psql your_database < 03_smart_features.sql
```

Or using Supabase SQL Editor:
1. Run the migration: `supabase/migrations/20250203_study_plan_template_milestones.sql`
2. Then run seed files in order: `study_plan_templates.sql` → `01_problems_seed.sql` → `02_link_problems_to_study_plans.sql` → `03_smart_features.sql`

## Features

### 🎓 **Smart Study Plans**
- **Progressive difficulty** - Problems ordered from easy to hard
- **Milestone-based learning** - Clear learning objectives for each section
- **Estimated hours** - Time investment per milestone
- **Required vs total problems** - Flexibility in completion

### 🤝 **Collaborative Learning**
- **Pod-based studying** - Groups can adopt templates together
- **Shared progress tracking** - See how your pod is doing
- **Live problem solving** - Solve problems together in real-time
- **Discussion threads** - Discuss solutions and approaches

### 📊 **Progress Tracking**
- **Automatic updates** - Milestone progress updates when problems are solved
- **Completion tracking** - Track problems_completed vs problems_total
- **Status indicators** - not_started, in_progress, completed
- **Success rates** - See how many people complete each plan

### 🏆 **Gamification**
- **Badges** - Earn badges for completing milestones
- **Leaderboards** - Pod rankings by completion rate
- **Testimonials** - Share your success stories
- **Alumni network** - Showcase where you landed after completion

## Data Sources

All data curated from:
- [NeetCode.io](https://neetcode.io) - Video explanations and problem lists
- [Tech Interview Handbook](https://www.techinterviewhandbook.org/grind75/) - Grind 75 tool
- [LeetCode](https://leetcode.com) - Official problem data
- [Design Gurus](https://www.designgurus.io) - Grokking patterns
- Community-curated lists from GitHub and Blind

## Database Schema

### Key Tables
- `study_plan_templates` - Template definitions
- `study_plan_milestones` - Milestones with learning objectives
- `problems` - Actual LeetCode problems
- `study_plans` - User/Pod adopted plans
- `study_plan_milestone_progress` - Progress tracking

### Relationships
```
study_plan_templates
  ├── study_plan_milestones (problem_ids → problems.id[])
  └── study_plans (adopted by users/pods)
      └── study_plan_milestone_progress
```

## Example Usage

### For Individual Users
```sql
-- Adopt Blind 75 for yourself
INSERT INTO study_plans (template_id, user_id, status)
VALUES (
  (SELECT id FROM study_plan_templates WHERE display_name = 'Blind 75 Essentials'),
  'user-uuid',
  'active'
);
```

### For Study Pods
```sql
-- Adopt NeetCode 150 for your pod
INSERT INTO study_plans (template_id, pod_id, status)
VALUES (
  (SELECT id FROM study_plan_templates WHERE display_name = 'NeetCode 150'),
  'pod-uuid',
  'active'
);
```

### Track Progress
```sql
-- Mark a problem as completed
-- This automatically updates milestone progress
UPDATE study_plan_milestone_progress
SET
  problems_completed = problems_completed + 1,
  progress_percentage = (problems_completed + 1) * 100.0 / problems_total,
  status = CASE
    WHEN (problems_completed + 1) >= required_problems THEN 'completed'
    WHEN (problems_completed + 1) > 0 THEN 'in_progress'
    ELSE 'not_started'
  END
WHERE milestone_id = 'milestone-uuid';
```

## Cool Features to Implement

### 🎯 Smart Recommendations
Based on the seeded data, you can implement:

1. **Next Problem Suggestion**
   - Suggest problems based on current skill level
   - Recommend similar problems after solving one
   - Progressive difficulty increase

2. **Pattern Recognition**
   - Group problems by pattern tags
   - Teach users to recognize patterns
   - Show pattern frequency across companies

3. **Company-Specific Prep**
   - Filter problems by company tags
   - See what Google/Amazon/Facebook actually asks
   - Customize study plan for target company

4. **Weak Area Detection**
   - Identify topics where user struggles
   - Suggest additional practice problems
   - Adaptive learning path

5. **Live Collaborative Solving**
   - Multiple users solve same problem together
   - Shared code editor with syntax highlighting
   - Real-time cursor positions
   - Voice/video chat integration

6. **Automated Hints System**
   - Graduated hints (approach → pseudocode → solution)
   - Pattern hints ("This looks like two pointers!")
   - Time/space complexity hints

7. **Video Integration**
   - Link to NeetCode video explanations
   - Timestamp jump to specific sections
   - Playback speed control

8. **Discussion & Notes**
   - Pod-specific discussion threads per problem
   - Personal notes and annotations
   - Share solution approaches
   - Upvote best solutions

## Maintenance

### Adding New Problems
```sql
INSERT INTO problems (title, slug, difficulty, category, description, leetcode_number, ...)
VALUES (...);

-- Link to milestone
UPDATE study_plan_milestones
SET problem_ids = array_append(problem_ids, new_problem_id)
WHERE title = 'Arrays & Hashing';
```

### Updating Problem Data
```sql
-- Update acceptance rate, likes, etc.
UPDATE problems
SET acceptance_rate = 52.1, likes = 15000
WHERE slug = 'two-sum';
```

## License

This data is compiled from publicly available sources for educational purposes.
LeetCode is a trademark of LeetCode LLC.

## Credits

- **NeetCode** - Problem categorization and video explanations
- **Yangshun Tay** - Original Blind 75 and Grind 75 creator
- **LeetCode community** - Problem curation and discussions
- **Design Gurus** - Pattern-based learning approach
