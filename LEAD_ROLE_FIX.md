# Lead Role Cleanup and Fix

## Problem
Staff members with the "Lead" role were showing duplicate "Lead" badges because both the `role` field and `is_department_lead` flag were being used inconsistently.

## Solution

### 1. UI Changes
- **Removed duplicate "Lead" badge**: Now only shows the role badge once
- **Shows department count**: For leads, displays the number of departments they're leading (e.g., "2 Depts")
- **Required field warning**: When selecting "Lead" role, shows a warning that department selection is required
- **Auto-clear departments**: When changing role from Lead to another role, automatically clears lead_departments

### 2. Database Cleanup Migration

A migration has been created to clean up the database: `supabase/migrations/022_cleanup_lead_roles.sql`

This migration:
1. Fixes users with role='lead' but no departments assigned
2. Clears lead_departments for users who are not leads
3. Ensures is_department_lead matches the role
4. Adds a constraint to prevent future inconsistencies (leads MUST have at least one department)
5. Adds a GIN index on lead_departments for better performance

### 3. How to Apply the Migration

#### Using Supabase CLI (Recommended)
```bash
cd /Users/chibuike/Documents/GitHub/clone/test-2
supabase db push
```

#### Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/022_cleanup_lead_roles.sql`
4. Paste and execute the SQL

#### Manual SQL Execution
Connect to your database and run:
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/022_cleanup_lead_roles.sql
```

## New Behavior

### When Assigning Lead Role:
- User MUST select at least one department
- The dialog will show a warning: "⚠️ Lead role requires selecting at least one department below"
- Cannot save without selecting at least one department

### Badge Display:
- **Before**: "Lead" (from role) + "Lead" (from is_department_lead) = Duplicate badges
- **After**: "Lead" + "2 Depts" (shows count of departments leading)

### Data Consistency:
- The database constraint ensures that:
  - If `role = 'lead'` → `lead_departments` MUST have at least 1 department
  - If `role != 'lead'` → `lead_departments` will be empty

## Testing

After applying the migration:

1. Check all existing leads have departments assigned:
```sql
SELECT first_name, last_name, role, lead_departments 
FROM profiles 
WHERE role = 'lead';
```

2. Verify no non-leads have departments assigned:
```sql
SELECT first_name, last_name, role, lead_departments 
FROM profiles 
WHERE role != 'lead' AND lead_departments != '{}';
```

3. Try to create a lead without departments (should fail):
```sql
-- This should fail with constraint violation
UPDATE profiles 
SET role = 'lead', lead_departments = '{}' 
WHERE id = 'some-user-id';
```

## UI Screenshots Expected Behavior

### Before:
- Role Badge: "Lead"
- Additional Badge: "Lead"
- Total: 2 badges showing "Lead"

### After:
- Role Badge: "Lead"
- Additional Badge: "2 Depts" (showing number of departments)
- Total: 1 "Lead" badge + department count

## Files Modified

1. `app/admin/staff/page.tsx` - Fixed badge display logic and added validation
2. `supabase/migrations/022_cleanup_lead_roles.sql` - Database cleanup migration

## Rollback

If you need to rollback this migration:

```sql
-- Remove the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_lead_has_departments;

-- Remove the index
DROP INDEX IF EXISTS idx_profiles_lead_departments;
```

Note: This only removes the constraint and index, but doesn't undo the data cleanup. The cleaned data is still valid.

