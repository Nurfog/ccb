-- Add status and access_level to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) NOT NULL DEFAULT 'read_write';
