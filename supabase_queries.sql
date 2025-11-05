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

