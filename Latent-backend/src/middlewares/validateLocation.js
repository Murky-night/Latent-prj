import { body, validationResult } from 'express-validator';

// 1. The Rules Array
export const locationRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('A hidden gem must have a name.'),
    body('description')
        .trim()
        .notEmpty().withMessage('Please describe what makes this place special.'),
    body('address')
        .trim()
        .notEmpty().withMessage('Address is required so others can find it.'),
    body('latitude')
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid geographic coordinate.'),
    body('longitude')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid geographic coordinate.'),
    body('category')
        .trim()
        .notEmpty().withMessage('Please assign a category (e.g., Cafe, Street Food).'),
    body('ideal_time')
        .trim()
        .notEmpty().withMessage('Please suggest the best time of day to experience this vibe.'),
    body('vibes')
        .trim()
        .notEmpty().withMessage('Please provide at least one vibe, separated by commas.')
];

export const validateLocation = (req, res, next) => {
    
    if (!req.file) {
        return res.status(400).json({ message: 'A hero image is required for all hidden gems.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    next();
};

export const validateLocationUpdate = (req, res, next) => {
    const errors = validationResult(req);
    
    // Notice we do NOT check for req.file here! 
    // If they include one, great. If not, we keep the old one.

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    next(); 
};