import pool from '../utils/db.js';

export const updateProfile = async (req, res) => {
  try {
    const { bio, phone } = req.body;
    const userId = req.user.id;

    // COALESCE means: If they don't send a new phone number, keep the old one.
    const updatedUser = await pool.query(
      `UPDATE users 
       SET bio = COALESCE($1, bio), 
           phone = COALESCE($2, phone), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, username, email, first_name, last_name, bio, phone, avatar_url`,
      [bio, phone, userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

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