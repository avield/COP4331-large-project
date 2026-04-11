import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  // Viewer/member routes
  getProjectMembers,
  getMyProjectInvitations,
  getSpecificPendingInvite,

  // Join + invitation routes
  requestJoinProject,
  acceptProjectInvitation,
  rejectProjectInvitation,

  // Owner / manager routes
  getManageableMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  denyJoinRequest,
} from '../controllers/projectMembersController.js';

const router = express.Router();

/**
 * =========================================================
 * Current user's invitation routes
 * =========================================================
 */

// View all pending invitations sent to the current user
router.get('/me/invitations', protect, getMyProjectInvitations);

// Accept an invitation that was sent to the current user
router.post('/:membershipId/accept', protect, acceptProjectInvitation);

// Reject an invitation that was sent to the current user
router.delete('/:membershipId/reject', protect, rejectProjectInvitation);

// Checks if an invite already exists when loading a user's profile
router.get('/check-invite/:targetUserId', protect, getSpecificPendingInvite);

/**
 * =========================================================
 * Public/member project membership routes
 * =========================================================
 */

// View active members of a project
router.get('/project/:projectId', protect, getProjectMembers);

// Request to join a project
router.post('/project/:projectId/join', protect, requestJoinProject);

/**
 * =========================================================
 * Owner / manager membership management routes
 * =========================================================
 */

// View active + pending memberships for management UI
router.get('/project/:projectId/manage', protect, getManageableMembers);

// Invite a user to a project
router.post('/project/:projectId', protect, addProjectMember);

// Approve request / change role / update permissions / change status
router.put('/:membershipId', protect, updateProjectMember);

// Deny a pending join request
router.delete('/:membershipId/deny', protect, denyJoinRequest);

// Remove a member from a project
router.delete('/:membershipId', protect, removeProjectMember);

export default router;