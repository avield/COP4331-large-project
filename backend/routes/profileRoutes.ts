import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController.js';
import protect from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Retrieve profile info (used when the page loads)
router.get('/profile', protect, getProfile);

// Update profile info (used when submitting the form)
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);

// frontend must use 'profilePicture' as the key in FormData

export default router;