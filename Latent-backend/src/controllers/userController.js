import pool from '../utils/db.js';
import cloudinary from '../utils/cloudinary.js';

export const updateProfile = async (req, res) => {
  try {
    const { bio, phone } = req.body;
    const userId = req.user.id;

    // We start by assuming no new photo was uploaded
    let newAvatarUrl = null;

    // Convert the raw file in memory into a format Cloudinary can read (Base64 Data URI)
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
      // Send the image to Cloudinary!
      const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'latent_avatars', // Puts all avatars in a neat folder in your Cloudinary account
      });

      newAvatarUrl = cloudinaryResponse.secure_url;
    }

    // Update the database using COALESCE
    // COALESCE means: "If the new value is NULL, keep whatever is currently in the database."
    const updatedUser = await pool.query(
      `UPDATE users 
       SET bio = COALESCE($1, bio), 
           phone = COALESCE($2, phone), 
           avatar_url = COALESCE($3, avatar_url),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING id, username, email, first_name, last_name, bio, phone, avatar_url`,
      [bio, phone, newAvatarUrl, userId] // These map exactly to $1, $2, $3, $4
    );
    
    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send the completely updated profile back to React
    res.status(200).json({
      message: 'Profile updated successfully!',
      user: updatedUser.rows[0]
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    if (error.code === '23505') { 
        return res.status(409).json({ message: 'This phone number is already registered.' });
    }
    res.status(500).json({ message: 'Error updating profile.' });
  }
};