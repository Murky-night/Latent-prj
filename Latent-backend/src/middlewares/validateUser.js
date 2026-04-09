import { body, validationResult } from 'express-validator';
import pool from '../utils/db.js';

// 1. Define the Rules
// We tell the validator exactly what to look for in the req.body
export const signupValidationRules = [
  body('username')
    .trim() // Removes accidental spaces at the beginning or end
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address (e.g., hello@latent.com)')
    .normalizeEmail(), // Converts uppercase emails to lowercase automatically

  body('password')
    .notEmpty().withMessage('Password is required'),
  // .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),

  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required'),
];

export const updateProfileRules = [
  body('phone')
    .optional({ checkFalsy: true }) // Ignores null, undefined, and empty strings ""
    .trim()
    .isLength({ min: 10 }).withMessage('Invalid phone number')
];

export const updateVibeRules = [
  body('vibes')
    .isArray({ max: 3 }).withMessage('You can only select up to 3 preferred vibes')

    // Database Check (The Guest List)
    .custom(async (vibesArray) => {

      // If the user sent an empty array to clear their vibes, let them through
      if (vibesArray.length === 0) return true;

      // Ask Postgres to find any vibes in the DB that match what the user sent
      const result = await pool.query(
        'SELECT slug FROM preferred_vibe WHERE slug = ANY($1)',
        [vibesArray]
      );

      // Prevent garbage data
      if (result.rows.length !== vibesArray.length) {
        throw new Error('One or more of the selected vibes do not exist');
      }

      return true;
    })
];

// 2. The Checker Function
// This actually reads the report card from the rules above.
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  // If the errors array is NOT empty, someone broke a rule!
  if (!errors.isEmpty()) {
    // Send a 400 Bad Request back to Postman/React with the EXACT errors
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // If no errors, open the door and let them into the signup controller!
  next();
};