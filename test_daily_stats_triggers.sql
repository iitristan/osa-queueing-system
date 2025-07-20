-- Test Daily Stats Triggers
-- This script helps verify that daily stats are updating when queue status changes

-- First, let's check if the daily stats table exists and has data
SELECT 'Checking daily stats table...' as step;
SELECT 
  officer_id,
  total_count,
  served_count,
  no_show_count,
  waiting_count,
  date,
  updated_at
FROM daily_queue_stats 
WHERE date = CURRENT_DATE
ORDER BY updated_at DESC
LIMIT 10;

-- Check if triggers exist
SELECT 'Checking triggers...' as step;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'queue'
ORDER BY trigger_name;

-- Check if the update function exists
SELECT 'Checking functions...' as step;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%daily_stats%'
ORDER BY routine_name;

-- Test the function manually for one officer
SELECT 'Testing function for first officer...' as step;
DO $$
DECLARE
  v_officer_id UUID;
BEGIN
  -- Get the first officer
  SELECT id INTO v_officer_id FROM officers LIMIT 1;
  
  IF v_officer_id IS NOT NULL THEN
    -- Call the function
    PERFORM update_daily_queue_stats(v_officer_id);
    RAISE NOTICE 'Successfully called update_daily_queue_stats for officer %', v_officer_id;
  ELSE
    RAISE NOTICE 'No officers found in the database';
  END IF;
END
$$;

-- Show updated stats after function call
SELECT 'Updated daily stats:' as step;
SELECT 
  COALESCE(u.name, 'Officer ' || o.prefix) as officer_name,
  o.prefix,
  dqs.total_count,
  dqs.served_count,
  dqs.no_show_count,
  dqs.waiting_count,
  dqs.updated_at
FROM daily_queue_stats dqs
JOIN officers o ON dqs.officer_id = o.id
LEFT JOIN users u ON o.user_id = u.id
WHERE dqs.date = CURRENT_DATE
ORDER BY dqs.updated_at DESC;

SELECT 'Test completed! If you see data above, the triggers should be working.' as result; 