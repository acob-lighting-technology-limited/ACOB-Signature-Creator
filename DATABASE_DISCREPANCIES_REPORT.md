# Database Discrepancies Report
**Generated:** November 12, 2025  
**Database:** ACOB Lighting Technology Limited - Supabase

## Executive Summary

This report identifies data inconsistencies across staff, departments, and office locations in your Supabase database. The analysis reveals **critical data quality issues** that need immediate attention, particularly in the `profiles` table where location fields contain incorrect data types (phone numbers, emails, job titles).

---

## 🔴 CRITICAL ISSUES

### 1. Wrong Data Types in Location Fields

**Issue:** Staff profile location fields contain phone numbers, email addresses, and job titles instead of actual locations.

| Staff Name | Current Work Location | Site Name | Site State | Issue |
|------------|----------------------|-----------|------------|-------|
| **Lawrence Adukwu** | 08086774310 | Hakim avenue | kagini | ❌ Phone number in location field |
| **Abdulsamad Danmusa** | IT & Communications Officer | d.abdulsamad@org.acoblighting.com | 08162300002 | ❌ Email in site name, phone in site_state, job title in location |
| **Chibuikem Ilonze** | Office | i.chibuikem@org.acoblighting.com | 07058786478 | ❌ Email in site name, phone in site_state |

**Impact:** 
- Reports and exports will show incorrect location data
- Analytics and filtering by location will be inaccurate
- Staff cannot be properly grouped by work location

**Recommended Fix:**
```sql
-- Fix Lawrence Adukwu
UPDATE profiles
SET current_work_location = 'Kagini, Hakim Avenue'
WHERE company_email = 'a.lawrence@org.acoblighting.com';

-- Fix Abdulsamad Danmusa
UPDATE profiles
SET 
  current_work_location = 'Office (Abuja)',
  site_name = 'Abuja Office',
  site_state = 'FCT'
WHERE company_email = 'd.abdulsamad@org.acoblighting.com';

-- Fix Chibuikem Ilonze
UPDATE profiles
SET 
  site_name = 'Office',
  site_state = 'FCT'
WHERE company_email = 'i.chibuikem@org.acoblighting.com';
```

---

## ⚠️ MODERATE ISSUES

### 2. Inconsistent Office Location Naming

**Issue:** Office locations in `assets` table use department names instead of physical locations, creating confusion between departments and physical offices.

**Assets Office Locations That Are Actually Departments:**
- Accounts (used as office location in assets)
- Admin & HR
- Technical
- Technical Extension
- Operations
- Business, Growth and Innovation
- Legal, Regulatory and Compliance

**Profiles Office Locations With Inconsistencies:**
- "Abuja" vs "Abuja." (trailing period)
- "Office" (too generic)
- "Site" (too generic)
- Residential addresses mixed with work locations

**Impact:**
- Cannot distinguish between physical office locations and organizational departments
- Asset tracking by physical location is compromised
- Reporting dashboards will show mixed data

**Recommendation:**
Create a standardized list of physical office locations:
- **Main Office (Abuja)**
- **Field Sites (by location name)**
- **Remote**

Then update all tables to use consistent naming.

---

### 3. Inconsistent Location Data in Profiles

**Issue:** `current_work_location` and `site_name` fields contain a mix of:
- Actual office locations
- Project site names
- Residential addresses
- Generic terms ("Office", "Site")
- Email addresses (as shown above)
- Phone numbers (as shown above)

**Examples of Problematic Entries:**
- "fct (no permanent address yet)"
- "Opposite piwoyi police state"
- "Near House 40 Residence"
- "behind Christ Embassy"
- "All site"

**Recommendation:**
Standardize these fields:
- **current_work_location**: Should be primary work base (Office/Site Name)
- **site_name**: Should be specific project/site if field-based
- **site_state**: Should be Nigerian state abbreviation (e.g., FCT, Ondo, Edo)

---

## ✅ AREAS WITHOUT ISSUES

### 1. Department Consistency ✓
All 10 departments are consistently used across tables:
- Accounts
- Admin & HR
- Business Growth and Innovation
- IT and Communications
- Legal, Regulatory and Compliance
- Logistics
- Monitoring and Evaluation
- Operations
- Project
- Technical

**Status:** ✅ No conflicts found

### 2. Staff Core Data ✓
All staff members have:
- ✅ Department assigned
- ✅ Company email
- ✅ Role defined

**Status:** ✅ No NULL critical fields

### 3. Asset Assignments ✓
All asset assignments reference valid users/departments:
- ✅ No orphaned assignments
- ✅ All assigned users exist in profiles
- ✅ Department assignments use valid departments

**Status:** ✅ No referential integrity issues

### 4. Task Assignments ✓
All task assignments are valid:
- ✅ No orphaned task assignments
- ✅ All assigned users exist
- ✅ Department/user alignment is correct

**Status:** ✅ No orphaned records

### 5. Lead Role Management ✓
After the recent migration:
- ✅ Lead roles properly enforced
- ✅ Database constraint prevents leads without departments
- ✅ No duplicate lead badges

**Status:** ✅ Fixed and validated

---

## 📊 DEPARTMENT USAGE ACROSS TABLES

| Department | Found In Tables | Usage Count |
|------------|----------------|-------------|
| Accounts | profiles.department, profiles.lead_departments | 2 |
| Admin & HR | profiles.department | 1 |
| Business Growth and Innovation | profiles.department, profiles.lead_departments | 2 |
| IT and Communications | assets.department, profiles.department, tasks.department | 3 ✓ (Most used) |
| Legal, Regulatory and Compliance | profiles.department, tasks.department | 2 |
| Logistics | profiles.department | 1 |
| Monitoring and Evaluation | profiles.department | 1 |
| Operations | profiles.department | 1 |
| Project | profiles.department | 1 |
| Technical | assets.department, profiles.department, profiles.lead_departments | 3 ✓ (Most used) |

---

## 🔧 RECOMMENDED ACTIONS

### Immediate (Critical)
1. ✅ **Fix phone numbers in location fields** - Use SQL update script above
2. ✅ **Fix email addresses in site_name fields** - Use SQL update script above
3. ✅ **Fix job titles in location fields** - Use SQL update script above

### Short Term (1-2 weeks)
4. **Standardize office location naming convention**
   - Create a master list of valid office locations
   - Update asset office_location fields to match
   - Add database constraint or enum for office_location

5. **Clean up profiles location data**
   - Review and standardize current_work_location values
   - Ensure site_name contains actual site names (not emails/phones)
   - Standardize site_state to use state abbreviations

6. **Create location reference tables**
   ```sql
   CREATE TABLE office_locations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL UNIQUE,
     type TEXT NOT NULL, -- 'office', 'site', 'remote'
     state TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### Long Term (Ongoing)
7. **Implement data validation**
   - Add CHECK constraints to prevent invalid data entry
   - Create database functions to validate location formats
   - Add UI-level validation in forms

8. **Regular audits**
   - Schedule monthly data quality checks
   - Generate automated discrepancy reports
   - Monitor for new inconsistencies

---

## 📝 SQL SCRIPT FOR IMMEDIATE FIXES

```sql
-- ==============================================
-- IMMEDIATE DATA CLEANUP SCRIPT
-- Run this to fix critical location field issues
-- ==============================================

BEGIN;

-- Fix Lawrence Adukwu (phone in location)
UPDATE profiles
SET 
  current_work_location = 'Kagini, Hakim Avenue',
  updated_at = NOW()
WHERE company_email = 'a.lawrence@org.acoblighting.com';

-- Fix Abdulsamad Danmusa (email in site_name, phone in site_state)
UPDATE profiles
SET 
  current_work_location = 'Office (Abuja)',
  site_name = 'Abuja Office',
  site_state = 'FCT',
  updated_at = NOW()
WHERE company_email = 'd.abdulsamad@org.acoblighting.com';

-- Fix Chibuikem Ilonze (email in site_name, phone in site_state)
UPDATE profiles
SET 
  site_name = 'Office',
  site_state = 'FCT',
  updated_at = NOW()
WHERE company_email = 'i.chibuikem@org.acoblighting.com';

-- Standardize "Abuja." to "Abuja" (remove trailing period)
UPDATE profiles
SET 
  current_work_location = 'Abuja',
  updated_at = NOW()
WHERE current_work_location = 'Abuja.';

-- Log this cleanup in audit trail
INSERT INTO audit_log (action, entity_type, entity_id, details, created_at)
VALUES (
  'cleanup',
  'profiles',
  NULL,
  'Fixed location field data quality issues - removed phone numbers, emails, and standardized location names',
  NOW()
);

COMMIT;

-- Verification query to confirm fixes
SELECT 
  first_name || ' ' || last_name AS staff_name,
  company_email,
  current_work_location,
  site_name,
  site_state
FROM profiles
WHERE company_email IN (
  'a.lawrence@org.acoblighting.com',
  'd.abdulsamad@org.acoblighting.com',
  'i.chibuikem@org.acoblighting.com'
);
```

---

## 📈 METRICS

- **Total Staff Profiles:** ~80+
- **Critical Data Issues:** 3 (phone/email in location fields)
- **Moderate Issues:** 2 (inconsistent naming)
- **Total Departments:** 10 (all consistent ✓)
- **Total Distinct Office Locations:** 56 (needs standardization)
- **Assets Checked:** 120+
- **Tasks Checked:** 3
- **Orphaned Records:** 0 ✓

---

## 🎯 SUCCESS CRITERIA

After implementing the recommended fixes:
- [ ] All location fields contain only location data (no phone/email/job titles)
- [ ] Office locations are standardized across assets and profiles
- [ ] A master list of valid office locations exists
- [ ] Database constraints prevent future invalid data entry
- [ ] Monthly data quality reports show no critical issues

---

## 📞 CONTACTS FOR FOLLOW-UP

For questions about specific data entries, contact:
- **IT & Communications Lead:** Lawrence Adukwu (Technical dept)
- **Database Admin:** Chibuikem Ilonze (IT and Communications)

---

*End of Report*

