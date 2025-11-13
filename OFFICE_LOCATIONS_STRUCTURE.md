# Office Locations Structure
**Date:** November 12, 2025  
**Status:** ✅ **ORGANIZED & DOCUMENTED**

---

## 🏢 OFFICE LOCATION TYPES

Your office locations are now properly categorized into 4 types:

### 1. **Executive Offices** (`office`)
**Not linked to any department** - Private executive spaces

| Office Name | Department | Description |
|-------------|------------|-------------|
| MD Office | None | Managing Director's private office |
| Assistant Executive Director | None | Assistant Executive Director's private office |

---

### 2. **Department Offices** (`department_office`)
**Linked to departments** - Each department's office space

| Office Name | Department | Description |
|-------------|-----------|-------------|
| Accounts | Accounts | Accounts Department Office |
| Admin & HR | Admin & HR | Admin & HR Department Office |
| Business, Growth and Innovation | Business, Growth and Innovation | Business, Growth and Innovation Department Office |
| IT and Communications | IT and Communications | IT and Communications Department Office |
| Legal, Regulatory and Compliance | Legal, Regulatory and Compliance | Legal, Regulatory and Compliance Department Office |
| Operations | Operations | Operations Department Office |
| Technical | Technical | Technical Department Office |
| Technical Extension | Technical | Technical Department Extension Office |

**Note:** Technical has **2 offices** - "Technical" and "Technical Extension" - both linked to the Technical department.

---

### 3. **Conference Rooms** (`conference_room`)
**Shared meeting spaces** - Not linked to any department

| Office Name | Department | Description |
|-------------|-----------|-------------|
| General Conference Room | None | Main conference room for general meetings |

---

### 4. **Common Areas** (`common_area`)
**Shared spaces** - Not linked to any department

| Office Name | Department | Description |
|-------------|-----------|-------------|
| Reception | None | Main reception area |
| Kitchen | None | Company kitchen/common area |

---

## 📊 SUMMARY

**Total Offices:** 13

- **Executive Offices:** 2 (MD Office, Assistant Executive Director)
- **Department Offices:** 8 (one per department, Technical has 2)
- **Conference Rooms:** 1 (General Conference Room)
- **Common Areas:** 2 (Reception, Kitchen)

---

## 🔧 HOW TO USE

### In Your Code:

```typescript
import { 
  getDepartmentOffices,
  getCommonAreas,
  getOfficesForDepartment,
  isDepartmentOffice,
  getDepartmentForOffice
} from "@/lib/office-locations"

// Get all department offices
const deptOffices = getDepartmentOffices()
// Returns: Accounts, Admin & HR, Technical, etc.

// Get all common areas
const commonAreas = getCommonAreas()
// Returns: Reception, Kitchen

// Get offices for Technical department
const techOffices = getOfficesForDepartment("Technical")
// Returns: ["Technical", "Technical Extension"]

// Check if an office belongs to a department
const isDept = isDepartmentOffice("Technical")
// Returns: true

const isCommon = isCommonArea("Kitchen")
// Returns: true

// Get department for an office
const dept = getDepartmentForOffice("Technical Extension")
// Returns: "Technical"
```

---

## 🎨 UI RECOMMENDATIONS

### When Showing Office Selection Dropdown:

**Option 1: Grouped by Type**
```
Executive Offices
  ├─ MD Office
  └─ Assistant Executive Director

Department Offices
  ├─ Accounts (Accounts)
  ├─ Admin & HR (Admin & HR)
  ├─ IT and Communications (IT and Communications)
  ├─ Technical (Technical)
  └─ Technical Extension (Technical)

Common Areas
  ├─ Reception
  └─ Kitchen

Conference Rooms
  └─ General Conference Room
```

**Option 2: Grouped by Department**
```
Executive Offices
  ├─ MD Office
  └─ Assistant Executive Director

Accounts Department
  └─ Accounts

Technical Department
  ├─ Technical
  └─ Technical Extension

Common Areas
  ├─ Reception
  └─ Kitchen

Conference Rooms
  └─ General Conference Room
```

**Option 3: Simple List with Badges**
```
MD Office [Executive]
Assistant Executive Director [Executive]
Accounts [Department: Accounts]
Technical [Department: Technical]
Technical Extension [Department: Technical]
Reception [Common Area]
Kitchen [Common Area]
...
```

---

## 📋 DATABASE STRUCTURE

### `office_locations` Table:
```sql
CREATE TABLE office_locations (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('office', 'department_office', 'conference_room', 'common_area')),
  department TEXT, -- NULL for non-department offices
  description TEXT,
  is_active BOOLEAN DEFAULT true
)
```

### Key Rules:
1. **Department offices** MUST have `department` set
2. **Common areas** MUST have `department = NULL`
3. **Executive offices** MUST have `department = NULL`
4. **Conference rooms** MUST have `department = NULL`

---

## ✅ WHAT'S BEEN DONE

1. ✅ **Kitchen added** to `office_locations` table
2. ✅ **All department offices linked** to their departments
3. ✅ **Common areas separated** (no department links)
4. ✅ **Executive offices separated** (no department links)
5. ✅ **Helper utility created** (`lib/office-locations.ts`)
6. ✅ **Database view created** (`office_locations_by_type`)
7. ✅ **Descriptions added** to all offices

---

## 🎯 BENEFITS

### For Users:
- ✅ **Clear distinction** between department offices and common areas
- ✅ **Easy to find** offices by department
- ✅ **Organized selection** in dropdowns

### For System:
- ✅ **Data integrity** - Proper relationships maintained
- ✅ **Easy filtering** - Can filter by type or department
- ✅ **Scalable** - Easy to add new offices
- ✅ **Type-safe** - TypeScript types for all offices

---

## 🔍 QUERIES

### Get all department offices:
```sql
SELECT * FROM office_locations 
WHERE type = 'department_office' 
ORDER BY department, name;
```

### Get all common areas:
```sql
SELECT * FROM office_locations 
WHERE type = 'common_area' 
ORDER BY name;
```

### Get offices for Technical department:
```sql
SELECT * FROM office_locations 
WHERE type = 'department_office' 
  AND department = 'Technical'
ORDER BY name;
```

### Get all offices grouped by type:
```sql
SELECT * FROM office_locations_by_type;
```

---

## 📝 SUMMARY

**Structure:**
- ✅ **4 types** of offices clearly defined
- ✅ **Department offices** properly linked
- ✅ **Common areas** separated (Kitchen, Reception)
- ✅ **IT and Communications** office properly linked to IT department
- ✅ **Executive offices** separated (MD Office, Assistant Executive Director)
- ✅ **Helper utilities** for easy access

**Status:**
- ✅ Database migration applied
- ✅ All offices properly categorized
- ✅ Helper library created
- ✅ Ready for UI integration

---

**Your office locations are now properly organized!** 🏢✨

