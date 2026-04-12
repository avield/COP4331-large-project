import express from 'express';
import {RequestHandler} from 'express';
import { deleteMyAccount, getUserProfile } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users....../:userId
router.get('/:userId', protect, getUserProfile as unknown as RequestHandler);
// Delete your account: DELETE /api/users/me
router.delete('/me', protect, deleteMyAccount);

export default router;