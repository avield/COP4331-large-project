import express from 'express';
import rateLimit from 'express-rate-limit';
import { createProject } from '../controllers/projectController.mjs';
import protect from '../middleware/authMiddleware.mjs';

const router = express.Router();

const projectCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many projects created. Please try again later.' }
});

router.post('/create', protect, projectCreateLimiter, createProject);

export default router;