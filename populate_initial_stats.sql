-- This script will populate the daily_queue_stats table with initial data from existing queue records
-- Run this in the SQL Editor after creating the table structure

-- First ensure the daily_queue_stats table exists with all required columns
CREATE TABLE IF NOT EXISTS daily_queue_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  total_count INTEGER DEFAULT 0,
  served_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  waiting_count INTEGER DEFAULT 0,
  transferred_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  prioritized_count INTEGER DEFAULT 0,
  avg_waiting_time INTEGER DEFAULT 0,
  avg_consultation_time INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(officer_id, date)
);

-- Clear existing data for today (fresh start)
DELETE FROM daily_queue_stats WHERE date = CURRENT_DATE;

-- Insert data for today aggregated by officer and date
-- This will include all officers, even those with no queue items today
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
  avg_consultation_time
)
SELECT 
  o.id as officer_id,
  CURRENT_DATE as date,
  COALESCE(q.total_count, 0) as total_count,
  COALESCE(q.served_count, 0) as served_count,
  COALESCE(q.no_show_count, 0) as no_show_count,
  COALESCE(q.waiting_count, 0) as waiting_count,
  COALESCE(q.transferred_count, 0) as transferred_count,
  COALESCE(q.cancelled_count, 0) as cancelled_count,
  COALESCE(q.prioritized_count, 0) as prioritized_count,
  COALESCE(q.avg_waiting_time, 0) as avg_waiting_time,
  COALESCE(q.avg_consultation_time, 0) as avg_consultation_time
FROM 
  officers o
LEFT JOIN (
  SELECT 
    officer_id,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'served') as served_count,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting_count,
    COUNT(*) FILTER (WHERE status = 'transferred') as transferred_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE is_prioritized = TRUE AND status = 'waiting') as prioritized_count,
    COALESCE(AVG(total_waiting_time) FILTER (WHERE status IN ('served', 'no_show', 'transferred', 'cancelled')), 0) as avg_waiting_time,
    COALESCE(AVG(total_consultation_time) FILTER (WHERE status = 'served'), 0) as avg_consultation_time
  FROM 
    queue
  WHERE 
    DATE(created_at) = CURRENT_DATE
  GROUP BY 
    officer_id
) q ON o.id = q.officer_id;

-- Create a function to update all officers' stats for today
CREATE OR REPLACE FUNCTION update_all_officers_stats_for_today()
RETURNS void AS $$
DECLARE
  v_officer_id UUID;
BEGIN
  FOR v_officer_id IN SELECT id FROM officers LOOP
    PERFORM update_daily_queue_stats(v_officer_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the update function to ensure all stats are current
SELECT update_all_officers_stats_for_today();

-- Verify the results
SELECT 
  o.name,
  o.prefix,
  dqs.*
FROM daily_queue_stats dqs
JOIN officers o ON dqs.officer_id = o.id
WHERE dqs.date = CURRENT_DATE
ORDER BY o.prefix; 