/*
  # Add display name to challenge progress

  1. Changes
    - Add display_name column to challenge_progress table
    - Add trigger to automatically set display_name from profiles table
    - Update existing records with display names
    - Make display_name NOT NULL after population

  2. Security
    - No changes to RLS policies needed
*/

-- Add display_name column
ALTER TABLE challenge_progress
ADD COLUMN IF NOT EXISTS display_name text;

-- Update existing rows with display names
UPDATE challenge_progress cp
SET display_name = p.display_name
FROM profiles p
WHERE cp.user_id = p.id;

-- Make display_name NOT NULL after populating
ALTER TABLE challenge_progress
ALTER COLUMN display_name SET NOT NULL;

-- Create function to set display_name from profiles
CREATE OR REPLACE FUNCTION set_challenge_display_name()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name text;
BEGIN
  SELECT display_name INTO user_display_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  IF user_display_name IS NOT NULL THEN
    NEW.display_name := user_display_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_challenge_display_name_trigger ON challenge_progress;

-- Create new trigger
CREATE TRIGGER set_challenge_display_name_trigger
  BEFORE INSERT ON challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_challenge_display_name();