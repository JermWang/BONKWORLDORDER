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

