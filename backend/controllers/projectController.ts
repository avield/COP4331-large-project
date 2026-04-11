import type { Response } from 'express';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { requireUser } from '../types/guards.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ProjectMember from '../models/ProjectMember.js';
import Goal from '../models/Goal.js';
import type { AuthenticatedRequest } from '../types/express.js';

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

type PopulatedUser = {
  _id: string
  email?: string
  profile?: {
    displayName?: string
  }
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

    await session.withTransaction(async () => {
      requireUser(req);
      const projectData: {
        name: string;
        description: string;
        createdBy: string;
        visibility?: 'private' | 'public';
        dueDate?: Date;
      } = {
        name: normalizedName,
        description: normalizedDescription,
        createdBy: req.user._id
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
      project.settings = {
        allowSelfJoinRequests:
          settings.allowSelfJoinRequests ?? project.settings?.allowSelfJoinRequests ?? true,
        requireApprovalToJoin:
          settings.requireApprovalToJoin ?? project.settings?.requireApprovalToJoin ?? true,
      };
    }

    await project.save();

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

    // Fetch the project first to check visibility
    const project = await Project.findById(projectId).populate(
        'createdBy',
        'displayName email username'
    );

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // Check if the current user is a member
    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    // SECURITY CHECK: If NOT a member...
    if (!requesterMembership) {
      if (project.visibility === 'public') {
        // Return 200 OK but with restricted data for the Visitor View
        res.status(200).json({
          project,
          isFullDetails: false, // Tells frontend to show the "Locked" UI
          message: 'Limited visitor view for public project.'
        });
        return;
      }

      // If project is private and user isn't a member, block it
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    // MEMBER ACCESS: Fetch everything (Goals, Members, Tasks)
    const goals = await Goal.find({ projectId })
        .sort({ order: 1, createdAt: 1 })
        .populate('createdBy', 'email profile.displayName');

    const members = await ProjectMember.find({
      projectId,
      membershipStatus: 'active'
    })
        .populate('userId', 'email profile.displayName')
        .populate('joinedBy', 'email profile.displayName')
        .sort({ createdAt: 1 });

    const normalizedMembers = members.map((member) => {
      const user = member.userId as unknown as PopulatedUser | null;
      return {
        ...member.toObject(),
        userId: user ? {
          _id: user._id,
          email: user.email,
          displayName: user.profile?.displayName ?? '',
        } : null,
      };
    });

    const tasks = (await Task.find({ projectId })
        .populate('createdBy', 'email profile.displayName profile.profilePictureUrl')
        .populate('assignedToUserIds', 'email profile.displayName profile.profilePictureUrl')
        .populate('completedBy', 'email profile.displayName profile.profilePictureUrl')
        .sort({ createdAt: -1 })) as TaskStatusOnly[];

    const stats = {
      totalTasks: tasks.length,
      todo: tasks.filter((t: TaskStatusOnly) => t.status === 'todo').length,
      in_progress: tasks.filter((t: TaskStatusOnly) => t.status === 'in_progress').length,
      blocked: tasks.filter((t: TaskStatusOnly) => t.status === 'blocked').length,
      done: tasks.filter((t: TaskStatusOnly) => t.status === 'done').length
    };

    // Return the full package for members
    res.status(200).json({
      project,
      members: normalizedMembers,
      tasks,
      goals,
      stats,
      isFullDetails: true // Tells frontend to show the Kanban/Member UI
    });

  } catch (error) {
    console.error('getProjectDetails error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};