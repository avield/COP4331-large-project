import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  // Viewer/member routes
  getProjectMembers,
  getMyProjectInvitations,
  getSpecificPendingInvite,
  leaveProject,

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
  transferProjectOwnership,
} from '../controllers/projectMembersController.js';

const router = express.Router();

/**
 * =========================================================
 * Specific Project Actions
 * =========================================================
 */

// View all pending invitations sent to the current user
router.get('/me/invitations', protect, getMyProjectInvitations);

// Checks if an invite already exists when loading a user's profile
router.get('/check-invite/:targetUserId', protect, getSpecificPendingInvite);

// Request to join a project
router.post('/project/:projectId/join', protect, requestJoinProject);

router.post('/project/:projectId/leave', protect, leaveProject)

router.post('/project/:projectId/transfer-ownership', protect, transferProjectOwnership)

/**
 * =========================================================
 * Project Fetches
 * =========================================================
 */

// View active + pending memberships for management UI
router.get('/project/:projectId/manage', protect, getManageableMembers);

// View active members of a project
router.get('/project/:projectId', protect, getProjectMembers);

/**
 * =========================================================
 * The Generic "Add" (invite
 * =========================================================
 */

// Invite a user to a project
router.post('/project/:projectId', protect, addProjectMember);

/**
 * =========================================================
 * Membership ID Specific Routes (The ID's)
 * =========================================================
 */

// Accept an invitation that was sent to the current user
router.post('/:membershipId/accept', protect, acceptProjectInvitation);

// Reject an invitation that was sent to the current user
router.delete('/:membershipId/reject', protect, rejectProjectInvitation);

// Approve request / change role / update permissions / change status
router.put('/:membershipId', protect, updateProjectMember);

// Deny a pending join request
router.delete('/:membershipId/deny', protect, denyJoinRequest);

// Remove a member from a project
router.delete('/:membershipId', protect, removeProjectMember);

export default router;