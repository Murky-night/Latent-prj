import bcrypt from 'bcrypt';
import cloudinary from '../utils/cloudinary.js';
import pool from '../utils/db.js';

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

export const updateVibe = async (req, res) => {
  // Grab the ID securely from the decoded JWT token
  const id = req.user.id;
  const { vibes } = req.body;

  try {
    // Update the database using the secure token ID
    const updateUser = await pool.query(
      `UPDATE users 
       SET preferred_vibes = $1 
       WHERE id = $2 
       RETURNING id, username, preferred_vibes`,
      [vibes, id]
    );

    if (updateUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Vibes updated successfully',
      user: updateUser.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating user vibes' });
  }
}

export const changePassword = async (req, res) => {
  // 1. Grab the inputs from the frontend
  const { currentPassword, newPassword } = req.body;

  // 2. Grab the secure ID from the decoded JWT (The VIP wristband)
  const userId = req.user.id;

  try {
    // 3. Fetch the user's CURRENT hashed password from the database
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dbPasswordHash = userResult.rows[0].password_hash;

    // 4. The Match Game: Compare the typed current password with the database hash
    const isMatch = await bcrypt.compare(currentPassword, dbPasswordHash);

    if (!isMatch) {
      // 401 Unauthorized: They failed to prove they own the locker
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    // 5. Success! Now we hash the BRAND NEW password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 6. Save the new hash to the database
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.status(200).json({ message: 'Password updated successfully!' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error updating password' });
  }
};

export const getPublicProfile = async (req, res) => {
  // 1. Grab the username from the URL (e.g., /api/users/cosmicdestroyer)
  const { username } = req.params;

  try {
    // 2. The Safe Query: Explicitly request ONLY public columns.
    // We leave out id, email, phone, password_hash, and reset tokens!
    const userResult = await pool.query(
      `SELECT * FROM public_user_profiles WHERE username = $1`,
      [username]
    );

    // 3. If the username doesn't exist in the database, return a 404
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 4. Send the clean, safe profile data back to the frontend
    res.status(200).json({
      message: 'Profile fetched successfully',
      user: userResult.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching public profile' });
  }
};