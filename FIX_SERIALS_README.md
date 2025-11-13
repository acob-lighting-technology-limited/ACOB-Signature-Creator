# Fix Asset Serial Numbers

## The Problem

Your assets currently have duplicate serial numbers across different years:
- `ACOB/HQ/LAP/2023/001`
- `ACOB/HQ/LAP/2024/001`

This happened because the serial number generator was resetting for each year instead of incrementing globally for each asset type.

## The Solution

Serial numbers should be **unique across ALL years** for the same asset type:
- ✅ `ACOB/HQ/LAP/2023/001` (first laptop, acquired in 2023)
- ✅ `ACOB/HQ/LAP/2024/002` (second laptop, acquired in 2024)
- ✅ `ACOB/HQ/LAP/2024/003` (third laptop, acquired in 2024)
- ✅ `ACOB/HQ/LAP/2025/004` (fourth laptop, acquired in 2025)

## How to Fix

### Option 1: Run the SQL Script Directly (Recommended)

1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/itqegqxeqkeogwrvlzlj
2. Go to the **SQL Editor** tab
3. Create a new query
4. Copy and paste the contents of `fix_asset_serials.sql`
5. Click **Run**
6. Check the output to see what was updated

### Option 2: Use Supabase CLI

```bash
npx supabase db execute --file fix_asset_serials.sql --project-ref itqegqxeqkeogwrvlzlj
```

## What the Fix Does

1. **Updates the `get_next_asset_serial` function**
   - Now correctly searches across ALL years for the highest serial number
   - Increments from there for new assets

2. **Fixes all existing assets**
   - Re-numbers all assets by type
   - Ordered by year, then creation date
   - Assets created earlier get lower serial numbers
   - Example: If you have LAP assets from 2023 and 2024, they'll be numbered 001, 002, 003, etc. in order

3. **Verifies the fix**
   - Checks for any remaining duplicates (should be zero)
   - Shows the new serial number distribution

## After the Fix

- All existing assets will have unique serial numbers
- New assets will automatically get the next available serial number
- The year in the code shows when it was acquired, but the serial number is global

## Example Before & After

### Before:
```
ACOB/HQ/LAP/2024/001 (created first)
ACOB/HQ/LAP/2024/002
ACOB/HQ/LAP/2024/003
ACOB/HQ/LAP/2024/004
ACOB/HQ/LAP/2023/001 (created after the 2024 ones - DUPLICATE SERIAL!)
```

### After:
```
ACOB/HQ/LAP/2023/005 (now has serial 005, not 001)
ACOB/HQ/LAP/2024/001
ACOB/HQ/LAP/2024/002
ACOB/HQ/LAP/2024/003
ACOB/HQ/LAP/2024/004
```

## Notes

- The acquisition year **cannot be edited** after creation because it's part of the unique code
- If you need to change the year, you'll need to delete and recreate the asset
- This is working as designed to maintain data integrity
