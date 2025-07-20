-- Create function to add is_prioritized column
CREATE OR REPLACE FUNCTION add_is_prioritized_column()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'queue'
    AND column_name = 'is_prioritized'
  ) THEN
    ALTER TABLE queue
    ADD COLUMN is_prioritized boolean DEFAULT false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the RPC function
CREATE OR REPLACE FUNCTION add_is_prioritized_column()
RETURNS void AS $$
BEGIN
  PERFORM add_is_prioritized_column();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 