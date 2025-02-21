/*
  # Create help_center table

  1. New Tables
    - `help_articles`
      - `id` (uuid, primary key)
      - `title` (text)
      - `category` (text)
      - `content` (jsonb - array of sections)
      - `icon` (text - MaterialCommunityIcons name)
      - `order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `help_articles` table
    - Add policy for public read access
    - Add policy for admin write access
*/

-- Create help_articles table
CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  content jsonb NOT NULL,
  icon text NOT NULL,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Help articles are viewable by everyone"
  ON help_articles FOR SELECT
  USING (true);

CREATE POLICY "Only staff can modify help articles"
  ON help_articles FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ));

-- Insert initial help articles
INSERT INTO help_articles (title, category, icon, "order", content) VALUES
(
  'Getting Started',
  'basics',
  'rocket-launch',
  1,
  '[
    {
      "title": "Creating Your Account",
      "steps": [
        "Download the app from your device''s app store",
        "Open the app and tap ''Sign Up''",
        "Enter your email and create a password",
        "Complete your profile with a photo and bio",
        "Choose your role (Member, Trainer, or Guest)"
      ]
    },
    {
      "title": "Setting Up Your Profile",
      "steps": [
        "Tap the Profile tab",
        "Add a profile picture that clearly shows your face",
        "Write a brief bio about yourself",
        "Add your favorite workout type",
        "Set your fitness goals"
      ]
    }
  ]'::jsonb
),
(
  'Making Posts',
  'content',
  'post',
  2,
  '[
    {
      "title": "Creating a New Post",
      "steps": [
        "Tap the + button in the bottom center",
        "Write your post content",
        "Add photos or videos (optional)",
        "Use mentions (@username) to tag other users",
        "Tap ''Post'' to share with your followers"
      ]
    },
    {
      "title": "Post Guidelines",
      "steps": [
        "Keep content fitness and wellness focused",
        "Be respectful and supportive of others",
        "Avoid sharing personal information",
        "Use appropriate language and imagery",
        "Give credit when sharing others'' content"
      ]
    }
  ]'::jsonb
),
(
  'Messaging',
  'communication',
  'message',
  3,
  '[
    {
      "title": "Starting a Conversation",
      "steps": [
        "Go to the Messages tab",
        "Tap the compose button in the top right",
        "Search for a user by name or username",
        "Select the user to start chatting",
        "Type your message and hit send"
      ]
    },
    {
      "title": "Managing Conversations",
      "steps": [
        "Swipe left on a conversation to delete",
        "Tap and hold to mark as read/unread",
        "Block users from their profile page",
        "Report inappropriate messages",
        "Clear conversation history in settings"
      ]
    }
  ]'::jsonb
),
(
  'Challenges',
  'features',
  'trophy',
  4,
  '[
    {
      "title": "Joining a Challenge",
      "steps": [
        "Go to the Challenge tab",
        "Browse available challenges",
        "Tap ''Join Challenge'' to participate",
        "Read the rules and requirements",
        "Start tracking your progress"
      ]
    },
    {
      "title": "Tracking Progress",
      "steps": [
        "Log your activities regularly",
        "Check the leaderboard for rankings",
        "Share updates with fellow participants",
        "Earn badges for milestones",
        "Complete challenges to win rewards"
      ]
    }
  ]'::jsonb
);