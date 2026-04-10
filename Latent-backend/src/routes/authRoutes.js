import express from 'express';
import { signup, login, logout, getMe, forgotPassword, resetPassword, verifyEmail } from '../controllers/authController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { signupValidationRules, validate } from '../middlewares/validateUser.js'; 

const router = express.Router();

router.post('/signup', signupValidationRules, validate, signup);
router.get('/verify-email/:token', verifyEmail);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

router.get('/me', protectRoute, getMe); 

export default router;