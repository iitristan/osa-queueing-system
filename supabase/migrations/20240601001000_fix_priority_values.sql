-- Cast all priority values to proper booleans
ALTER TABLE queue ALTER COLUMN is_prioritized TYPE boolean USING is_prioritized::boolean;

-- Fix all priority values in one go - this is absolutely foolproof
UPDATE queue
SET is_prioritized = 
  CASE 
    WHEN (is_prioritized IS NULL) THEN FALSE 
    WHEN (is_prioritized::text = 'false' OR is_prioritized::text = '0' OR is_prioritized::text = 'f' OR is_prioritized::text = 'False' OR is_prioritized::text = 'FALSE') THEN FALSE
    WHEN (is_prioritized::text = 'true' OR is_prioritized::text = '1' OR is_prioritized::text = 't' OR is_prioritized::text = 'True' OR is_prioritized::text = 'TRUE') THEN TRUE
    ELSE FALSE
  END;

-- Set priority timestamps for any prioritized items that don't have one
UPDATE queue
SET priority_timestamp = NOW()
WHERE is_prioritized = TRUE AND (priority_timestamp IS NULL);

-- Verify the fix worked
SELECT id, is_prioritized, typeof(is_prioritized) as priority_type
FROM queue
LIMIT 10; 