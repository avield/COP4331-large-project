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

export const getProjectMembers = async (
  req: AuthenticatedRequest & { params: { projectId: string } },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const members = await ProjectMember.find({ projectId, membershipStatus: 'active' })
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username')
      .sort({ createdAt: 1 });

    res.status(200).json(members);
  } catch (error) {
    console.error('getProjectMembers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

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

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    if (!canManage) {
      res.status(403).json({
        message: 'You do not have permission to manage members.'
      });
      return;
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const existingMembership = await ProjectMember.findOne({
      projectId,
      userId
    });

    if (existingMembership) {
      res.status(400).json({
        message: 'That user is already associated with this project.'
      });
      return;
    }

    const normalizedPermissions = {
      canEditProject: !!permissions?.canEditProject,
      canManageMembers: !!permissions?.canManageMembers,
      canCreateTasks: permissions?.canCreateTasks ?? true,
      canAssignTasks: !!permissions?.canAssignTasks,
      canCompleteAnyTask: !!permissions?.canCompleteAnyTask,
      canModerateChat: !!permissions?.canModerateChat
    };

    const member = await ProjectMember.create({
      projectId,
      userId,
      role: typeof role === 'string' && role.trim() ? role.trim() : 'Member',
      permissions: normalizedPermissions,
      membershipStatus: 'active',
      joinedBy: req.user._id
    });

    const populatedMember = await ProjectMember.findById(member._id)
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username');

    res.status(201).json({
      message: 'Member added successfully.',
      member: populatedMember
    });
  } catch (error) {
    console.error('addProjectMember error:', error);
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
    requireUser(req);
    const { membershipId } = req.params;
    const { role, permissions, membershipStatus } = req.body;

    const membership = await ProjectMember.findById(membershipId);
    if (!membership) {
      res.status(404).json({ message: 'Project member not found.' });
      return;
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId: membership.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    if (membership.role === 'Owner' && role && role !== 'Owner') {
      res.status(400).json({
        message: 'Use a dedicated ownership transfer flow to change the project owner.'
      });
      return;
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    if (!canManage) {
      res.status(403).json({
        message: 'You do not have permission to manage members.'
      });
      return;
    }

    if (typeof role === 'string' && role.trim()) {
      membership.role = role.trim();
    }

    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      const currentPermissions: PermissionsInput = {
        canEditProject: membership.permissions?.canEditProject ?? false,
        canManageMembers: membership.permissions?.canManageMembers ?? false,
        canCreateTasks: membership.permissions?.canCreateTasks ?? true,
        canAssignTasks: membership.permissions?.canAssignTasks ?? false,
        canCompleteAnyTask: membership.permissions?.canCompleteAnyTask ?? false,
        canModerateChat: membership.permissions?.canModerateChat ?? false
      };

      membership.permissions = {
        canEditProject:
          permissions.canEditProject !== undefined
            ? !!permissions.canEditProject
            : currentPermissions.canEditProject,
        canManageMembers:
          permissions.canManageMembers !== undefined
            ? !!permissions.canManageMembers
            : currentPermissions.canManageMembers,
        canCreateTasks:
          permissions.canCreateTasks !== undefined
            ? !!permissions.canCreateTasks
            : currentPermissions.canCreateTasks,
        canAssignTasks:
          permissions.canAssignTasks !== undefined
            ? !!permissions.canAssignTasks
            : currentPermissions.canAssignTasks,
        canCompleteAnyTask:
          permissions.canCompleteAnyTask !== undefined
            ? !!permissions.canCompleteAnyTask
            : currentPermissions.canCompleteAnyTask,
        canModerateChat:
          permissions.canModerateChat !== undefined
            ? !!permissions.canModerateChat
            : currentPermissions.canModerateChat
      };
    }

    if (
      typeof membershipStatus === 'string' &&
      validMembershipStatuses.includes(membershipStatus as ValidMembershipStatus)
    ) {
      membership.membershipStatus = membershipStatus as ValidMembershipStatus;
    }

    await membership.save();

    const updatedMembership = await ProjectMember.findById(membership._id)
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username');

    res.status(200).json({
      message: 'Project member updated successfully.',
      member: updatedMembership
    });
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
      res.status(404).json({ message: 'Project member not found.' });
      return;
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId: membership.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    if (membership.role === 'Owner') {
      res.status(400).json({
        message: 'Project owner cannot be removed through this endpoint.'
      });
      return;
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    const isSelfRemoval = membership.userId.toString() === req.user._id.toString();

    if (!canManage && !isSelfRemoval) {
      res.status(403).json({
        message: 'You do not have permission to remove this member.'
      });
      return;
    }

    await ProjectMember.findByIdAndDelete(membershipId);

    res.status(200).json({
      message: 'Project member removed successfully.'
    });
  } catch (error) {
    console.error('removeProjectMember error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};