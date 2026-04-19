import express from 'express';
import { createLocation, getApprovedLocations } from '../controllers/locationController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { upload } from '../middlewares/multer.js'; // Import your multer config
import { locationRules, validateLocation } from '../middlewares/validateLocation.js';

const router = express.Router();

// CREATE NEW LOCATION (GEM)
// POST /api/locations
router.post('/', protectRoute, upload.single('image'), locationRules, validateLocation, createLocation);

// GET /api/locations -> Fetch all approved locations (Public)
router.get('/', getApprovedLocations);

export default router;