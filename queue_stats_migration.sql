-- Create a table for storing daily queue statistics
CREATE TABLE IF NOT EXISTS daily_queue_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  total_count INTEGER DEFAULT 0,
  served_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  waiting_count INTEGER DEFAULT 0,
  prioritized_count INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(officer_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS daily_queue_stats_officer_id_idx ON daily_queue_stats(officer_id);
CREATE INDEX IF NOT EXISTS daily_queue_stats_date_idx ON daily_queue_stats(date);

-- Disable Row Level Security on this table
ALTER TABLE daily_queue_stats DISABLE ROW LEVEL SECURITY;

-- Create a function to update daily queue stats
CREATE OR REPLACE FUNCTION update_daily_queue_stats(p_officer_id UUID)
RETURNS void AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_total INTEGER;
  v_served INTEGER;
  v_no_show INTEGER;
  v_waiting INTEGER;
  v_prioritized INTEGER;
BEGIN
  -- Calculate current stats for the officer
  -- Total should be all queue items created today
  SELECT COUNT(*) INTO v_total
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date;
  
  -- Served should be all served items today
  SELECT COUNT(*) INTO v_served
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'served';
  
  -- No show should be all no_show items today
  SELECT COUNT(*) INTO v_no_show
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'no_show';
  
  -- Waiting should reflect CURRENT waiting items only
  SELECT COUNT(*) INTO v_waiting
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND status = 'waiting';
  
  -- Prioritized should reflect CURRENT prioritized items
  SELECT COUNT(*) INTO v_prioritized
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND is_prioritized = TRUE 
    AND status = 'waiting';
  
  -- Upsert the stats for today
  INSERT INTO daily_queue_stats (
    officer_id, 
    date, 
    total_count, 
    served_count, 
    no_show_count, 
    waiting_count, 
    prioritized_count,
    updated_at
  ) VALUES (
    p_officer_id,
    v_date,
    v_total,
    v_served,
    v_no_show,
    v_waiting,
    v_prioritized,
    NOW()
  )
  ON CONFLICT (officer_id, date) 
  DO UPDATE SET
    total_count = v_total,
    served_count = v_served,
    no_show_count = v_no_show,
    waiting_count = v_waiting,
    prioritized_count = v_prioritized,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function that will update stats when queue status changes
CREATE OR REPLACE FUNCTION trigger_update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_daily_queue_stats(NEW.officer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update stats on relevant queue changes
CREATE TRIGGER queue_insert_trigger
AFTER INSERT ON queue
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats();

CREATE TRIGGER queue_update_trigger
AFTER UPDATE OF status, is_prioritized ON queue
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.is_prioritized IS DISTINCT FROM NEW.is_prioritized)
EXECUTE FUNCTION trigger_update_daily_stats(); 