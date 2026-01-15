/*
  # Add IP tracking to demo sessions

  1. Changes
    - Add `ip_address` column to track user IP addresses
    - Add `browser_fingerprint` column for additional tracking
    - Add index on email for faster duplicate lookups
    - Add index on ip_address for rate limiting

  2. Purpose
    - Prevent abuse by tracking user sessions via IP and email
    - Enable rate limiting per IP address
    - Detect and prevent duplicate demo session creation
*/

-- Add IP tracking columns
ALTER TABLE demo_sessions 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_demo_sessions_email 
ON demo_sessions(email);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_ip_address 
ON demo_sessions(ip_address);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_email_expires 
ON demo_sessions(email, expires_at);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_ip_expires 
ON demo_sessions(ip_address, expires_at);
