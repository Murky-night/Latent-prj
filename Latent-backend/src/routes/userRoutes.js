import express from 'express';
import { changePassword, getPublicProfile, updateProfile, updateVibe } from '../controllers/userController.js';
import { upload } from '../middlewares/multer.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { changePasswordRules, updateProfileRules, updateVibeRules, validate } from '../middlewares/validateUser.js';

const router = express.Router();

// Flow: Request -> Bouncer (JWT Check) -> Mailroom Clerk (Extracts File + Text) -> Read the policies -> Validate -> Controller
router.put('/profile', protectRoute, upload.single('avatar'), updateProfileRules, validate, updateProfile);

// UPDATE USER PREFERRED VIBES
// PUT /api/users/vibes
router.put('/vibes', protectRoute, updateVibeRules, validate, updateVibe);

// CHANGE USER PASSWORD
// PUT /api/users/change-password
router.put('/change-password', protectRoute, changePasswordRules, validate, changePassword);

// GET PUBLIC USER PROFILE
// GET /api/users/:username
router.get('/:username', getPublicProfile);

export default router;