import cloudinary from '../utils/cloudinary.js';
import pool from '../utils/db.js';

export const createLocation = async (req, res) => {
    try {
        const { name, description, address, latitude, longitude, category, ideal_time, vibes, budget_tier, group_capacity } = req.body;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        const vibesArray = vibes.split(',').map(vibe => vibe.trim());

        // Upload the image to Cloudinary (Just like we did for Avatars)
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
            folder: 'latent_locations',
        });

        const imageUrl = cloudinaryResponse.secure_url;
        const imageId = cloudinaryResponse.public_id;

        // Insert into the database (Default status is 'pending')
        const newLocation = await pool.query(
            `INSERT INTO locations 
            (name, description, address, latitude, longitude, category, user_id, image_url, image_id, ideal_time, vibes, budget_tier, group_capacity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [name, description, address, lat, lng, category, req.user.id, imageUrl, imageId, ideal_time, vibesArray, budget_tier || 1, group_capacity || 1]
        );

        await pool.query(
            `UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE id = $1`,
            [newLocation.rows[0].id]
        );

        res.status(201).json({
            message: 'Gem submitted successfully! It is currently pending review.',
            location: newLocation.rows[0]
        });

    } catch (err) {
        console.error('Error submitting location:', err.message);
        res.status(500).json({ error: 'Server error while submitting the location' });
    }
};

export const getApprovedLocations = async (req, res) => {
    try {
        // We only extract the fields necessary for the timeline and display
        // We intentionally exclude user_id and report_count to keep the payload lightweight
        const locationsResult = await pool.query(
            `SELECT 
                id, name, description, address, category, 
                image_url, latitude, longitude, created_at 
             FROM locations 
             WHERE status = 'approved' 
             ORDER BY created_at DESC`
        );

        res.status(200).json({
            count: locationsResult.rows.length,
            locations: locationsResult.rows
        });

    } catch (err) {
        console.error('Error fetching locations:', err.message);
        res.status(500).json({ error: 'Server error while fetching all locations' });
    }
};

export const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;

        // We use a JOIN to grab the discoverer's name from the users table!
        const locationResult = await pool.query(
            `SELECT 
                l.id, l.name, l.description, l.address, l.category, l.image_url, l.latitude, l.longitude, 
                l.created_at, l.ideal_time, l.vibes, u.username AS discoverer_name
             FROM locations l
             JOIN users u ON l.user_id = u.id
             WHERE l.id = $1 AND l.status = 'approved'`,
            [id]
        );

        if (locationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Gem not found or is still pending review.' });
        }

        res.status(200).json(locationResult.rows[0]);

    } catch (err) {
        console.error('Error fetching single location:', err.message);
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Invalid location ID format.' });
        }
        res.status(500).json({ error: 'Server error while fetching the location' });
    }
};

export const updatePendingLocation = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. SECURITY CHECK: Does this location exist, and who owns it?
        const checkResult = await pool.query(
            `SELECT user_id, status, image_url, image_id FROM locations WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Location not found.' });
        }

        const existingLocation = checkResult.rows[0];

        // 2. OWNERSHIP & STATUS CHECK
        if (existingLocation.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit locations you discovered.' });
        }
        if (existingLocation.status !== 'pending') {
            return res.status(400).json({ message: 'This location has already been reviewed. You can no longer edit it.' });
        }

        // 3. Extract the new text data
        const { name, description, address, latitude, longitude, category, ideal_time, vibes, budget_tier, group_capacity } = req.body;
        const vibesArray = vibes ? vibes.split(',').map(vibe => vibe.trim()) : [];
        const lat = latitude ? parseFloat(latitude) : existingLocation.latitude;
        const lng = longitude ? parseFloat(longitude) : existingLocation.longitude;

        // 4. Handle Optional Image Upload
        let newImageUrl = existingLocation.image_url;
        let newImageId = existingLocation.image_id;

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
                folder: 'latent_locations',
            });
            newImageUrl = cloudinaryResponse.secure_url;
            newImageId = cloudinaryResponse.public_id;
        }

        // 5. Run the Update Query
        const updatedLocation = await pool.query(
            `UPDATE locations 
             SET name = $1, description = $2, address = $3, latitude = $4, longitude = $5, 
                 category = $6, ideal_time = $7, vibes = $8, image_url = $9, image_id = $10,
                 budget_tier = $11, group_capacity = $12,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13
             RETURNING *`,
            [name, description, address, lat, lng, category, ideal_time, vibesArray, 
             newImageUrl, newImageId, budget_tier, group_capacity, id]
        );

        await pool.query(
            `UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE id = $1`,
            [updatedLocation.rows[0].id]
        );

        res.status(200).json({
            message: 'Pending location updated successfully!',
            location: updatedLocation.rows[0]
        });

    } catch (err) {
        console.error('Error updating location:', err.message);
        res.status(500).json({ error: 'Server error while updating the location' });
    }
};