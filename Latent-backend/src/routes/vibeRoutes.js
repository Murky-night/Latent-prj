// src/routes/vibeRoutes.js
import express from 'express';
import pool from '../utils/db.js';

const router = express.Router();

// ==========================================
// GET ALL VIBES (For the master list)
// GET /api/vibes
// ==========================================
router.get('/', async (req, res) => {
    try {
        const allVibes = await pool.query(
            'SELECT id, name, slug FROM preferred_vibe ORDER BY id ASC'
        );
        res.status(200).json(allVibes.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error fetching vibes' });
    }
});



export default router;