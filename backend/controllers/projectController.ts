import type { Response } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { requireUser } from '../types/guards.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ProjectMember from '../models/ProjectMember.js';
import Goal from '../models/Goal.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { createNotifications } from '../services/notificationService.js';

interface GoalInput {
  title?: string;
  description?: string;
}

interface InviteMemberInput {
  userId?: string;
  role?: string;
  permissions?: {
    canEditProject?: boolean;
    canManageMembers?: boolean;
    canCreateTasks?: boolean;
    canAssignTasks?: boolean;
    canCompleteAnyTask?: boolean;
    canModerateChat?: boolean;
  };
}

interface CreateProjectBody {
  name?: string;
  description?: string;
  visibility?: 'private' | 'public';
  dueDate?: string | null;
  goals?: GoalInput[];
  invitedMembers?: InviteMemberInput[];
  settings?: {
    allowSelfJoinRequests?: boolean;
    requireApprovalToJoin?: boolean;
    inviteOnly?: boolean;
  };
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  visibility?: 'private' | 'public';
  dueDate?: string | null;
  recruitingStatus?: 'open' | 'closed';
  status?: 'planning' | 'active' | 'on_hold' | 'completed';
  tags?: string[];
  lookingForRoles?: string[];
  settings?: {
    allowSelfJoinRequests?: boolean;
    requireApprovalToJoin?: boolean;
    inviteOnly?: boolean;
  };
}

type ProjectIdOnly = {
  projectId: Types.ObjectId;
};

type TaskStatusOnly = {
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
};

type ProjectLike = {
  _id: Types.ObjectId;
  toObject: () => Record<string, unknown>;
};

// No longer needed
type PopulatedUser = {
  _id: string
  email?: string
  profile?: {
    displayName?: string
    profilePictureUrl: string
  }
}

function formatProjectStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export const createProject = async (
  req: AuthenticatedRequest & { body: CreateProjectBody },
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  let createdProjectId: Types.ObjectId | null = null;

  try {
    const { name, description, visibility, dueDate, goals, invitedMembers } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Project name is required.' });
      return;
    }

    const normalizedName = name.trim();
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';
    const normalizedVisibility =
      visibility === 'private' || visibility === 'public' ? visibility : undefined;
    const normalizedDueDate =
      dueDate && !Number.isNaN(new Date(dueDate).getTime()) ? new Date(dueDate) : null;

    const normalizedGoals = Array.isArray(goals)
      ? goals
          .filter((goal) => goal && typeof goal.title === 'string' && goal.title.trim() !== '')
          .map((goal) => ({
            title: goal.title!.trim(),
            description: typeof goal.description === 'string' ? goal.description.trim() : ''
          }))
      : [];
    
    const normalizedInvitedMembers = Array.isArray(invitedMembers)
      ? invitedMembers
          .filter((member) => member && typeof member.userId === 'string' && member.userId.trim() !== '')
          .map((member) => ({
            userId: member.userId!.trim(),
            role: typeof member.role === 'string' && member.role.trim() ? member.role.trim() : 'Member',
            permissions: {
              canEditProject: !!member.permissions?.canEditProject,
              canManageMembers: !!member.permissions?.canManageMembers,
              canCreateTasks: member.permissions?.canCreateTasks ?? true,
              canAssignTasks: !!member.permissions?.canAssignTasks,
              canCompleteAnyTask: !!member.permissions?.canCompleteAnyTask,
              canModerateChat: !!member.permissions?.canModerateChat
            }
          }))
      : [];

    const defaultSettings =
      normalizedVisibility === 'public'
        ? {
            allowSelfJoinRequests: true,
            requireApprovalToJoin: true,
            inviteOnly: false,
          }
        : {
            allowSelfJoinRequests: false,
            requireApprovalToJoin: false,
            inviteOnly: true,
          };
    
    const defaultRecruitingStatus =
      normalizedVisibility === 'private' ? 'closed' : 'open';

    await session.withTransaction(async () => {
      requireUser(req);
      const projectData: {
        name: string;
        description: string;
        createdBy: string;
        visibility?: 'private' | 'public';
        dueDate?: Date;
        recruitingStatus: string;
        settings: {
          allowSelfJoinRequests: boolean;
          requireApprovalToJoin: boolean;
          inviteOnly: boolean;
        };
      } = {
        name: normalizedName,
        description: normalizedDescription,
        createdBy: req.user._id,
        settings: defaultSettings,
        recruitingStatus: defaultRecruitingStatus,
      };

      if (normalizedVisibility) {
        projectData.visibility = normalizedVisibility;
      }

      if (normalizedDueDate) {
        projectData.dueDate = normalizedDueDate;
      }

      const [project] = await Project.create([projectData], { session });
      createdProjectId = project._id as Types.ObjectId;

      await ProjectMember.create(
        [
          {
            projectId: project._id,
            userId: req.user._id,
            role: 'Owner',
            permissions: {
              canEditProject: true,
              canManageMembers: true,
              canCreateTasks: true,
              canAssignTasks: true,
              canCompleteAnyTask: true,
              canModerateChat: true
            },
            membershipStatus: 'active',
            joinedBy: req.user._id
          }
        ],
        { session }
      );

      if (normalizedInvitedMembers.length > 0) {
        const uniqueInvitedMembers = normalizedInvitedMembers.filter(
          (member, index, self) =>
            member.userId !== req.user._id.toString() &&
            self.findIndex((m) => m.userId === member.userId) === index
        );

        if (uniqueInvitedMembers.length > 0) {
          await ProjectMember.insertMany(
            uniqueInvitedMembers.map((member) => ({
              projectId: project._id,
              userId: member.userId,
              role: member.role,
              permissions: member.permissions,
              membershipStatus: 'pending',
              joinedBy: req.user._id
            })),
            { session }
          );
        }
      }

      if (normalizedGoals.length > 0) {
        const goalsToCreate = normalizedGoals.map((goal, index) => ({
          projectId: project._id,
          title: goal.title,
          description: goal.description,
          createdBy: req.user._id,
          order: index, // important for your drag ordering UI
        }));

        await Goal.insertMany(goalsToCreate, { session });
      }
    });

    if (!createdProjectId) {
      res.status(500).json({ message: 'Project creation failed.' });
      return;
    }

    const projectId = createdProjectId;

    const projectWithCreator = await Project.findById(projectId).populate(
      'createdBy',
      'displayName email'
    );

    res.status(201).json({
      message: 'Project created successfully.',
      project: projectWithCreator
    });
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({
      message: 'Internal server error. Please try again.'
    });
  } finally {
    await session.endSession();
  }
};

export const getMyProjects = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const memberships = (await ProjectMember.find({
      userId: req.user._id,
      membershipStatus: 'active'
    }).select('projectId')) as ProjectIdOnly[];

    const projectIds = memberships.map((m: ProjectIdOnly) => m.projectId);

    const projects = (await Project.find({
      _id: { $in: projectIds }
    })
      .populate('createdBy', 'displayName email username')
      .sort({ updatedAt: -1 })) as ProjectLike[];

    const enrichedProjects = await Promise.all(
      projects.map(async (project: ProjectLike) => {
        const members = await ProjectMember.countDocuments({
          projectId: project._id,
          membershipStatus: 'active'
        });

        const tasks = (await Task.find({ projectId: project._id }).select(
          'status'
        )) as TaskStatusOnly[];

        return {
          ...project.toObject(),
          memberCount: members,
          taskCounts: {
            total: tasks.length,
            todo: tasks.filter((t: TaskStatusOnly) => t.status === 'todo').length,
            in_progress: tasks.filter((t: TaskStatusOnly) => t.status === 'in_progress').length,
            blocked: tasks.filter((t: TaskStatusOnly) => t.status === 'blocked').length,
            done: tasks.filter((t: TaskStatusOnly) => t.status === 'done').length
          }
        };
      })
    );

    res.status(200).json(enrichedProjects);
  } catch (error) {
    console.error('getMyProjects error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getManageableProjects = async (
    req: AuthenticatedRequest,
    res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }


    // Find memberships where the user can actually manage members
    const memberships = await ProjectMember.find({
      userId: req.user._id,
      membershipStatus: 'active',
      $or: [
        { role: 'Owner' },
        { 'permissions.canManageMembers': true }
      ]
    });

    const projectIds = memberships.map(m => m.projectId);
    // Fetch the actual project documents
    const projects = await Project.find({
      _id: { $in: projectIds }
    }).sort({ updatedAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    console.error('CRASH in getManageableProjects:', error);
    res.status(500).json({ message: 'Error fetching manageable projects' });
  }
};

export const getProjectById = async (
    req: AuthenticatedRequest & { params: { projectId: string } },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    // Fetch the project first
    const project = await Project.findById(projectId).populate('createdBy', 'displayName email');

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // Check membership
    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    // The "Visitor Logic"
    if (!membership) {
      if (project.visibility === 'public') {
        // Return 200 for public project info
        res.status(200).json({
          ...project.toObject(),
          isFullDetails: false
        });
        return;
      }
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    // Return full object for members
    res.status(200).json({
      ...project.toObject(),
      isFullDetails: true
    });
  } catch (error) {
    console.error('getProjectById error: ', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateProject = async (
  req: AuthenticatedRequest & { params: { projectId: string }; body: UpdateProjectBody },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;
    const {
      name,
      description,
      visibility,
      dueDate,
      recruitingStatus,
      status,
      tags,
      lookingForRoles,
      settings
    } = req.body;

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const canEdit = membership.role === 'Owner' || membership.permissions?.canEditProject;

    if (!canEdit) {
      res.status(403).json({ message: 'You do not have permission to edit this project.' });
      return;
    }

    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const oldStatus = project.status;

    if (typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        res.status(400).json({ message: 'Project name cannot be empty.' });
        return;
      }
      project.name = trimmedName;
    }

    if (typeof description === 'string') {
      project.description = description.trim();
    }

    if (visibility === 'public' || visibility === 'private') {
      project.visibility = visibility;
    }

    if (dueDate === null || dueDate === '') {
      project.dueDate = null;
    } else if (dueDate && !Number.isNaN(new Date(dueDate).getTime())) {
      project.dueDate = new Date(dueDate);
    }

    if (recruitingStatus === 'open' || recruitingStatus === 'closed') {
      project.recruitingStatus = recruitingStatus;
    }

    if (
      status === 'planning' ||
      status === 'active' ||
      status === 'on_hold' ||
      status === 'completed'
    ) {
      project.status = status;
    }

    if (Array.isArray(tags)) {
      project.tags = tags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean);
    }

    if (Array.isArray(lookingForRoles)) {
      project.lookingForRoles = lookingForRoles
        .map((role) => (typeof role === 'string' ? role.trim() : ''))
        .filter(Boolean);
    }

    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      if (settings.inviteOnly === true) {
        project.settings = {
          allowSelfJoinRequests: false,
          requireApprovalToJoin: false,
          inviteOnly: true,
        };
      } else if (settings.allowSelfJoinRequests === true) {
        project.settings = {
          allowSelfJoinRequests: true,
          requireApprovalToJoin: settings.requireApprovalToJoin ?? true,
          inviteOnly: false,
        };
      }
    }

    await project.save();

    const newStatus = project.status;

    if (oldStatus !== newStatus) {
      const activeMembers = await ProjectMember.find({
        projectId: project._id,
        membershipStatus: 'active',
      }).select('userId');

      const recipientUserIds = activeMembers
        .map((member) => member.userId.toString())
        .filter((userId: string) => userId !== req.user._id.toString());

      await createNotifications(
        recipientUserIds.map((userId: string) => ({
          recipientUserId: userId,
          actorUserId: req.user._id,
          type: 'project_status_changed' as const,
          title: 'Project status updated',
          message: `"${project.name}" changed from ${formatProjectStatusLabel(oldStatus)} to ${formatProjectStatusLabel(newStatus)}.`,
          projectId: project._id,
          link: `/projects/${project._id}`,
        }))
      );
    }

    res.status(200).json({ message: 'Project updated successfully.', project });
  } catch (error) {
    console.error('updateProject error: ', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const deleteProject = async (
  req: AuthenticatedRequest & { params: { projectId: string } },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    if (membership.role !== 'Owner') {
      res.status(403).json({ message: 'Only the project owner can delete this project.' });
      return;
    }

    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    await Task.deleteMany({ projectId });
    await Goal.deleteMany({ projectId });
    await ProjectMember.deleteMany({ projectId });
    await Project.findByIdAndDelete(projectId);

    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('deleteProject error: ', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getProjectDetails = async (
    req: AuthenticatedRequest & { params: { projectId: string } },
    res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate(
        'createdBy',
        'displayName email username'
    );

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // 1. Fetch membership and POPULATE immediately to avoid character-array bug
    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
    }).populate('userId', 'email profile.displayName profile.profilePictureUrl');

    const isMember = requesterMembership?.membershipStatus === 'active';
    const isInvited = requesterMembership?.membershipStatus === 'pending';

    // 2. VISITOR / INVITED GATE
    if (!isMember) {
      const canViewInfo = project.visibility === 'public' || isInvited;

      if (canViewInfo) {
        // Normalize the single record so frontend sees the same structure as members list
        const visitorMember = requesterMembership ? [{
          ...requesterMembership.toObject(),
          userId: requesterMembership.userId && typeof requesterMembership.userId === 'object' ? {
            _id: (requesterMembership.userId as any)._id.toString(),
            email: (requesterMembership.userId as any).email,
            displayName: (requesterMembership.userId as any).profile?.displayName ?? '',
            profilePictureUrl: (requesterMembership.userId as any).profile?.profilePictureUrl ?? '',
          } : null
        }] : [];

        res.status(200).json({
          project,
          members: visitorMember,
          isFullDetails: false,
          message: isInvited ? 'Pending membership view.' : 'Public visitor view.'
        });
        return;
      }

      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    // 3. MEMBER ACCESS (Full Data)
    const goals = await Goal.find({ projectId })
        .sort({ order: 1, createdAt: 1 })
        .populate('createdBy', 'email profile.displayName');

    const members = await ProjectMember.find({ projectId })
        .populate('userId', 'email profile.displayName profile.profilePictureUrl')
        .populate('joinedBy', 'email profile.displayName')
        .sort({ createdAt: 1 });

    const normalizedMembers = members.map((member) => {
      const user = member.userId as any;
      return {
        ...member.toObject(),
        userId: user && typeof user === 'object' ? {
          _id: user._id?.toString(),
          email: user.email,
          displayName: user.profile?.displayName ?? '',
          profilePictureUrl: user.profile?.profilePictureUrl ?? '',
        } : null,
      };
    });

    const tasks = (await Task.find({ projectId })
        .populate('createdBy', 'email profile.displayName profile.profilePictureUrl')
        .populate('assignedToUserIds', 'email profile.displayName profile.profilePictureUrl')
        .populate('completedBy', 'email profile.displayName profile.profilePictureUrl')
        .sort({ createdAt: -1 })) as TaskStatusOnly[];

    res.status(200).json({
      project,
      members: normalizedMembers,
      tasks,
      goals,
      isFullDetails: true
    });

  } catch (error) {
    console.error('getProjectDetails error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};