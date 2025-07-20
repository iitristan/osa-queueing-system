-- Quick Fix: Remove problematic triggers that are preventing queue insertion
-- This allows adding queue numbers to work immediately

-- Remove the triggers that are causing the insertion errors
DROP TRIGGER IF EXISTS queue_insert_trigger ON queue;
DROP TRIGGER IF EXISTS queue_update_trigger ON queue;
DROP TRIGGER IF EXISTS preserve_stats_deletion_trigger ON queue;

-- Remove the functions that don't work yet
DROP FUNCTION IF EXISTS trigger_update_daily_stats();
DROP FUNCTION IF EXISTS update_daily_queue_stats(UUID);
DROP FUNCTION IF EXISTS preserve_stats_before_delete();

-- Add the archived_at column if it doesn't exist (without breaking things)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'queue' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE queue ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END
$$;

-- Simple success message
SELECT 'Queue adding should now work! Run setup_daily_stats_table.sql when ready for full functionality.' as message; 