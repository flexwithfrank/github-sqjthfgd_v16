-- Add role_verified field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role_verified boolean DEFAULT false;

-- Set default role_verified value based on role
UPDATE profiles
SET role_verified = CASE
  WHEN role = 'trainer' THEN false
  ELSE true
END
WHERE role_verified IS NULL;

-- Create index for role_verified field
CREATE INDEX IF NOT EXISTS idx_profiles_role_verified ON profiles(role_verified);