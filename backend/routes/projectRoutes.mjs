import express from 'express';
import rateLimit from 'express-rate-limit';
import protect from '../middleware/authMiddleware.mjs';
import { 
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectDetails
 } from '../controllers/projectController.mjs';

const router = express.Router();

const projectCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many projects created. Please try again later.' }
});

router.post('/create', protect, projectCreateLimiter, createProject);
router.get('/', protect, getMyProjects);
router.get('/:projectId/details', protect, getProjectDetails);
router.get('/:projectId', protect, getProjectById);
router.put('/:projectId', protect, updateProject);
router.delete('/:projectId', protect, deleteProject);

export default router;