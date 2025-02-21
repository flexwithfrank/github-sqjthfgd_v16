-- Insert a test event
INSERT INTO events (
  title,
  description,
  image_url,
  start_date,
  end_date,
  location,
  location_url,
  highlights,
  created_by
)
SELECT
  'Boxing Fundamentals Workshop',
  'Join us for an intensive boxing workshop where you''ll learn proper form, basic combinations, and essential defensive techniques. Perfect for beginners and intermediate boxers looking to improve their skills.',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&h=800&fit=crop',
  now() + interval '2 days',
  now() + interval '2 days' + interval '3 hours',
  'Elite Boxing Gym',
  'https://maps.google.com/?q=Elite+Boxing+Gym',
  '[
    {
      "icon": "boxing-glove",
      "text": "Equipment provided"
    },
    {
      "icon": "account-group",
      "text": "Limited to 12 participants"
    },
    {
      "icon": "timer",
      "text": "3-hour intensive session"
    },
    {
      "icon": "water",
      "text": "Bring water bottle"
    }
  ]'::jsonb,
  (
    SELECT id 
    FROM profiles 
    WHERE role = 'trainer' 
    AND role_verified = true 
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 
  FROM profiles 
  WHERE role = 'trainer' 
  AND role_verified = true
);

-- Insert test RSVP
INSERT INTO event_rsvps (
  event_id,
  user_id,
  email,
  status
)
SELECT 
  e.id,
  p.id,
  'test@example.com',
  'attending'
FROM events e
CROSS JOIN profiles p
WHERE e.title = 'Boxing Fundamentals Workshop'
AND p.role = 'member'
LIMIT 1;