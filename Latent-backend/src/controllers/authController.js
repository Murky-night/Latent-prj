import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pool from '../utils/db.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// --- SIGNUP LOGIC ---
export const signup = async (req, res) => {
  try {
    const { username, email, first_name, last_name, password } = req.body;

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

    // GENERATE THE VERIFICATION TOKEN
    // Creates a 64-character random hex string
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Sets expiration for exactly 24 hours from right now
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    // Insert user into database
    const newUser = await pool.query(
      `INSERT INTO users (username, email, first_name, last_name, password_hash, email_verify_token, email_verify_expires) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, first_name, last_name`,
      [username, email, first_name, last_name, hashedPassword, verificationToken, verificationExpires]
    );

    // Give them the JWT cookie immediately!
    generateTokenAndSetCookie(newUser.rows[0].id, res);

    // SEND THE VERIFICATION EMAIL
    try {
      const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

      await sendEmail({
        email: newUser.rows[0].email,
        subject: 'Action Required: Verify your Latent account',
        message: `Hi ${newUser.rows[0].first_name},\n\nPlease click the link below to verify your email address. This link expires in 24 hours.\n\n${verifyUrl}\n\nThe Latent Team`
      });
      console.log("Verification email sent to Mailtrap!");
    } catch (emailError) {
      // Catch this so the user still registers even if the email fails
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      message: 'User created successfully! Please check your email to verify your account.',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Internal server error during signup' });
  }
};

//--- VERIFY EMAIL LOGIC ---
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Find user with this token that hasn't expired
    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE email_verify_token = $1 AND email_verify_expires > $2`,
      [token, Date.now()]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    const user = userResult.rows[0];

    // 2. Flip the switch and clear the tokens!
    await pool.query(
      `UPDATE users 
       SET is_email_verified = true,
           email_verify_token = NULL,
           email_verify_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    // 3. SEND THE OFFICIAL WELCOME EMAIL
    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Latent, Gem Hunter!',
        message: `Hi ${user.first_name},\n\nYour email has been successfully verified!\n\nWelcome to the Latent community. Get ready to discover the best-kept secrets in Hanoi.\n\nCheers,\nThe Latent Team`
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(200).json({ message: 'Email verified successfully! Welcome to Latent.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error during verification' });
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

// --- FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {

  const { email } = req.body;

  try {
    // 1. Check if user exists
    const userResult = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Security Best Practice: Don't tell hackers if an email exists or not
      return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const user = userResult.rows[0];

    // 2. Generate a random reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3. Hash the token for database storage (just like a password)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 4. Set expiration time (e.g., 15 minutes from now)
    const expiresIn = Date.now() + 15 * 60 * 1000;

    // 5. Save the hashed token and expiration to the database
    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [hashedToken, expiresIn, email]
    );

    // 6. Send the Email via Mailtrap
    // Notice we send the UNHASHED token in the email!
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`; // Simulating the React URL
    const message = `Hi ${user.username},\n\nYou requested a password reset. Please make a PUT request to: \n\n ${resetUrl} \n\nIf you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        email: email,
        subject: 'Latent - Password Reset Request',
        message: message
      });
      res.status(200).json({ message: 'Reset link sent to email!' });
    } catch (emailErr) {
      // If email fails, wipe the token from DB so they can try again
      await pool.query('UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1', [email]);
      return res.status(500).json({ error: 'There was an error sending the email. Try again later.' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error during forgot password' });
  }
};

// --- RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  // The token comes from the URL, the new password comes from the body
  const { token } = req.params;
  const { newPassword } = req.body;

  try {

    // Forcefully remove any accidental spaces or newlines the user pasted
    const cleanToken = token.trim();

    // 1. Re-hash the CLEAN token the user sent so we can compare it to the database
    const hashedToken = crypto.createHash('sha256').update(cleanToken).digest('hex');

    // 2. Find the user with this token, AND ensure the token hasn't expired
    const userResult = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2',
      [hashedToken, Date.now()]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token is invalid or has expired.' });
    }

    const userId = userResult.rows[0].id;

    // 3. Hash the brand new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // 4. Update the password AND wipe out the reset tokens so they can't be reused
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error during password reset' });
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