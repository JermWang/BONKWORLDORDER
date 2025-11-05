-- Create global_strikes table
CREATE TABLE global_strikes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial row
INSERT INTO global_strikes (id, count) VALUES (1, 0);

-- Create function to increment strikes
CREATE OR REPLACE FUNCTION increment_strikes()
RETURNS BIGINT AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE global_strikes
  SET count = count + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE global_strikes;

-- Create nuke_launches table to track every launch
CREATE TABLE nuke_launches (
  id BIGSERIAL PRIMARY KEY,
  launched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT,
  user_agent TEXT,
  ip_address INET
);

-- Create index for performance
CREATE INDEX idx_nuke_launches_launched_at ON nuke_launches(launched_at DESC);

-- Optional: Create a trigger to auto-increment global_strikes on insert
CREATE OR REPLACE FUNCTION increment_global_on_launch()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE global_strikes SET count = count + 1, updated_at = NOW() WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_global
AFTER INSERT ON nuke_launches
FOR EACH ROW
EXECUTE FUNCTION increment_global_on_launch();

