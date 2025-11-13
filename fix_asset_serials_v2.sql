-- ============================================
-- FIX ASSET SERIAL NUMBERS - CORRECT LOGIC
-- ============================================
-- RULES:
-- 1. Serial number 001 = first asset acquired (earliest year)
-- 2. Cannot have same serial number across different years (e.g., no LAP/2023/005 AND LAP/2024/005)
-- 3. Cannot add earlier years after later years exist (no LAP/2023 if LAP/2024 already exists)
-- 4. Year represents actual acquisition year and should match creation date
-- ============================================

-- Step 1: Find and DELETE any assets that violate the rules
DO $$
DECLARE
  violation_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Checking for Rule Violations ===';

  -- Find assets with years EARLIER than existing assets of same type
  -- (This violates time - you can't acquire something in 2023 after acquiring in 2024)
  FOR violation_record IN
    WITH asset_year_stats AS (
      SELECT
        asset_type,
        MIN(acquisition_year) as earliest_year,
        MAX(acquisition_year) as latest_year
      FROM assets
      GROUP BY asset_type
    ),
    problem_assets AS (
      SELECT
        a.id,
        a.unique_code,
        a.asset_type,
        a.acquisition_year,
        a.created_at,
        s.earliest_year,
        CASE
          WHEN a.acquisition_year < s.earliest_year THEN 'Earlier year added after later year'
          ELSE NULL
        END as violation_reason
      FROM assets a
      JOIN asset_year_stats s ON a.asset_type = s.asset_type
      WHERE a.acquisition_year < s.earliest_year
        AND a.created_at > (
          SELECT MIN(created_at)
          FROM assets a2
          WHERE a2.asset_type = a.asset_type
          AND a2.acquisition_year > a.acquisition_year
        )
    )
    SELECT * FROM problem_assets WHERE violation_reason IS NOT NULL
  LOOP
    RAISE NOTICE 'DELETING: % (Type: %, Year: %, Created: %) - Reason: %',
      violation_record.unique_code,
      violation_record.asset_type,
      violation_record.acquisition_year,
      violation_record.created_at,
      violation_record.violation_reason;

    -- Delete the violating asset
    DELETE FROM assets WHERE id = violation_record.id;
    deleted_count := deleted_count + 1;
  END LOOP;

  -- Find and delete assets with duplicate serial numbers (same 3 digits across different years)
  FOR violation_record IN
    WITH duplicate_serials AS (
      SELECT
        SUBSTRING(unique_code FROM '[0-9]+$') as serial_number,
        asset_type,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as asset_ids,
        ARRAY_AGG(unique_code ORDER BY created_at DESC) as codes,
        ARRAY_AGG(created_at ORDER BY created_at DESC) as dates
      FROM assets
      GROUP BY asset_type, SUBSTRING(unique_code FROM '[0-9]+$')
      HAVING COUNT(*) > 1
    )
    SELECT
      asset_ids[1] as id_to_delete,
      codes[1] as code_to_delete,
      asset_type,
      serial_number,
      codes[2] as original_code
    FROM duplicate_serials
  LOOP
    RAISE NOTICE 'DELETING DUPLICATE: % (keeps: %) - Serial: % appears in both',
      violation_record.code_to_delete,
      violation_record.original_code,
      violation_record.serial_number;

    -- Delete the newer duplicate (keep the older one)
    DELETE FROM assets WHERE id = violation_record.id_to_delete;
    deleted_count := deleted_count + 1;
  END LOOP;

  RAISE NOTICE '=== Deleted % violating assets ===', deleted_count;
END $$;

-- Step 2: Update the function to prevent future violations
DROP FUNCTION IF EXISTS get_next_asset_serial(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_next_asset_serial(asset_code TEXT, year INTEGER)
RETURNS TEXT AS $$
DECLARE
  next_serial INTEGER;
  serial_str TEXT;
  min_year INTEGER;
  max_year INTEGER;
BEGIN
  -- Get the year range for this asset type
  SELECT
    MIN(acquisition_year),
    MAX(acquisition_year)
  INTO min_year, max_year
  FROM assets
  WHERE asset_type = asset_code;

  -- If assets exist, check if we're trying to add an earlier year
  IF min_year IS NOT NULL AND year < min_year THEN
    RAISE EXCEPTION 'Cannot add asset with year % because assets from year % already exist. You cannot acquire assets in the past!',
      year, min_year;
  END IF;

  -- Find the highest serial number across ALL years
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER
    )
  ), 0) + 1
  INTO next_serial
  FROM assets
  WHERE unique_code ~ ('^ACOB/HQ/' || asset_code || '/[0-9]{4}/[0-9]{3}$');

  -- Format as 3-digit serial
  serial_str := LPAD(next_serial::TEXT, 3, '0');

  RETURN 'ACOB/HQ/' || asset_code || '/' || year::text || '/' || serial_str;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_next_asset_serial(TEXT, INTEGER) TO authenticated;

-- Step 3: Verify the fix - Check for duplicate serials
SELECT
  'DUPLICATE SERIALS CHECK (should be empty)' as check_type,
  asset_type,
  SUBSTRING(unique_code FROM '[0-9]+$') as serial,
  COUNT(*) as occurrences,
  STRING_AGG(unique_code, ', ') as codes
FROM assets
GROUP BY asset_type, SUBSTRING(unique_code FROM '[0-9]+$')
HAVING COUNT(*) > 1;

-- Step 4: Show current asset distribution
SELECT
  asset_type,
  COUNT(*) as total_assets,
  MIN(acquisition_year) as first_year,
  MAX(acquisition_year) as last_year,
  MIN(CAST(SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER)) as first_serial,
  MAX(CAST(SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER)) as last_serial,
  STRING_AGG(DISTINCT acquisition_year::TEXT, ', ' ORDER BY acquisition_year::TEXT) as years_present
FROM assets
GROUP BY asset_type
ORDER BY asset_type;
