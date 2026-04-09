import express from 'express';
import {RequestHandler} from 'express';
import { getUserProfile } from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users....../:userId
router.get('/:userId', protect, getUserProfile as unknown as RequestHandler);

export default router;