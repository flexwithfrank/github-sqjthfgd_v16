/*
  # Add role field to profiles table

  1. Changes
    - Add role field to profiles table with validation
    - Add default value of 'guest'
    - Create index for better query performance

  2. Security
    - No changes to RLS policies needed
    - Existing profile policies will handle role field access
*/

-- Add role field if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('trainer', 'member', 'guest')) DEFAULT 'guest';

-- Create index for role field
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);