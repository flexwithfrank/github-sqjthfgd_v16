/*
  # Create legal_content table

  1. New Tables
    - `legal_content`
      - `id` (uuid, primary key)
      - `type` (text - 'privacy' or 'terms')
      - `title` (text)
      - `content` (jsonb - array of sections)
      - `last_updated` (timestamp)
      - `version` (text)

  2. Security
    - Enable RLS on `legal_content` table
    - Add policy for public read access
    - Add policy for admin write access
*/

-- Create legal_content table
CREATE TABLE IF NOT EXISTS legal_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('privacy', 'terms')),
  title text NOT NULL,
  content jsonb NOT NULL,
  last_updated timestamptz DEFAULT now(),
  version text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE legal_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Legal content is viewable by everyone"
  ON legal_content FOR SELECT
  USING (true);

CREATE POLICY "Only staff can modify legal content"
  ON legal_content FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'staff'
  ));

-- Insert initial content
INSERT INTO legal_content (type, title, version, content) VALUES
(
  'privacy',
  'Privacy Policy',
  '1.0.0',
  '[
    {
      "title": "Information We Collect",
      "content": [
        "When you use our app, we collect information that you provide directly to us, including:",
        "- Your name, email address, and other profile information",
        "- Content you post, including text and images",
        "- Messages you send to other users",
        "- Activity data and fitness information you choose to share"
      ]
    },
    {
      "title": "How We Use Your Information",
      "content": [
        "We use the information we collect to:",
        "- Provide and maintain our services",
        "- Personalize your experience",
        "- Send you updates and notifications",
        "- Improve our app and develop new features",
        "- Ensure the security of our platform"
      ]
    },
    {
      "title": "Information Sharing",
      "content": [
        "We do not sell your personal information. We may share your information:",
        "- With other users according to your privacy settings",
        "- With service providers who assist in our operations",
        "- When required by law or to protect rights",
        "- In connection with a business transfer or acquisition"
      ]
    },
    {
      "title": "Your Choices",
      "content": [
        "You have control over your information:",
        "- Update or delete your account information",
        "- Adjust your privacy settings",
        "- Opt out of promotional communications",
        "- Request a copy of your data"
      ]
    }
  ]'::jsonb
),
(
  'terms',
  'Terms of Service',
  '1.0.0',
  '[
    {
      "title": "Acceptance of Terms",
      "content": [
        "By accessing or using our app, you agree to be bound by these Terms of Service.",
        "If you do not agree to these terms, please do not use our services.",
        "We reserve the right to modify these terms at any time.",
        "Your continued use of the app constitutes acceptance of any changes."
      ]
    },
    {
      "title": "User Accounts",
      "content": [
        "You are responsible for:",
        "- Maintaining the confidentiality of your account",
        "- All activities that occur under your account",
        "- Providing accurate and complete information",
        "- Notifying us of any unauthorized use"
      ]
    },
    {
      "title": "User Content",
      "content": [
        "When posting content, you agree that:",
        "- You own or have the right to share the content",
        "- Content does not violate any laws or rights",
        "- Content is not harmful or offensive",
        "- We may remove content at our discretion"
      ]
    },
    {
      "title": "Prohibited Activities",
      "content": [
        "You agree not to:",
        "- Violate any laws or regulations",
        "- Harass or harm other users",
        "- Impersonate others or provide false information",
        "- Attempt to gain unauthorized access",
        "- Use the service for commercial purposes without permission"
      ]
    }
  ]'::jsonb
);