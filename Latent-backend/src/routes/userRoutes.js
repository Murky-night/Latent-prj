import express from 'express';
import pool from '../utils/db.js';
import { updateProfile , updatePreferredVibe } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { updateProfileRules , validate } from '../middlewares/validateUser.js'; 
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// Flow: Request -> Bouncer (JWT Check) -> Mailroom Clerk (Extracts File + Text) -> Read the policies -> Validate -> Controller
router.put('/profile', protectRoute, upload.single('avatar'), updateProfileRules, validate, updateProfile);

// UPDATE USER PREFERRED VIBES
// PUT /api/users/vibes
router.put('/vibes', protectRoute, updatePreferredVibe);

export default router;