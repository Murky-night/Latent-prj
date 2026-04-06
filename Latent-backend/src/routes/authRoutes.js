import express from 'express';
import { signup, login, logout, getMe } from '../controllers/authController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { signupValidationRules, validate } from '../middlewares/validateUser.js'; 

const router = express.Router();

router.post('/signup', signupValidationRules, validate, signup);
router.post('/login', login);
router.post('/logout', logout);

router.get('/me', protectRoute, getMe); 

export default router;