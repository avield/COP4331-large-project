import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getMyTaskContributions,
  getTasksTodo
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/', protect, createTask);
router.get('/contributions/me', protect, getMyTaskContributions);
router.get('/todo', protect, getTasksTodo);
router.get('/project/:projectId', protect, getProjectTasks);
router.get('/:taskId', protect, getTaskById);
router.put('/:taskId', protect, updateTask);
router.delete('/:taskId', protect, deleteTask);

export default router;