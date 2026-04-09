CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    avatar_id VARCHAR(255),
    bio VARCHAR(500),
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prefered_vibe (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,      -- e.g., "Coffee Threads"
    slug VARCHAR(50) UNIQUE NOT NULL,      -- e.g., "coffee-threads" (Best for URLs and React keys)
    description TEXT,                      -- Optional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO prefered_vibe (name, slug) VALUES 
('Industrial', 'industrial'),
('Green-ist', 'green_ist'),
('Artistic', 'artistic'),
('Vintage', 'vintage'),
('Hidden', 'hidden'),
('Nostalgic', 'nostalgic'),
('Cinematic', 'cinematic'),
('Work-friendly', 'work_friendly'),
('Open-air', 'open_air'),
('Pet-friendly', 'pet_friendly'),
('Cozy', 'cozy');

-- 2. Add the array column to the existing users table
ALTER TABLE users 
ADD COLUMN preferred_vibes VARCHAR(50)[] DEFAULT '{}';

-- 3. Add a strict database-level constraint to allow a maximum of 3 interests
ALTER TABLE users
ADD CONSTRAINT max_three_vibes 
CHECK (
    array_length(preferred_vibes, 1) IS NULL 
    OR 
    array_length(preferred_vibes, 1) <= 3
);

CREATE OR REPLACE VIEW public_user_profiles AS
SELECT 
    username, 
    first_name, 
    last_name, 
    avatar_url, 
    bio, 
    preferred_vibes, 
    TO_CHAR(created_at, 'DD-MM-YYYY') AS created_at
FROM users;