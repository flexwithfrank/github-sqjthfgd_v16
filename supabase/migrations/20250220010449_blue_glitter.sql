/*
  # Create app_content table

  1. New Tables
    - `app_content`
      - `id` (uuid, primary key)
      - `title` (text)
      - `subtitle` (text)
      - `description` (text)
      - `image_url` (text)
      - `features` (jsonb array of features)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `app_content` table
    - Add policy for public read access
    - Add policy for admin write access
*/

-- Create app_content table
CREATE TABLE IF NOT EXISTS app_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text NOT NULL,
  image_url text,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
  ON app_content
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin write access"
  ON app_content
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ));

-- Insert initial content
INSERT INTO app_content (
  title,
  subtitle,
  description,
  image_url,
  features
) VALUES (
  'Xconnect - Your Fitness Community',
  'Connect, Train, and Grow Together',
  'Xconnect is more than just a fitness app - it''s a community where trainers and fitness enthusiasts come together to share knowledge, track progress, and achieve their goals. Whether you''re a seasoned athlete or just starting your fitness journey, Xconnect provides the tools and support you need to succeed.',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=800&fit=crop',
  '[
    {
      "icon": "dumbbell",
      "title": "Workout Tracking",
      "description": "Log your workouts and track your progress with detailed analytics and insights"
    },
    {
      "icon": "trophy",
      "title": "Monthly Challenges",
      "description": "Participate in monthly fitness challenges and compete with other members"
    },
    {
      "icon": "account-group",
      "title": "Community Support",
      "description": "Connect with like-minded individuals and share your fitness journey"
    },
    {
      "icon": "certificate",
      "title": "Verified Trainers",
      "description": "Learn from certified fitness professionals and get expert guidance"
    },
    {
      "icon": "message",
      "title": "Direct Messaging",
      "description": "Communicate privately with trainers and other members"
    },
    {
      "icon": "chart-line",
      "title": "Progress Tracking",
      "description": "Visualize your fitness journey with detailed progress charts"
    }
  ]'::jsonb
);