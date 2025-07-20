-- This script completely rebuilds the is_prioritized column to force it to be a proper boolean
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR

-- Step 1: Create a temporary column
ALTER TABLE queue ADD COLUMN temp_is_prioritized boolean DEFAULT false;

-- Step 2: Copy values with explicit boolean conversion
UPDATE queue
SET temp_is_prioritized = 
  CASE 
    WHEN is_prioritized::text IN ('true', 't', '1', 'yes', 'y', 'on') THEN true
    ELSE false
  END;

-- Step 3: Drop the original column 
ALTER TABLE queue DROP COLUMN is_prioritized;

-- Step 4: Rename the temporary column to the original name
ALTER TABLE queue RENAME COLUMN temp_is_prioritized TO is_prioritized;

-- Step 5: Add NOT NULL constraint and default value
ALTER TABLE queue ALTER COLUMN is_prioritized SET DEFAULT false;
ALTER TABLE queue ALTER COLUMN is_prioritized SET NOT NULL;

-- Step 6: Create an index on the is_prioritized column
CREATE INDEX IF NOT EXISTS queue_is_prioritized_idx ON queue(is_prioritized);

-- Step 7: Set priority timestamps for prioritized items
UPDATE queue
SET priority_timestamp = NOW()
WHERE is_prioritized = true AND priority_timestamp IS NULL;

-- Step 8: Verify the column type and some values
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'queue' AND column_name = 'is_prioritized';

-- Check some values
SELECT 
  id, 
  officer_id,
  is_prioritized, 
  pg_typeof(is_prioritized) as type_check
FROM 
  queue
LIMIT 10; 