import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/', protect, createTask);
router.get('/project/:projectId', protect, getProjectTasks);
router.get('/:taskId', protect, getTaskById);
router.put('/:taskId', protect, updateTask);
router.delete('/:taskId', protect, deleteTask);

export default router;