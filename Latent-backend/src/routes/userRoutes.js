import express from 'express';
import pool from '../utils/db.js';
import { updateProfile } from '../controllers/userController.js';
import { protectRoute } from '../middlewares/protectRoute.js';
import { updateProfileRules , validate } from '../middlewares/validateUser.js'; 
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// Flow: Request -> Bouncer (JWT Check) -> Mailroom Clerk (Extracts File + Text) -> Read the policies -> Validate -> Controller
router.put('/profile', protectRoute, upload.single('avatar'), updateProfileRules, validate, updateProfile);

// ==========================================
// UPDATE USER PREFERRED VIBES
// PUT /api/users/:id/vibes
// ==========================================
router.put('/:id/vibes', async (req, res) => {
    const { id } = req.params;
    const { vibes } = req.body; 

    if (!Array.isArray(vibes) || vibes.length > 3) {
        return res.status(400).json({ error: 'You can only select up to 3 preferred vibes.' });
    }

    try {
        const updateUser = await pool.query(
            `UPDATE users 
             SET preferred_vibes = $1 
             WHERE id = $2 
             RETURNING id, username, preferred_vibes`,
            [vibes, id]
        );

        if (updateUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'Vibes updated successfully',
            user: updateUser.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error updating user vibes' });
    }
});

export default router;