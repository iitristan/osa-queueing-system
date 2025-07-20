-- Create functions to handle priority flag setting

-- Function to force set priority flag to true (uses explicit boolean type)
CREATE OR REPLACE FUNCTION force_set_priority(queue_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE queue 
  SET is_prioritized = true::boolean
  WHERE id = queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update priority with explicit boolean casting
CREATE OR REPLACE FUNCTION update_priority_with_boolean(p_queue_id UUID, p_is_prioritized BOOLEAN)
RETURNS void AS $$
BEGIN
  UPDATE queue 
  SET is_prioritized = p_is_prioritized::boolean
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function for direct priority update via SQL
CREATE OR REPLACE FUNCTION prioritize_queue_item(item_id UUID)
RETURNS void AS $$
BEGIN
  -- First ensure the column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'queue'
    AND column_name = 'is_prioritized'
  ) THEN
    -- Use raw SQL with explicit boolean type
    EXECUTE 'UPDATE queue SET is_prioritized = TRUE WHERE id = $1' USING item_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create RPC endpoints for these functions with security definer
CREATE OR REPLACE FUNCTION force_set_priority(queue_id UUID) 
RETURNS void AS $$
BEGIN
  PERFORM force_set_priority(queue_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_priority_with_boolean(p_queue_id UUID, p_is_prioritized BOOLEAN)
RETURNS void AS $$
BEGIN
  PERFORM update_priority_with_boolean(p_queue_id, p_is_prioritized);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION prioritize_queue_item(item_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM prioritize_queue_item(item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 