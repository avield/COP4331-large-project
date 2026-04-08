import express from 'express'
import {
  createGoal,
  getProjectGoals,
  updateGoal,
  deleteGoal,
} from '../controllers/goalController.js'
import protect from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/', protect, createGoal)
router.get('/project/:projectId', protect, getProjectGoals)
router.put('/:goalId', protect, updateGoal)
router.delete('/:goalId', protect, deleteGoal)

export default router