-- Migration: Add OAuth fields to users table
-- Created: 2025-11-08
-- Description: Adds support for Google and Facebook OAuth authentication

-- Add new columns for OAuth authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS "facebookId" VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS "profilePicture" VARCHAR(500);

-- Make password nullable for OAuth users
ALTER TABLE users
ALTER COLUMN "password" DROP NOT NULL;

-- Create indexes for better performance on OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId");
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users("facebookId");
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users("authProvider");

-- Add comments for documentation
COMMENT ON COLUMN users."googleId" IS 'Google OAuth user ID';
COMMENT ON COLUMN users."facebookId" IS 'Facebook OAuth user ID';
COMMENT ON COLUMN users."authProvider" IS 'Authentication provider: local, google, or facebook';
COMMENT ON COLUMN users."profilePicture" IS 'URL of user profile picture from OAuth provider';
