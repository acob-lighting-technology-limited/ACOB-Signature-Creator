-- ============================================
-- Check Lead Role Consistency
-- Run this BEFORE applying the migration to see the current state
-- ============================================

-- 1. Show all users with role = 'lead'
SELECT 
  first_name || ' ' || last_name AS name,
  role,
  is_department_lead,
  COALESCE(array_length(lead_departments, 1), 0) AS dept_count,
  lead_departments,
  CASE 
    WHEN lead_departments IS NULL OR lead_departments = '{}' OR array_length(lead_departments, 1) IS NULL 
    THEN '❌ Lead without departments (WILL BE FIXED)'
    ELSE '✅ Lead with departments (OK)'
  END AS status
FROM profiles
WHERE role = 'lead'
ORDER BY last_name, first_name;

-- 2. Show users who have lead_departments but are NOT leads
SELECT 
  first_name || ' ' || last_name AS name,
  role,
  is_department_lead,
  COALESCE(array_length(lead_departments, 1), 0) AS dept_count,
  lead_departments,
  '❌ Non-lead with departments (WILL BE CLEANED)' AS status
FROM profiles
WHERE role != 'lead' 
  AND lead_departments IS NOT NULL 
  AND lead_departments != '{}' 
  AND array_length(lead_departments, 1) > 0
ORDER BY last_name, first_name;

-- 3. Summary statistics
SELECT 
  'Total Leads' AS metric,
  COUNT(*) AS count
FROM profiles
WHERE role = 'lead'
UNION ALL
SELECT 
  'Leads WITH departments',
  COUNT(*)
FROM profiles
WHERE role = 'lead' 
  AND lead_departments IS NOT NULL 
  AND lead_departments != '{}' 
  AND array_length(lead_departments, 1) > 0
UNION ALL
SELECT 
  'Leads WITHOUT departments (needs fix)',
  COUNT(*)
FROM profiles
WHERE role = 'lead' 
  AND (lead_departments IS NULL OR lead_departments = '{}' OR array_length(lead_departments, 1) IS NULL)
UNION ALL
SELECT 
  'Non-leads WITH departments (needs cleanup)',
  COUNT(*)
FROM profiles
WHERE role != 'lead' 
  AND lead_departments IS NOT NULL 
  AND lead_departments != '{}' 
  AND array_length(lead_departments, 1) > 0;

-- 4. Show the problematic cases in detail
\echo '\n=== PROBLEMATIC CASES (Will be fixed by migration) ===\n'

SELECT 
  first_name || ' ' || last_name AS name,
  role,
  department,
  is_department_lead,
  lead_departments,
  CASE 
    WHEN role = 'lead' AND (lead_departments IS NULL OR lead_departments = '{}' OR array_length(lead_departments, 1) IS NULL)
    THEN 'Lead without departments - will set is_department_lead to false'
    WHEN role != 'lead' AND lead_departments != '{}' AND array_length(lead_departments, 1) > 0
    THEN 'Non-lead with departments - will clear lead_departments'
    ELSE 'Unknown issue'
  END AS fix_action
FROM profiles
WHERE 
  (role = 'lead' AND (lead_departments IS NULL OR lead_departments = '{}' OR array_length(lead_departments, 1) IS NULL))
  OR
  (role != 'lead' AND lead_departments IS NOT NULL AND lead_departments != '{}' AND array_length(lead_departments, 1) > 0);

