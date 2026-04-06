import pool from '../utils/db.js';
import bcrypt from 'bcrypt';
import generateTokenAndSetCookie from '../utils/generateToken.js';

// --- SIGNUP LOGIC ---
export const signup = async (req, res) => {
  try {
    const { username, email, first_name, last_name, password } = req.body;

    if (!username || !email || !first_name || !last_name || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Username or Email already taken' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const newUser = await pool.query(
      `INSERT INTO users (username, email, first_name, last_name, password_hash) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name`,
      [username, email, first_name, last_name, hashedPassword]
    );

    // Give them the JWT cookie immediately!
    generateTokenAndSetCookie(newUser.rows[0].id, res);

    res.status(201).json({
      message: 'Account created successfully',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Internal server error during signup' });
  }
};

// --- LOGIN LOGIC ---
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const user = userResult.rows[0];

    // Check if the password matches the hash
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Give them a fresh JWT cookie
    generateTokenAndSetCookie(user.id, res);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

// --- LOGOUT LOGIC ---
export const logout = (req, res) => {
  try {
    res.cookie('jwt', '', { maxAge: 0 }); // Destroy the cookie
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: 'Internal server error during logout' });
  }
};

// --- GET CURRENT USER (/me) LOGIC ---
export const getMe = async (req, res) => {
  try {
    // The Bouncer already did the hard work. We just send the result.
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ message: 'Internal server error in getMe' });
  }
};