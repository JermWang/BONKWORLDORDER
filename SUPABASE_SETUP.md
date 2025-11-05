# Supabase Setup Guide

## Database Schema

Create a new table in your Supabase project:

```sql
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
```

## Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project settings:
- Project URL: Settings → API → Project URL
- Anon key: Settings → API → Project API keys → `anon` `public`

## Enable Real-time

In your Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for the `global_strikes` table
3. Select the `UPDATE` event

## Row-Level Security (Optional)

For production, add RLS policies:

```sql
-- Enable RLS
ALTER TABLE global_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuke_launches ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read global strikes
CREATE POLICY "Anyone can read global strikes"
  ON global_strikes FOR SELECT
  USING (true);

-- Allow anyone to insert launches
CREATE POLICY "Anyone can insert launches"
  ON nuke_launches FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read launch history
CREATE POLICY "Anyone can read launches"
  ON nuke_launches FOR SELECT
  USING (true);
```

## Query Examples

```sql
-- Get total launches
SELECT count FROM global_strikes WHERE id = 1;

-- Get recent launches (last 100)
SELECT * FROM nuke_launches ORDER BY launched_at DESC LIMIT 100;

-- Get launches per hour (last 24h)
SELECT 
  date_trunc('hour', launched_at) as hour,
  COUNT(*) as launches
FROM nuke_launches
WHERE launched_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Get launches per day (last 30 days)
SELECT 
  date_trunc('day', launched_at) as day,
  COUNT(*) as launches
FROM nuke_launches
WHERE launched_at > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

## Testing

After setup, restart your dev server:
```bash
npm run dev
```

The nuke button will now use Supabase for real-time global strike tracking!
