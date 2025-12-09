-- Debug: Check study plan data

-- 1. Check if template has milestones
SELECT
  t.id,
  t.display_name,
  t.estimated_weeks,
  COUNT(m.id) as milestone_count
FROM study_plan_templates t
LEFT JOIN study_plan_template_milestones m ON m.template_id = t.id
WHERE t.display_name LIKE '%FAANG%'
GROUP BY t.id, t.display_name, t.estimated_weeks;

-- 2. Check milestone details for FAANG template
SELECT
  m.id,
  m.title,
  m.milestone_order,
  m.total_problems,
  m.required_problems,
  array_length(m.problem_ids, 1) as problem_ids_count,
  m.problem_ids[1:5] as first_5_problem_ids
FROM study_plan_template_milestones m
JOIN study_plan_templates t ON t.id = m.template_id
WHERE t.display_name LIKE '%FAANG%'
ORDER BY m.milestone_order;

-- 3. Check the adopted study plan
SELECT
  sp.id,
  sp.name,
  sp.status,
  sp.start_date,
  sp.target_end_date,
  sp.template_id,
  sp.pod_id,
  t.display_name as template_name
FROM study_plans sp
JOIN study_plan_templates t ON t.id = sp.template_id
WHERE sp.pod_id = '721ca771-7bc2-42c9-9a1a-698763332823'::uuid;

-- 4. Check if plan has milestones created
SELECT
  spm.id,
  spm.title,
  spm.milestone_order,
  spm.total_problems,
  array_length(spm.problem_ids, 1) as problem_count
FROM study_plan_milestones spm
JOIN study_plans sp ON sp.id = spm.plan_id
WHERE sp.pod_id = '721ca771-7bc2-42c9-9a1a-698763332823'::uuid
ORDER BY spm.milestone_order;
