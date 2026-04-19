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
    body('longtitude')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid geographic coordinate.'),
    body('category')
        .trim()
        .notEmpty().withMessage('Please assign a category (e.g., Cafe, Street Food).')
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