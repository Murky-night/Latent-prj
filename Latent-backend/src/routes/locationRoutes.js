import express from 'express';
import { createLocation, getApprovedLocations, getLocationById, updatePendingLocation } from '../controllers/locationController.js';
import { upload } from '../middlewares/multer.js'; // Import your multer config
import { protectRoute } from '../middlewares/protectRoute.js';
import { locationRules, validateLocation, validateLocationUpdate } from '../middlewares/validateLocation.js';

const router = express.Router();

// CREATE NEW LOCATION (GEM)
// POST /api/locations
router.post('/', protectRoute, upload.single('image'), locationRules, validateLocation, createLocation);


// UPDATE PENDING LOCATION (BY ID)
// PUT /api/locations/:id (Different validator for update)
router.put('/:id', protectRoute, upload.single('image'), locationRules, validateLocationUpdate, updatePendingLocation);

// GET /api/locations -> Fetch all approved locations (Public)
router.get('/', getApprovedLocations);

// GET /api/locations/:id -> Fetch one specific location for the Detailed View
router.get('/:id', getLocationById);

export default router;