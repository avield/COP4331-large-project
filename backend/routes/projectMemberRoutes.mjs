import express from 'express';
import protect from '../middleware/authMiddleware.mjs';
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember
} from '../controllers/projectMembersController.mjs';

const router = express.Router();

router.get('/project/:projectId', protect, getProjectMembers);
router.post('/project/:projectId', protect, addProjectMember);
router.put('/:membershipId', protect, updateProjectMember);
router.delete('/:membershipId', protect, removeProjectMember);

export default router;