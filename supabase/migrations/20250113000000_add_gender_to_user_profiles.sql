-- Add gender column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS user_profiles_gender_idx ON user_profiles(gender);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.gender IS 'User gender for personalization purposes';






