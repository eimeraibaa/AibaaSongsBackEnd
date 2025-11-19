-- Migration: Add password reset fields to users table
-- Created: 2025-11-19
-- Description: Adds support for password reset functionality with tokens

-- Add new columns for password reset
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users("resetToken");

-- Add comments for documentation
COMMENT ON COLUMN users."resetToken" IS 'Token for password reset, valid for 1 hour';
COMMENT ON COLUMN users."resetTokenExpires" IS 'Expiration timestamp for reset token';
