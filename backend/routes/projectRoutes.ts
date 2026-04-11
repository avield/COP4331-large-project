import express from 'express';
import rateLimit from 'express-rate-limit';
import protect from '../middleware/authMiddleware.js';
import { checkCanManageMembers } from '../middleware/projectAuth.js';
import {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectDetails,
    getManageableProjects
} from '../controllers/projectController.js';
import {
    requestJoinProject,
    getManageableMembers,
    denyJoinRequest,
    updateProjectMember
} from "../controllers/projectMembersController.js";

const router = express.Router();

const projectCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { message: 'Too many projects created. Please try again later.' }
});

// --- General Project Routes ---
router.post('/create', protect, projectCreateLimiter, createProject);
router.get('/', protect, getMyProjects);
router.get('/:projectId/details', protect, getProjectDetails);
router.get('/:projectId', protect, getProjectById);
router.put('/:projectId', protect, updateProject);
router.delete('/:projectId', protect, deleteProject);
router.get('/manageable', protect, getManageableProjects);

// --- Membership & Request Routes ---
router.post('/:projectId/join', protect, requestJoinProject);
router.get('/:projectId/manage', protect, checkCanManageMembers, getManageableMembers);
router.delete('/:projectId/members/:membershipId/deny', protect, checkCanManageMembers, denyJoinRequest);
router.patch('/:projectId/members/:membershipId/approve', protect, checkCanManageMembers, updateProjectMember);

export default router;