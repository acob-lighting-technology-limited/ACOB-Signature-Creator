# How to Run the Database Migration

## Quick Start

Since you don't have Supabase CLI installed, follow these steps to run the migration via the dashboard:

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/itqegqxeqkeogwrvlzlj/sql/new
2. This will open a new SQL query tab

### Step 2: Copy the Migration SQL

Open the file: `supabase/migrations/001_rbac_and_features.sql`

You can view it by running:
```bash
cat supabase/migrations/001_rbac_and_features.sql
```

Or open it in your editor.

### Step 3: Run the Migration

1. Copy ALL the content from `001_rbac_and_features.sql`
2. Paste it into the Supabase SQL Editor
3. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)

### Step 4: Verify the Migration

Run this query to check if tables were created:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'devices',
  'device_assignments',
  'tasks',
  'task_updates',
  'user_documentation',
  'audit_logs'
)
ORDER BY table_name;
```

You should see 6 tables listed.

### Step 5: Set Your Role as MD

Run this to give yourself MD (Managing Director) access:
```sql
UPDATE profiles
SET
  role = 'md',
  is_admin = true
WHERE company_email = 'i.chibuikem@org.acoblighting.com';
```

### Step 6: Verify Your Role

```sql
SELECT
  company_email,
  role,
  is_admin,
  is_department_lead,
  lead_departments
FROM profiles
WHERE company_email = 'i.chibuikem@org.acoblighting.com';
```

You should see:
- role: md
- is_admin: true

## Troubleshooting

### Error: "type user_role already exists"
If you see this error, it means you've run the migration before. You can either:
1. Drop the existing type and re-run, or
2. Comment out the `CREATE TYPE` line and run the rest

### Error: "table already exists"
Similar to above - the tables already exist. You can:
1. Drop the tables first (careful - this deletes data!)
2. Or skip to Step 5 to just update your role

### Error: Permission denied
Make sure you're using the correct Supabase access token in your MCP config.

## What This Migration Creates

✅ **New Tables:**
- `devices` - Device inventory
- `device_assignments` - Device assignment history
- `tasks` - Task management
- `task_updates` - Task comments/updates
- `user_documentation` - User docs
- `audit_logs` - Audit trail

✅ **New Columns in `profiles`:**
- `role` - User role (staff, department_lead, hr, md)
- `is_department_lead` - Boolean flag
- `lead_departments` - Array of departments they lead
- `job_description` - User's job description
- `job_description_updated_at` - Last update timestamp

✅ **Security:**
- Row Level Security (RLS) policies
- Role-based access control
- Audit logging function

## Next Steps

After running the migration:

1. **Test the job description page**: Visit `/job-description`
2. **Set up other admin users**: Update their roles in the `profiles` table
3. **Complete the remaining pages**: See `IMPLEMENTATION_GUIDE.md` for the full list

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check the Supabase logs
3. Verify your environment variables are correct
4. Make sure you're logged in with the correct account
