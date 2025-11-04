# Implementation Guide: RBAC & New Features

## Overview
This guide covers the implementation of:
1. Role-Based Access Control (RBAC)
2. Job Description Feature
3. Device Management System
4. Task Management System
5. Documentation System
6. Audit Logging

## Step 1: Run Database Migrations

You need to run the SQL migration file to set up all the new tables and permissions.

### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref itqegqxeqkeogwrvlzlj

# Run migrations
supabase db push
```

### Option B: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/itqegqxeqkeogwrvlzlj/editor
2. Click on "SQL Editor"
3. Copy the entire content from `supabase/migrations/001_rbac_and_features.sql`
4. Paste and run it

## Step 2: Update Existing User Roles

After running the migration, you need to set roles for existing users:

```sql
-- Set yourself as MD
UPDATE profiles
SET role = 'md', is_admin = true
WHERE company_email = 'i.chibuikem@org.acoblighting.com';

-- Set HR personnel
UPDATE profiles
SET role = 'hr', is_admin = true
WHERE company_email IN ('hr@org.acoblighting.com'); -- Add actual HR emails

-- Set Department Leads
UPDATE profiles
SET role = 'department_lead',
    is_department_lead = true,
    lead_departments = ARRAY['Operations', 'Technical'] -- Example departments
WHERE company_email = 'lead@org.acoblighting.com'; -- Add actual lead emails
```

## Step 3: Features Overview

### 1. Job Description
- **Location**: `/job-description`
- **Features**:
  - Users can add/edit their job description
  - Text format supported (plain text with line breaks)
  - Shows last updated timestamp
  - Auto-saves to profile

- **Admin View**: Admins can see all job descriptions in the admin panel

### 2. Device Management
- **User Location**: `/devices`
- **Admin Location**: `/admin/devices`
- **Features**:
  - Admins (MD/HR) create and manage devices
  - Assign devices to staff with notes
  - Track full device history (who had it, when, transfer dates)
  - Serial number tracking
  - Device status (available, assigned, maintenance, retired)
  - Handover tracking with notes

### 3. Task Management
- **User Location**: `/tasks`
- **Admin Location**: For leads in their department view
- **Features**:
  - Department leads, HR, and MD can create tasks
  - Assign to specific staff
  - Track progress (0-100%)
  - Status updates (pending, in_progress, completed, cancelled)
  - Priority levels (low, medium, high, urgent)
  - Due dates
  - Comments and updates
  - Full task history

### 4. Documentation System
- **User Location**: `/documentation`
- **Features**:
  - Users create and manage personal documentation
  - Rich text support (consider adding markdown or WYSIWYG editor)
  - Categories and tags
  - Draft/Published status
  - Department leads see their department's docs
  - HR and MD see all documentation

### 5. Role-Based Access Control

#### Roles:
1. **MD (Managing Director)**
   - Highest level access
   - Sees everything
   - Can manage all features
   - Full audit log access

2. **HR**
   - Same permissions as MD
   - Manages staff, devices, can view all feedback
   - Full audit log access

3. **Department Lead**
   - Can see staff in their department(s)
   - Can view their department's documentation
   - Can create and assign tasks to their department
   - Can view department audit logs
   - One person can lead multiple departments

4. **Staff**
   - Basic user
   - Can only see their own data
   - Can complete tasks assigned to them
   - Can create personal documentation

### 6. Audit Logging
- **Location**: `/admin/audit-logs`
- **Tracks**:
  - All CRUD operations
  - Who made the change
  - When it was made
  - Old and new values (JSON)
  - IP address and user agent

## Step 4: Remaining Implementation

The following pages still need to be created:

### High Priority:
1. `/devices/page.tsx` - User device view
2. `/tasks/page.tsx` - User task view
3. `/documentation/page.tsx` - User documentation
4. `/admin/devices/page.tsx` - Admin device management
5. `/admin/tasks/page.tsx` - Admin task management (for leads)
6. `/admin/audit-logs/page.tsx` - Audit log viewer

### Medium Priority:
7. Update `/admin/page.tsx` - Add links to new admin sections
8. Task detail pages with comments
9. Device handover workflow UI
10. Documentation editor with better formatting

### Nice to Have:
11. Rich text editor for documentation (TipTap, Quill, or similar)
12. Device assignment wizard
13. Task kanban board view
14. Analytics dashboard for MD/HR

## Step 5: Testing Checklist

### Test RBAC:
- [ ] Staff can only see their own data
- [ ] Department leads see only their department
- [ ] HR sees everything
- [ ] MD sees everything
- [ ] Proper error messages for unauthorized access

### Test Job Description:
- [ ] Users can create job description
- [ ] Users can edit job description
- [ ] Admins can view all job descriptions
- [ ] Timestamps update correctly

### Test Devices:
- [ ] Only MD/HR can create devices
- [ ] Devices can be assigned to users
- [ ] Assignment history is tracked
- [ ] Handover process works
- [ ] Users see their assigned devices

### Test Tasks:
- [ ] Leads can create tasks for their department
- [ ] Users see their assigned tasks
- [ ] Progress updates work
- [ ] Comments/updates are saved
- [ ] Task filtering works

### Test Documentation:
- [ ] Users can create documentation
- [ ] Proper access control (leads see dept, HR/MD see all)
- [ ] Draft/published status works
- [ ] Tags and categories work

### Test Audit Logs:
- [ ] All CRUD operations are logged
- [ ] Timestamps are accurate
- [ ] User information is captured
- [ ] Old/new values are stored correctly

## Step 6: Environment Variables

Make sure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://itqegqxeqkeogwrvlzlj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 7: Next Build

After implementing remaining pages:
```bash
npm run build
```

## Architecture Notes

### Database Structure:
- **profiles** - Extended with role, lead_departments, job_description
- **devices** - Device inventory
- **device_assignments** - Assignment history with tracking
- **tasks** - Task management
- **task_updates** - Task comments and changes
- **user_documentation** - User-created docs
- **audit_logs** - Complete audit trail

### Security:
- Row Level Security (RLS) on all tables
- Role-based policies
- Audit logging for compliance
- Proper TypeScript typing

### Performance:
- Indexed foreign keys
- Optimized queries
- Pagination for large datasets
- Caching where appropriate

## Support

For issues or questions, refer to:
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- TypeScript handbook: https://www.typescriptlang.org/docs
