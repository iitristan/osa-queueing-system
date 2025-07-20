-- Fixed Daily Stats Table Setup
-- This creates the basic table structure without requiring missing columns

-- Create the daily_queue_stats table
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

-- Add indexes
CREATE INDEX IF NOT EXISTS daily_queue_stats_officer_id_idx ON daily_queue_stats(officer_id);
CREATE INDEX IF NOT EXISTS daily_queue_stats_date_idx ON daily_queue_stats(date);

-- Disable RLS
ALTER TABLE daily_queue_stats DISABLE ROW LEVEL SECURITY;

-- Create basic daily stats function (without requiring missing columns)
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
BEGIN
  -- Calculate stats for today
  SELECT COUNT(*) INTO v_total
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date;
  
  SELECT COUNT(*) INTO v_served
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'served';
  
  SELECT COUNT(*) INTO v_no_show
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'no_show';
  
  SELECT COUNT(*) INTO v_transferred
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'transferred';
  
  SELECT COUNT(*) INTO v_cancelled
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'cancelled';
  
  SELECT COUNT(*) INTO v_waiting
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND status = 'waiting';
  
  SELECT COUNT(*) INTO v_prioritized
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND is_prioritized = TRUE 
    AND status = 'waiting';
  
  -- Insert or update daily stats (without time calculations for now)
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
    0, -- avg_waiting_time (placeholder)
    0, -- avg_consultation_time (placeholder)
    NOW()
  )
  ON CONFLICT (officer_id, date) 
  DO UPDATE SET
    total_count = EXCLUDED.total_count,
    served_count = EXCLUDED.served_count,
    no_show_count = EXCLUDED.no_show_count,
    waiting_count = EXCLUDED.waiting_count,
    transferred_count = EXCLUDED.transferred_count,
    cancelled_count = EXCLUDED.cancelled_count,
    prioritized_count = EXCLUDED.prioritized_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE OR REPLACE FUNCTION trigger_update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_daily_queue_stats(NEW.officer_id);
  
  IF TG_OP = 'UPDATE' AND OLD.officer_id IS DISTINCT FROM NEW.officer_id THEN
    PERFORM update_daily_queue_stats(OLD.officer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS queue_insert_trigger ON queue;
CREATE TRIGGER queue_insert_trigger
AFTER INSERT ON queue
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats();

DROP TRIGGER IF EXISTS queue_update_trigger ON queue;
CREATE TRIGGER queue_update_trigger
AFTER UPDATE OF status, is_prioritized, officer_id ON queue
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.is_prioritized IS DISTINCT FROM NEW.is_prioritized OR OLD.officer_id IS DISTINCT FROM NEW.officer_id)
EXECUTE FUNCTION trigger_update_daily_stats();

-- Initialize stats for all officers for today (simplified version)
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
  0 as avg_waiting_time, -- Placeholder
  0 as avg_consultation_time -- Placeholder
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
    COUNT(*) FILTER (WHERE is_prioritized = TRUE AND status = 'waiting') as prioritized_count
  FROM 
    queue
  WHERE 
    DATE(created_at) = CURRENT_DATE
  GROUP BY 
    officer_id
) q ON o.id = q.officer_id
ON CONFLICT (officer_id, date) DO NOTHING;

-- Success message
SELECT 'Daily stats table created successfully! Queue adding and stats should now work.' as message; 