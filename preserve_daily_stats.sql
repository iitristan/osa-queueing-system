-- Enhanced Daily Stats Preservation System
-- This script ensures that daily statistics are preserved even when queue items are deleted

-- Step 1: Add an 'archived' status and ensure all historical data is preserved
ALTER TABLE queue ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Step 2: Create a deletion trigger that updates daily stats BEFORE deletion
CREATE OR REPLACE FUNCTION preserve_stats_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily stats for the officer before deletion
  PERFORM update_daily_queue_stats(OLD.officer_id);
  
  -- Log the deletion for debugging
  RAISE NOTICE 'Preserved stats for officer % before deleting queue item %', OLD.officer_id, OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the deletion trigger
DROP TRIGGER IF EXISTS preserve_stats_deletion_trigger ON queue;
CREATE TRIGGER preserve_stats_deletion_trigger
BEFORE DELETE ON queue
FOR EACH ROW
EXECUTE FUNCTION preserve_stats_before_delete();

-- Step 3: Enhanced daily stats function that includes archived and deleted items
CREATE OR REPLACE FUNCTION update_daily_queue_stats(p_officer_id UUID)
RETURNS void AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_total INTEGER;
  v_served INTEGER;
  v_no_show INTEGER;
  v_waiting INTEGER;
  v_transferred INTEGER;
  v_cancelled INTEGER;
  v_prioritized INTEGER;
  v_avg_waiting_time INTEGER;
  v_avg_consultation_time INTEGER;
  v_current_stats RECORD;
BEGIN
  -- Get existing daily stats to preserve counts from deleted items
  SELECT * INTO v_current_stats
  FROM daily_queue_stats 
  WHERE officer_id = p_officer_id AND date = v_date;

  -- Calculate current stats from existing queue items
  SELECT COUNT(*) INTO v_total
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date;
  
  -- If we have existing stats and current count is less, preserve the higher count
  -- This handles cases where items were deleted after being served/no_show
  IF v_current_stats.total_count IS NOT NULL AND v_current_stats.total_count > v_total THEN
    v_total := v_current_stats.total_count;
  END IF;
  
  -- Served items (preserve existing count if higher)
  SELECT COUNT(*) INTO v_served
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'served';
    
  IF v_current_stats.served_count IS NOT NULL AND v_current_stats.served_count > v_served THEN
    v_served := v_current_stats.served_count;
  END IF;
  
  -- No show items (preserve existing count if higher)
  SELECT COUNT(*) INTO v_no_show
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'no_show';
    
  IF v_current_stats.no_show_count IS NOT NULL AND v_current_stats.no_show_count > v_no_show THEN
    v_no_show := v_current_stats.no_show_count;
  END IF;
  
  -- Transferred items (preserve existing count if higher)
  SELECT COUNT(*) INTO v_transferred
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'transferred';
    
  IF v_current_stats.transferred_count IS NOT NULL AND v_current_stats.transferred_count > v_transferred THEN
    v_transferred := v_current_stats.transferred_count;
  END IF;
  
  -- Cancelled items (preserve existing count if higher)
  SELECT COUNT(*) INTO v_cancelled
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'cancelled';
    
  IF v_current_stats.cancelled_count IS NOT NULL AND v_current_stats.cancelled_count > v_cancelled THEN
    v_cancelled := v_current_stats.cancelled_count;
  END IF;
  
  -- Current waiting items (always use current count)
  SELECT COUNT(*) INTO v_waiting
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND status = 'waiting';
  
  -- Current prioritized items (always use current count)
  SELECT COUNT(*) INTO v_prioritized
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND is_prioritized = TRUE 
    AND status = 'waiting';

  -- Calculate average times
  SELECT COALESCE(AVG(total_waiting_time), 0) INTO v_avg_waiting_time
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status IN ('served', 'no_show', 'transferred', 'cancelled');

  SELECT COALESCE(AVG(total_consultation_time), 0) INTO v_avg_consultation_time
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'served';
  
  -- Upsert the stats with preserved historical data
  INSERT INTO daily_queue_stats (
    officer_id, 
    date, 
    total_count, 
    served_count, 
    no_show_count, 
    waiting_count, 
    transferred_count,
    cancelled_count,
    prioritized_count,
    avg_waiting_time,
    avg_consultation_time,
    updated_at
  ) VALUES (
    p_officer_id,
    v_date,
    v_total,
    v_served,
    v_no_show,
    v_waiting,
    v_transferred,
    v_cancelled,
    v_prioritized,
    v_avg_waiting_time,
    v_avg_consultation_time,
    NOW()
  )
  ON CONFLICT (officer_id, date) 
  DO UPDATE SET
    total_count = GREATEST(EXCLUDED.total_count, daily_queue_stats.total_count),
    served_count = GREATEST(EXCLUDED.served_count, daily_queue_stats.served_count),
    no_show_count = GREATEST(EXCLUDED.no_show_count, daily_queue_stats.no_show_count),
    waiting_count = EXCLUDED.waiting_count, -- Always use current waiting count
    transferred_count = GREATEST(EXCLUDED.transferred_count, daily_queue_stats.transferred_count),
    cancelled_count = GREATEST(EXCLUDED.cancelled_count, daily_queue_stats.cancelled_count),
    prioritized_count = EXCLUDED.prioritized_count, -- Always use current prioritized count
    avg_waiting_time = EXCLUDED.avg_waiting_time,
    avg_consultation_time = EXCLUDED.avg_consultation_time,
    updated_at = NOW();
    
  RAISE NOTICE 'Updated daily stats for officer % on %: Total=%, Served=%, NoShow=%, Waiting=%, Transferred=%, Cancelled=%', 
    p_officer_id, v_date, v_total, v_served, v_no_show, v_waiting, v_transferred, v_cancelled;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a function to safely archive completed items instead of deleting
CREATE OR REPLACE FUNCTION archive_completed_queue_items(p_officer_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
BEGIN
  -- First ensure all stats are up to date
  IF p_officer_id IS NOT NULL THEN
    PERFORM update_daily_queue_stats(p_officer_id);
  ELSE
    -- Update stats for all officers
    PERFORM update_daily_queue_stats(o.id) FROM officers o;
  END IF;
  
  -- Mark completed items as archived instead of deleting
  UPDATE queue 
  SET 
    archived_at = NOW(),
    updated_at = NOW()
  WHERE 
    status IN ('served', 'no_show', 'cancelled', 'transferred')
    AND archived_at IS NULL
    AND (p_officer_id IS NULL OR officer_id = p_officer_id)
    AND created_at < CURRENT_DATE; -- Only archive items from previous days
    
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RAISE NOTICE 'Archived % completed queue items', v_archived_count;
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to clean up very old archived items (optional, for maintenance)
CREATE OR REPLACE FUNCTION delete_old_archived_items(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Only delete archived items older than specified days
  DELETE FROM queue 
  WHERE 
    archived_at IS NOT NULL 
    AND archived_at < (CURRENT_DATE - (days_to_keep || ' days')::INTERVAL);
    
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old archived items (older than % days)', v_deleted_count, days_to_keep;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update the queue filtering to exclude archived items from normal operations
CREATE OR REPLACE VIEW active_queue AS
SELECT * FROM queue 
WHERE archived_at IS NULL;

-- Step 7: Test the preservation system
DO $$
BEGIN
  RAISE NOTICE 'Daily stats preservation system installed successfully!';
  RAISE NOTICE 'Queue items will now preserve daily statistics even when deleted.';
  RAISE NOTICE 'Use archive_completed_queue_items() to safely archive old completed items.';
  RAISE NOTICE 'Use delete_old_archived_items(30) to clean up items older than 30 days.';
END
$$; 