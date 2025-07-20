-- This script completely reverses the priority logic to use priority_timestamp as the source of truth
-- RUN THIS DIRECTLY IN SUPABASE SQL EDITOR

-- Step 1: Make sure priority_timestamp exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'queue'
    AND column_name = 'priority_timestamp'
  ) THEN
    ALTER TABLE queue
    ADD COLUMN priority_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END
$$;

-- Step 2: Reset all is_prioritized values to false to start fresh
UPDATE queue SET is_prioritized = false;

-- Step 3: Create a trigger function that will automatically update is_prioritized
CREATE OR REPLACE FUNCTION update_is_prioritized()
RETURNS TRIGGER AS $$
BEGIN
  -- If priority_timestamp is set, then is_prioritized should be true
  IF NEW.priority_timestamp IS NOT NULL THEN
    NEW.is_prioritized := true;
  ELSE
    NEW.is_prioritized := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger on the queue table
DROP TRIGGER IF EXISTS set_is_prioritized ON queue;
CREATE TRIGGER set_is_prioritized
BEFORE INSERT OR UPDATE ON queue
FOR EACH ROW
EXECUTE FUNCTION update_is_prioritized();

-- Step 5: Create a function that only requires setting priority_timestamp
CREATE OR REPLACE FUNCTION prioritize_queue_item(item_id UUID, should_prioritize BOOLEAN)
RETURNS void AS $$
BEGIN
  IF should_prioritize THEN
    -- Prioritize the item by setting priority_timestamp
    UPDATE queue 
    SET priority_timestamp = NOW()
    WHERE id = item_id;
  ELSE
    -- Unprioritize the item by removing priority_timestamp
    UPDATE queue 
    SET priority_timestamp = NULL
    WHERE id = item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update any items with priority_timestamp but missing is_prioritized
UPDATE queue
SET is_prioritized = true
WHERE priority_timestamp IS NOT NULL AND is_prioritized = false;

-- Verify it's working
SELECT id, is_prioritized, priority_timestamp, pg_typeof(is_prioritized) as type
FROM queue
LIMIT 10; 