-- Create tables
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role user_role DEFAULT 'admin' NOT NULL,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  online BOOLEAN DEFAULT FALSE,
  access BOOLEAN DEFAULT TRUE NOT NULL,
  prefix TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE officers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  role TEXT NOT NULL,
  counter_type TEXT NOT NULL,
  online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' NOT NULL,
  is_prioritized BOOLEAN DEFAULT false NOT NULL,
  priority_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  full_name TEXT,
  college TEXT,
  waiting_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consultation_start_time TIMESTAMP WITH TIME ZONE,
  consultation_end_time TIMESTAMP WITH TIME ZONE,
  total_waiting_time INTEGER DEFAULT 0, -- in seconds
  total_consultation_time INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE queue_counters (
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  counter INTEGER DEFAULT 1 NOT NULL,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (officer_id)
);

-- Create daily queue stats table
CREATE TABLE daily_queue_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  officer_id UUID REFERENCES officers(id) ON DELETE CASCADE,
  total_count INTEGER DEFAULT 0,
  served_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  waiting_count INTEGER DEFAULT 0,
  transferred_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  prioritized_count INTEGER DEFAULT 0,
  avg_waiting_time INTEGER DEFAULT 0, -- in seconds
  avg_consultation_time INTEGER DEFAULT 0, -- in seconds
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(officer_id, date)
);

-- Add indexes for daily_queue_stats
CREATE INDEX daily_queue_stats_officer_id_idx ON daily_queue_stats(officer_id);
CREATE INDEX daily_queue_stats_date_idx ON daily_queue_stats(date);

-- Disable RLS for daily_queue_stats
ALTER TABLE daily_queue_stats DISABLE ROW LEVEL SECURITY;

-- Create function to update daily queue stats
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
  
  -- Transferred should be all transferred items today (originally created for this officer)
  SELECT COUNT(*) INTO v_transferred
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'transferred';
  
  -- Cancelled should be all cancelled items today
  SELECT COUNT(*) INTO v_cancelled
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'cancelled';
  
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

  -- Calculate average waiting time for completed items today
  SELECT COALESCE(AVG(total_waiting_time), 0) INTO v_avg_waiting_time
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status IN ('served', 'no_show', 'transferred', 'cancelled');

  -- Calculate average consultation time for served items today
  SELECT COALESCE(AVG(total_consultation_time), 0) INTO v_avg_consultation_time
  FROM queue
  WHERE 
    officer_id = p_officer_id
    AND DATE(created_at) = v_date
    AND status = 'served';
  
  -- Upsert the stats for today
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
    total_count = v_total,
    served_count = v_served,
    no_show_count = v_no_show,
    waiting_count = v_waiting,
    transferred_count = v_transferred,
    cancelled_count = v_cancelled,
    prioritized_count = v_prioritized,
    avg_waiting_time = v_avg_waiting_time,
    avg_consultation_time = v_avg_consultation_time,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger function that will update stats when queue status changes
CREATE OR REPLACE FUNCTION trigger_update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the current officer (NEW.officer_id)
  PERFORM update_daily_queue_stats(NEW.officer_id);
  
  -- If this is an update and officer_id changed (transfer), also update the old officer's stats
  IF TG_OP = 'UPDATE' AND OLD.officer_id IS DISTINCT FROM NEW.officer_id THEN
    PERFORM update_daily_queue_stats(OLD.officer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update stats on relevant queue changes
CREATE TRIGGER queue_insert_trigger
AFTER INSERT ON queue
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_stats();

CREATE TRIGGER queue_update_trigger
AFTER UPDATE OF status, is_prioritized, officer_id ON queue
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.is_prioritized IS DISTINCT FROM NEW.is_prioritized OR OLD.officer_id IS DISTINCT FROM NEW.officer_id)
EXECUTE FUNCTION trigger_update_daily_stats();

-- Create indexes
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_role_idx ON users(role);
CREATE INDEX officers_user_id_idx ON officers(user_id);
CREATE INDEX queue_officer_id_idx ON queue(officer_id);
CREATE INDEX queue_status_idx ON queue(status);
CREATE INDEX queue_priority_idx ON queue(is_prioritized);

-- Disable Row Level Security (RLS)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE officers DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_counters DISABLE ROW LEVEL SECURITY;

-- Create priority helper functions
CREATE OR REPLACE FUNCTION prioritize_queue_item(item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE queue 
  SET 
    is_prioritized = TRUE, 
    priority_timestamp = NOW()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION unprioritize_queue_item(item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE queue 
  SET 
    is_prioritized = FALSE, 
    priority_timestamp = NULL
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update consultation time when status changes
CREATE OR REPLACE FUNCTION update_consultation_time()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'served', start consultation timer
  IF NEW.status = 'served' AND OLD.status = 'waiting' THEN
    NEW.consultation_start_time := NOW();
    NEW.total_waiting_time := EXTRACT(EPOCH FROM (NEW.consultation_start_time - NEW.waiting_start_time));
  -- When status changes to 'no_show' or 'transferred', end waiting timer
  ELSIF (NEW.status = 'no_show' OR NEW.status = 'transferred') AND OLD.status = 'waiting' THEN
    NEW.total_waiting_time := EXTRACT(EPOCH FROM (NOW() - NEW.waiting_start_time));
  -- When status changes from 'served' to any other status, end consultation timer
  ELSIF OLD.status = 'served' AND NEW.status != 'served' THEN
    NEW.consultation_end_time := NOW();
    NEW.total_consultation_time := EXTRACT(EPOCH FROM (NEW.consultation_end_time - NEW.consultation_start_time));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consultation time updates
CREATE TRIGGER queue_consultation_time_trigger
BEFORE UPDATE OF status ON queue
FOR EACH ROW
EXECUTE FUNCTION update_consultation_time();

-- Add indexes for the new time-related fields
CREATE INDEX queue_waiting_start_time_idx ON queue(waiting_start_time);
CREATE INDEX queue_consultation_start_time_idx ON queue(consultation_start_time);
CREATE INDEX queue_total_waiting_time_idx ON queue(total_waiting_time);
CREATE INDEX queue_total_consultation_time_idx ON queue(total_consultation_time);
