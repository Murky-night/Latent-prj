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

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longtitude NUMERIC(10, 7) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    report_count INT DEFAULT 0,
    user_id UUID REFERENCES users(id),
    image_url VARCHAR(500),
    image_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE EXTENSION postgis;

-- 1. Add the new algorithm constraints and the spatial point
ALTER TABLE locations
ADD COLUMN budget_tier INTEGER DEFAULT 1, 
ADD COLUMN group_capacity INTEGER DEFAULT 2,
ADD COLUMN geom GEOGRAPHY(Point, 4326);

-- 2. Convert your existing Lat/Lng into PostGIS geometry
UPDATE locations
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- 3. Create the spatial index so the Timeline engine runs in milliseconds
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- 4. Create the main Posts table for the Location blog
CREATE TABLE location_blog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create the Comments table so users can reply to Posts
CREATE TABLE blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_id UUID REFERENCES location_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

INSERT INTO locations (name, description, address, lat, lng, category, status, user_id)
VALUES 
(
    'The Whispering Bean', 
    'A tiny cafe hidden on the 3rd floor of an old French villa. Great egg coffee, zero wifi. You have to walk through a tailor shop to find the stairs.', 
    '14 Tống Duy Tân, Hoàn Kiếm, Hà Nội', 
    21.0305880, 
    105.8458920, 
    'Cafe', 
    'approved', -- Setting to 'approved' so we can test the map immediately
    (SELECT id FROM users LIMIT 1) -- The magic trick to auto-assign a user
),
(
    'Dusty Pages', 
    'Second-hand bookstore tucked deep inside an old collective housing unit (Khu tập thể). Smells like old paper and nostalgia. Cash only.', 
    'Ngõ 5 Dã Tượng, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 
    21.0232150, 
    105.8455120, 
    'Bookstore', 
    'approved', 
    (SELECT id FROM users LIMIT 1)
);

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

ALTER TABLE users
ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN pending_email VARCHAR(255),
ADD COLUMN email_verify_token VARCHAR(255),
ADD COLUMN email_verify_expires BIGINT;

