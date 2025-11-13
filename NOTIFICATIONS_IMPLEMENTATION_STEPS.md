# Notifications System - Implementation Steps
**Quick Guide to Replace Old System with New Professional System**

---

## ✅ COMPLETED

- [x] Database migration applied
- [x] `notifications` table created
- [x] `notification_preferences` table created
- [x] Professional notification bell component created
- [x] Notification helper library created
- [x] Real-time subscriptions configured
- [x] RLS policies enabled

---

## 🚀 TO-DO: Integration Steps

### Step 1: Update Sidebars (5 minutes)

**File:** `components/sidebar.tsx`

```typescript
// Replace this:
import { NotificationBell } from "@/components/notification-bell"

// With this:
import { ProfessionalNotificationBell } from "@/components/professional-notification-bell"

// Then replace usage:
// OLD:
<NotificationBell isAdmin={isAdmin} />

// NEW:
<ProfessionalNotificationBell isAdmin={isAdmin} />
```

**File:** `components/admin-sidebar.tsx` (if exists)

Same replacement as above.

---

### Step 2: Add Notifications to Task Management (15 minutes)

**File:** `app/admin/tasks/page.tsx`

**Add import at top:**
```typescript
import { notifyTaskAssigned, notifyTaskUpdated } from "@/lib/notifications"
```

**In `handleSaveTask` function, after creating task:**
```typescript
// After successful task insert
if (selectedTask) {
  // Updating existing task
  if (taskData.assigned_to !== selectedTask.assigned_to) {
    // Assignment changed - notify new assignee
    await notifyTaskAssigned({
      userId: taskData.assigned_to,
      taskId: selectedTask.id,
      taskTitle: taskData.title,
      assignedBy: user.id,
      priority: taskData.priority
    })
  } else {
    // Just updated - notify assignee
    await notifyTaskUpdated({
      userId: taskData.assigned_to,
      taskId: selectedTask.id,
      taskTitle: taskData.title,
      updatedBy: user.id,
      changeDescription: "Task details updated"
    })
  }
} else {
  // New task - notify assignee
  if (taskData.assigned_to) {
    await notifyTaskAssigned({
      userId: taskData.assigned_to,
      taskId: data[0].id, // Use the returned task ID
      taskTitle: taskData.title,
      assignedBy: user.id,
      priority: taskData.priority
    })
  }
}
```

---

### Step 3: Add Notifications to Asset Management (15 minutes)

**File:** `app/admin/assets/page.tsx`

**Add import at top:**
```typescript
import { notifyAssetAssigned } from "@/lib/notifications"
```

**In `handleAssignAsset` function, after successful assignment:**
```typescript
// After successful asset assignment
if (assignForm.assignment_type === "individual" && assignForm.assigned_to) {
  await notifyAssetAssigned({
    userId: assignForm.assigned_to,
    assetId: selectedAsset.id,
    assetCode: selectedAsset.unique_code,
    assetName: ASSET_TYPES[selectedAsset.asset_type]?.name || selectedAsset.asset_type,
    assignedBy: user.id
  })
}
```

---

### Step 4: Add Notifications to Feedback System (10 minutes)

**File:** `app/admin/feedback/page.tsx`

**Add import at top:**
```typescript
import { notifyFeedbackResponse } from "@/lib/notifications"
```

**When admin responds to feedback:**
```typescript
// After admin adds response
await notifyFeedbackResponse({
  userId: feedback.user_id,
  feedbackId: feedback.id,
  responseBy: user.id,
  responsePreview: response.substring(0, 100) + (response.length > 100 ? "..." : "")
})
```

---

### Step 5: Add Notifications to User Approvals (10 minutes)

**File:** `app/admin/staff/page.tsx`

**Add import at top:**
```typescript
import { notifyApprovalGranted, notifyApprovalRequest } from "@/lib/notifications"
```

**When approving a user:**
```typescript
// After approving user registration
await notifyApprovalGranted({
  userId: newUserId,
  approvalType: "account registration",
  approvedBy: user.id,
  details: "Your account has been activated. Welcome to ACOB Lighting Technology!",
  linkUrl: "/dashboard"
})
```

**When user submits for approval:**
```typescript
// Get all admins
const { data: admins } = await supabase
  .from("profiles")
  .select("id")
  .eq("is_admin", true)

// Notify each admin
for (const admin of admins || []) {
  await notifyApprovalRequest({
    adminId: admin.id,
    requestType: "New user registration",
    requestBy: pendingUser.id,
    requestDetails: `${pendingUser.first_name} ${pendingUser.last_name} (${pendingUser.company_email})`,
    linkUrl: "/admin/staff"
  })
}
```

---

### Step 6: Test Everything (20 minutes)

#### Test 1: Real-Time Updates
1. Open app in two browser windows
2. Assign a task in window 1
3. Check notification appears instantly in window 2 ✅

#### Test 2: Notification Actions
1. Click notification → should navigate to linked page ✅
2. Click "Mark as read" → notification should dim ✅
3. Click "Archive" → notification should disappear ✅
4. Click "Delete" → notification should be removed ✅

#### Test 3: Categories
1. Click "Unread" tab → should show only unread ✅
2. Click "Tasks" tab → should show only task notifications ✅
3. Click "All" → should show everything ✅

#### Test 4: Search
1. Type in search box
2. Results should filter in real-time ✅

#### Test 5: Badge
1. Create notification
2. Badge should show count ✅
3. Mark as read
4. Badge count should decrease ✅

---

## 📊 VERIFICATION QUERIES

**Check notifications are being created:**
```sql
SELECT 
  id,
  type,
  category,
  title,
  message,
  read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

**Check real-time subscriptions:**
```sql
-- In Supabase Dashboard → Database → Replication
-- Ensure publications are enabled for notifications table
```

**Check unread counts:**
```sql
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE read = FALSE AND archived = FALSE
GROUP BY user_id;
```

---

## 🔧 OPTIONAL ENHANCEMENTS

### Enhancement 1: Email Notifications (Future)
Already prepared in DB schema with `email_enabled` and `email_frequency` fields.

### Enhancement 2: Push Notifications (Future)
Can add web push notification support using Service Workers.

### Enhancement 3: Notification Sounds (Future)
Add audio feedback when notifications arrive.

### Enhancement 4: Desktop Notifications (Future)
Request browser notification permission and show native OS notifications.

---

## 🐛 COMMON ISSUES & FIXES

### Issue: "create_notification function does not exist"
**Fix:** Run the migration again:
```sql
-- In Supabase SQL Editor
-- Copy and run: supabase/migrations/024_create_notifications_system.sql
```

### Issue: Real-time not working
**Fix:** Enable real-time in Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for `notifications` table
3. Add publication for INSERT, UPDATE, DELETE

### Issue: Notifications not appearing
**Fix:** Check RLS policies:
```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- If missing, re-run the migration
```

### Issue: Actor name/avatar not populated
**Fix:** Check profiles table has the data:
```sql
SELECT id, first_name, last_name, avatar_url
FROM profiles
WHERE id = 'actor-user-id';
```

---

## ✅ COMPLETION CHECKLIST

### Database:
- [x] Migration applied
- [x] Tables created
- [x] Functions working
- [x] RLS policies active
- [x] Real-time enabled

### Components:
- [x] Professional bell created
- [x] Helper library created
- [ ] Old bell replaced in sidebar
- [ ] Old bell replaced in admin sidebar

### Integration:
- [ ] Task notifications added
- [ ] Asset notifications added
- [ ] Feedback notifications added
- [ ] Approval notifications added

### Testing:
- [ ] Real-time updates work
- [ ] Categories filter correctly
- [ ] Search works
- [ ] Mark as read works
- [ ] Archive/delete work
- [ ] Badge updates correctly

### Documentation:
- [x] Implementation guide created
- [x] API reference provided
- [x] Examples included

---

## 🎯 ESTIMATED TIME

- **Minimum (just replace bell):** 5 minutes
- **Basic (replace + task notifications):** 20 minutes
- **Complete (all integrations):** 1 hour
- **Testing:** 20 minutes

**Total: ~1.5 hours for complete implementation**

---

## 🚀 QUICK START (5 Minutes)

**Fastest way to get started:**

1. **Replace bell in sidebar:**
   ```bash
   # Find and replace in components/sidebar.tsx:
   NotificationBell → ProfessionalNotificationBell
   ```

2. **Test it works:**
   - Open app
   - Click bell icon
   - Should see new professional dropdown ✅

3. **Add one notification manually to test:**
   ```sql
   -- In Supabase SQL Editor:
   SELECT create_notification(
     p_user_id := 'your-user-id',
     p_type := 'system',
     p_category := 'system',
     p_title := 'Test Notification',
     p_message := 'This is a test of the new notification system!',
     p_priority := 'normal'
   );
   ```

4. **Refresh page:**
   - Should see notification in bell ✅
   - Badge should show "1" ✅

5. **Done!** Now add to your features as needed.

---

## 📞 SUPPORT

**If you need help:**
1. Check `PROFESSIONAL_NOTIFICATIONS_SYSTEM.md` for full docs
2. Review SQL migration file for database schema
3. Check browser console for errors
4. Verify Supabase real-time is enabled

---

**Ready to implement!** Start with Step 1 (Update Sidebars) and work through each step. 🚀

