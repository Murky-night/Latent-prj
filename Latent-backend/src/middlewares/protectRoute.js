import jwt from 'jsonwebtoken';
import pool from '../utils/db.js';

export const protectRoute = async (req, res, next) => {
  try {

    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    // Look up the user's file in Postgres using the ID on the wristband
    const userResult = await pool.query(
      'SELECT id, username, email, first_name, last_name, avatar_url, bio, phone FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = userResult.rows[0];
    next();

  } catch (error) {
    console.error("Protect Route Error:", error.message);
    res.status(500).json({ message: 'Internal server error in Bouncer' });
  }
};