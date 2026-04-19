import pool from '../utils/db.js';
import cloudinary from '../utils/cloudinary.js';

export const createLocation = async (req, res) => {
    try {
        const { name, description, address, latitude, longitude, category } = req.body;

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
            (name, description, address, latitude, longitude, category, user_id, image_url, image_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [name, description, address, latitude, longitude, category, req.user.id, imageUrl, imageId]
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
                id, 
                name, 
                description, 
                address, 
                category, 
                image_url, 
                latitude, 
                longitude, 
                created_at 
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
        res.status(500).json({ error: 'Server error while fetching locations' });
    }
};