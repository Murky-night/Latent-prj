import express from 'express';
import { updateProfile } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';

const router = express.Router();

// The Bouncer stands in front of the update profile door
router.put('/profile', protectRoute, updateProfile);

export default router;