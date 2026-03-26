import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController.mjs';
import protect from '../middleware/authMiddleware.mjs';

const router = Router();

// Retrieve profile info (used when the page loads)
router.get('/profile', protect, getProfile);

// Update profile info (used when submitting the form)
router.put('/profile', protect, updateProfile);

export default router;