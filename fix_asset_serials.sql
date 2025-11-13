-- ============================================
-- STANDALONE SCRIPT TO FIX ASSET SERIAL NUMBERS
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Update the get_next_asset_serial function
DROP FUNCTION IF EXISTS get_next_asset_serial(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION get_next_asset_serial(asset_code TEXT, year INTEGER)
RETURNS TEXT AS $$
DECLARE
  next_serial INTEGER;
  serial_str TEXT;
BEGIN
  -- Find the highest serial number for this asset type across ALL years
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER
    )
  ), 0) + 1
  INTO next_serial
  FROM assets
  WHERE unique_code ~ ('^ACOB/HQ/' || asset_code || '/[0-9]{4}/[0-9]{3}$');

  -- Format as 3-digit serial (001, 002, etc.)
  serial_str := LPAD(next_serial::TEXT, 3, '0');

  RETURN 'ACOB/HQ/' || asset_code || '/' || year::text || '/' || serial_str;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_next_asset_serial(TEXT, INTEGER) TO authenticated;

-- Step 2: Fix all existing duplicate serial numbers
DO $$
DECLARE
  asset_record RECORD;
  current_serial INTEGER;
  new_unique_code TEXT;
  temp_unique_code TEXT;
  asset_type_code TEXT;
BEGIN
  RAISE NOTICE '=== Starting Serial Number Fix ===';

  -- First pass: Add temporary prefix to all codes to avoid conflicts
  RAISE NOTICE 'Step 2a: Temporarily renaming all assets...';
  UPDATE assets
  SET unique_code = 'TEMP_' || id || '_' || unique_code;

  -- Second pass: Assign correct serial numbers
  RAISE NOTICE 'Step 2b: Assigning correct serial numbers...';

  -- Process each asset type separately
  FOR asset_type_code IN
    SELECT DISTINCT asset_type FROM assets ORDER BY asset_type
  LOOP
    current_serial := 0;
    RAISE NOTICE 'Processing asset type: %', asset_type_code;

    -- For each asset of this type, ordered by year then creation date
    FOR asset_record IN
      SELECT id, asset_type, acquisition_year, unique_code, created_at
      FROM assets
      WHERE asset_type = asset_type_code
      ORDER BY acquisition_year ASC, created_at ASC
    LOOP
      current_serial := current_serial + 1;

      -- Generate new unique code
      new_unique_code := 'ACOB/HQ/' || asset_record.asset_type || '/' ||
                        asset_record.acquisition_year::text || '/' ||
                        LPAD(current_serial::TEXT, 3, '0');

      -- Update with new code
      UPDATE assets
      SET unique_code = new_unique_code
      WHERE id = asset_record.id;

      -- Extract original code from temp code
      temp_unique_code := SUBSTRING(asset_record.unique_code FROM 'TEMP_[^_]+_(.*)');

      IF temp_unique_code IS NOT NULL AND temp_unique_code != new_unique_code THEN
        RAISE NOTICE 'Updated: % → %', temp_unique_code, new_unique_code;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Fix Complete ===';
END $$;

-- Step 3: Verify no duplicates remain
SELECT
  unique_code,
  COUNT(*) as count
FROM assets
GROUP BY unique_code
HAVING COUNT(*) > 1;
-- Should return no rows

-- Step 4: Show the new serial number distribution
SELECT
  asset_type,
  COUNT(*) as total_assets,
  MIN(CAST(SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER)) as first_serial,
  MAX(CAST(SUBSTRING(unique_code FROM '[0-9]+$') AS INTEGER)) as last_serial
FROM assets
GROUP BY asset_type
ORDER BY asset_type;
