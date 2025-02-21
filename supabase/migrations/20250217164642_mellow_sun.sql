-- Update the status of the existing challenge to 'active'
UPDATE challenges
SET status = 'active'
WHERE title = 'End March';

-- Create a default challenge if none exists
INSERT INTO challenges (
  title,
  subtitle,
  start_date,
  end_date,
  target_value,
  unit,
  description,
  rules,
  rewards,
  status
)
SELECT
  'End March',
  '160 KM Challenge',
  '2025-03-01 00:00:00+00',
  '2025-03-31 23:59:59+00',
  160,
  'KM',
  'Track your workouts and compete with other members to reach the 160 KM goal by the end of March. The more consistent you are, the higher you''ll climb on the leaderboard!',
  '[
    "Complete 160 KM of cardio activities",
    "All activities must be tracked in the app",
    "Challenge ends on March 31st at midnight"
  ]'::jsonb,
  '[
    {"place": 1, "title": "1st Place", "reward": "3 months free membership"},
    {"place": 2, "title": "2nd Place", "reward": "2 months free membership"},
    {"place": 3, "title": "3rd Place", "reward": "1 month free membership"}
  ]'::jsonb,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM challenges WHERE status = 'active'
);