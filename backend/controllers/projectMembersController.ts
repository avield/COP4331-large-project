import type { Response } from 'express';
import { requireUser } from '../types/guards.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import User from '../models/User.js';
import type { AuthenticatedRequest } from '../types/express.js';

interface PermissionsInput {
  canEditProject: boolean;
  canManageMembers: boolean;
  canCreateTasks: boolean;
  canAssignTasks: boolean;
  canCompleteAnyTask: boolean;
  canModerateChat: boolean;
}

interface AddProjectMemberBody {
  userId?: string;
  role?: string;
  permissions?: PermissionsInput;
}

interface UpdateProjectMemberBody {
  role?: string;
  permissions?: PermissionsInput;
  membershipStatus?: 'active' | 'pending' | 'removed';
}

const validMembershipStatuses = ['active', 'pending', 'removed'] as const;
type ValidMembershipStatus = (typeof validMembershipStatuses)[number];

// --- GETTERS ---

export const getProjectMembers = async (
    req: AuthenticatedRequest & { params: { projectId: string } },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    // Standard members list for team viewing
    const members = await ProjectMember.find({ projectId, membershipStatus: 'active' })
        .populate('userId', 'email profile.displayName profile.profilePictureUrl')
        .populate('joinedBy', 'displayName email username')
        .sort({ createdAt: 1 });

    res.status(200).json(members);
  } catch (error) {
    console.error('getProjectMembers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getManageableMembers = async (
    req: AuthenticatedRequest & { params: { projectId: string } },
    res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    // Security: middleware already verified 'canManageMembers' or 'Owner'
    const members = await ProjectMember.find({
      projectId,
      membershipStatus: { $in: ['active', 'pending'] }
    })
        .populate('userId', 'email profile.displayName profile.profilePictureUrl')
        .sort({ membershipStatus: -1, createdAt: 1 });

    res.status(200).json(members);
  } catch (error) {
    console.error('getManageableMembers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// --- ACTIONS ---

export const addProjectMember = async (
    req: AuthenticatedRequest & {
      params: { projectId: string };
      body: AddProjectMemberBody;
    },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;
    const { userId, role, permissions } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'userId is required.' });
      return;
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const existingMembership = await ProjectMember.findOne({ projectId, userId });
    if (existingMembership) {
      res.status(400).json({ message: 'User is already in this project.' });
      return;
    }

    const member = await ProjectMember.create({
      projectId,
      userId,
      role: typeof role === 'string' && role.trim() ? role.trim() : 'Member',
      permissions: {
        canEditProject: !!permissions?.canEditProject,
        canManageMembers: !!permissions?.canManageMembers,
        canCreateTasks: permissions?.canCreateTasks ?? true,
        canAssignTasks: !!permissions?.canAssignTasks,
        canCompleteAnyTask: !!permissions?.canCompleteAnyTask,
        canModerateChat: !!permissions?.canModerateChat
      },
      membershipStatus: 'active',
      joinedBy: req.user._id
    });

    const populatedMember = await ProjectMember.findById(member._id)
        .populate('userId', 'email profile.displayName profile.profilePictureUrl')
        .populate('joinedBy', 'displayName email username');

    res.status(201).json({ message: 'Member added.', member: populatedMember });
  } catch (error) {
    console.error('addProjectMember error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const requestJoinProject = async (
    req: AuthenticatedRequest & { params: { projectId: string } },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(projectId);
    if (!project || !project.settings?.allowSelfJoinRequests) {
      res.status(403).json({ message: 'Joining is disabled.' });
      return;
    }

    const existing = await ProjectMember.findOne({ projectId, userId });
    if (existing) {
      res.status(400).json({ message: 'Request already exists.' });
      return;
    }

    const needsApproval = project.settings.requireApprovalToJoin ?? true;
    const status = needsApproval ? 'pending' : 'active';

    const member = await ProjectMember.create({
      projectId,
      userId,
      role: 'Member',
      membershipStatus: status,
      joinedBy: userId,
      permissions: {
        canEditProject: false,
        canManageMembers: false,
        canCreateTasks: !needsApproval,
        canAssignTasks: false,
        canCompleteAnyTask: false,
        canModerateChat: false
      }
    });

    res.status(201).json({ message: needsApproval ? 'Request sent!' : 'Joined!', status, member });
  } catch (error) {
    console.error('requestJoinProject error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateProjectMember = async (
    req: AuthenticatedRequest & {
      params: { membershipId: string };
      body: UpdateProjectMemberBody;
    },
    res: Response
): Promise<void> => {
  try {
    const { membershipId } = req.params;
    const { role, permissions, membershipStatus } = req.body;

    const membership = await ProjectMember.findById(membershipId);
    if (!membership) {
      res.status(404).json({ message: 'Member not found.' });
      return;
    }

    // Owner protection is a business rule, keep it here
    if (membership.role === 'Owner' && role && role !== 'Owner') {
      res.status(400).json({ message: 'Ownership transfer required to change Owner role.' });
      return;
    }

    if (role) membership.role = role.trim();

    if (permissions) {
      membership.permissions = {
        canEditProject: permissions.canEditProject ?? membership.permissions?.canEditProject ?? false,
        canManageMembers: permissions.canManageMembers ?? membership.permissions?.canManageMembers ?? false,
        canCreateTasks: permissions.canCreateTasks ?? membership.permissions?.canCreateTasks ?? true,
        canAssignTasks: permissions.canAssignTasks ?? membership.permissions?.canAssignTasks ?? false,
        canCompleteAnyTask: permissions.canCompleteAnyTask ?? membership.permissions?.canCompleteAnyTask ?? false,
        canModerateChat: permissions.canModerateChat ?? membership.permissions?.canModerateChat ?? false
      };
    }

    if (membershipStatus && validMembershipStatuses.includes(membershipStatus as ValidMembershipStatus)) {
      membership.membershipStatus = membershipStatus as ValidMembershipStatus;
    }

    await membership.save();
    const updated = await ProjectMember.findById(membership._id).populate('userId', 'email profile.displayName');

    res.status(200).json({ message: 'Member updated.', member: updated });
  } catch (error) {
    console.error('updateProjectMember error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const removeProjectMember = async (
    req: AuthenticatedRequest & { params: { membershipId: string } },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { membershipId } = req.params;
    const membership = await ProjectMember.findById(membershipId);

    if (!membership) {
      res.status(404).json({ message: 'Member not found.' });
      return;
    }

    // Special Case: Allow self-removal even without 'Manage' perms
    const isSelfRemoval = membership.userId.toString() === req.user._id.toString();

    // If not self-removal, checkCanManageMembers middleware handles the security
    if (membership.role === 'Owner') {
      res.status(400).json({ message: 'Owner cannot be removed.' });
      return;
    }

    await ProjectMember.findByIdAndDelete(membershipId);
    res.status(200).json({ message: 'Member removed.' });
  } catch (error) {
    console.error('removeProjectMember error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const denyJoinRequest = async (
    req: AuthenticatedRequest & { params: { membershipId: string } },
    res: Response
): Promise<void> => {
  try {
    await ProjectMember.findByIdAndDelete(req.params.membershipId);
    res.status(200).json({ message: 'Request denied.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};