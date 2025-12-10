# Study Plan Setup Instructions

## Overview
This document explains how to populate study plan problems and fix the unenroll functionality.

## Files Created

### 1. SQL Migrations

#### `supabase/migrations/20250209_populate_all_study_plan_problems.sql`
- **Purpose**: Populates problems for all study plan templates
- **What it does**:
  - Creates milestones with problem_ids arrays for Blind 75, Grind 75, NeetCode 150, Grind 169
  - Uses helper functions to map problem slugs to IDs
  - Updates template totals (milestones count, problems count)

#### `supabase/migrations/20250209_fix_study_plan_unenroll.sql`
- **Purpose**: Fixes the unenroll functionality
- **What it does**:
  - Creates a function to abandon study plans (sets status to 'abandoned' instead of deleting)
  - Adds index for faster status filtering
  - Ensures abandoned plans are excluded from queries

### 2. Code Changes

#### `app/api/study-pods/[id]/study-plan/[planId]/route.ts`
- Changed DELETE to UPDATE status to 'abandoned' instead of hard deleting
- This preserves data integrity and allows proper filtering

#### `app/api/study-pods/[id]/study-plans/route.ts`
- Added `.neq("status", "abandoned")` to exclude abandoned plans
- Ensures abandoned plans don't show in active plans list

#### `components/study-plans/study-plan-dashboard.tsx`
- Updated `fetchPlans` to filter out abandoned plans on client side
- Added cache busting with timestamp query parameter
- Improved state management for selected plan

## How to Apply

### Step 1: Run SQL Migrations

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Run these migrations in order:
   - `20250209_fix_study_plan_unenroll.sql` (run first)
   - `20250209_populate_all_study_plan_problems.sql` (run second)

### Step 2: Verify Migrations

Run these queries to verify:

```sql
-- Check if templates have milestones
SELECT 
  t.name,
  t.display_name,
  COUNT(m.id) as milestone_count,
  COALESCE(SUM(m.total_problems), 0) as total_problems
FROM study_plan_templates t
LEFT JOIN study_plan_template_milestones m ON m.template_id = t.id
GROUP BY t.id, t.name, t.display_name
ORDER BY t.name;

-- Check if problems are populated
SELECT 
  m.title,
  array_length(m.problem_ids, 1) as problem_count
FROM study_plan_template_milestones m
JOIN study_plan_templates t ON t.id = m.template_id
WHERE t.name = 'blind_75_essentials'
ORDER BY m.milestone_order;
```

### Step 3: Populate Custom Templates

For templates that need dynamic curation (like "DP Mastery: 0 to Hero"), use the API:

```bash
POST /api/study-plans/curate-custom
{
  "template_id": "uuid-of-template",
  "plan_name": "DP Mastery: 0 to Hero"
}
```

Or use the populate-problems API for known templates:

```bash
POST /api/study-plans/populate-problems
{
  "template_name": "blind_75_essentials"
}
```

## Testing

### Test Unenroll
1. Go to a study pod with active plans
2. Click the red unenroll button on a plan
3. Confirm the plan disappears from "Your Active Plans"
4. Verify the plan status is set to 'abandoned' in database

### Test Problem Display
1. Select a study plan
2. Expand a milestone
3. Verify problems are displayed with difficulty badges
4. Click on a problem to navigate to problem page

## Troubleshooting

### Plans Still Showing After Unenroll
- Check if migration `20250209_fix_study_plan_unenroll.sql` ran successfully
- Verify the API route has `.neq("status", "abandoned")`
- Clear browser cache and refresh

### No Problems Showing
- Verify problems exist in database with matching title_slug
- Check if migration `20250209_populate_all_study_plan_problems.sql` ran successfully
- Verify template names match exactly (case-sensitive)

### Milestones Show 0 Problems
- Run the populate-problems API endpoint for that template
- Or manually check if problem_ids array is populated in study_plan_template_milestones table

## Next Steps

1. Run the migrations
2. Test unenroll functionality
3. Verify problems are displayed
4. For custom templates, use the curate-custom API endpoint

