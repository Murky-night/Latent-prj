import express from 'express';
import { updateProfile } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// ONE ROUTE TO RULE THEM ALL
// Flow: Request -> Bouncer (JWT Check) -> Mailroom Clerk (Extracts File + Text) -> Controller
router.put('/profile', protectRoute, upload.single('avatar'), updateProfile);

export default router;