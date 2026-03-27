import Project from '../models/Project.mjs';
import ProjectMember from '../models/ProjectMember.mjs';
import User from '../models/User.mjs';

// GET /api/project-members/project/:projectId
export const getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;

    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const members = await ProjectMember.find({ projectId, membershipStatus: 'active' })
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username')
      .sort({ createdAt: 1 });

    return res.status(200).json(members);
  } catch (error) {
    console.error('getProjectMembers error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/project-members/project/:projectId
export const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role, permissions } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    if (!canManage) {
      return res.status(403).json({
        message: 'You do not have permission to manage members.'
      });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const existingMembership = await ProjectMember.findOne({
      projectId,
      userId
    });

    if (existingMembership) {
      return res.status(400).json({
        message: 'That user is already associated with this project.'
      });
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

    return res.status(201).json({
      message: 'Member added successfully.',
      member: populatedMember
    });
  } catch (error) {
    console.error('addProjectMember error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/project-members/:membershipId
export const updateProjectMember = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { role, permissions, membershipStatus } = req.body;

    const membership = await ProjectMember.findById(membershipId);
    if (!membership) {
      return res.status(404).json({ message: 'Project member not found.' });
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId: membership.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (membership.role === 'Owner' && role && role !== 'Owner') {
        return res.status(400).json({
            message: 'Use a dedicated ownership transfer flow to change the project owner.'
        });
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    if (!canManage) {
      return res.status(403).json({
        message: 'You do not have permission to manage members.'
      });
    }

    if (typeof role === 'string' && role.trim()) {
      membership.role = role.trim();
    }

    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
    membership.permissions = {
            ...membership.permissions,
            canEditProject:
            permissions.canEditProject !== undefined
                ? !!permissions.canEditProject
                : membership.permissions.canEditProject,
            canManageMembers:
            permissions.canManageMembers !== undefined
                ? !!permissions.canManageMembers
                : membership.permissions.canManageMembers,
            canCreateTasks:
            permissions.canCreateTasks !== undefined
                ? !!permissions.canCreateTasks
                : membership.permissions.canCreateTasks,
            canAssignTasks:
            permissions.canAssignTasks !== undefined
                ? !!permissions.canAssignTasks
                : membership.permissions.canAssignTasks,
            canCompleteAnyTask:
            permissions.canCompleteAnyTask !== undefined
                ? !!permissions.canCompleteAnyTask
                : membership.permissions.canCompleteAnyTask,
            canModerateChat:
            permissions.canModerateChat !== undefined
                ? !!permissions.canModerateChat
                : membership.permissions.canModerateChat
        };
    }

    if (
      typeof membershipStatus === 'string' &&
      ['active', 'pending', 'removed'].includes(membershipStatus)
    ) {
      membership.membershipStatus = membershipStatus;
    }

    await membership.save();

    const updatedMembership = await ProjectMember.findById(membership._id)
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username');

    return res.status(200).json({
      message: 'Project member updated successfully.',
      member: updatedMembership
    });
  } catch (error) {
    console.error('updateProjectMember error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/project-members/:membershipId
export const removeProjectMember = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const membership = await ProjectMember.findById(membershipId);
    if (!membership) {
      return res.status(404).json({ message: 'Project member not found.' });
    }

    const requesterMembership = await ProjectMember.findOne({
      projectId: membership.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (membership.role === 'Owner') {
        return res.status(400).json({
            message: 'Project owner cannot be removed through this endpoint.'
        });
    }

    const canManage =
      requesterMembership.role === 'Owner' ||
      requesterMembership.permissions?.canManageMembers;

    const isSelfRemoval =
      membership.userId.toString() === req.user._id.toString();

    if (!canManage && !isSelfRemoval) {
      return res.status(403).json({
        message: 'You do not have permission to remove this member.'
      });
    }

    await ProjectMember.findByIdAndDelete(membershipId);

    return res.status(200).json({
      message: 'Project member removed successfully.'
    });
  } catch (error) {
    console.error('removeProjectMember error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};