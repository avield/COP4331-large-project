import mongoose from 'mongoose';
import type { Response } from 'express';
import type { TaskStatus, TaskPriority } from '../models/Task.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { requireUser } from '../types/guards.js';

type TaskStatusOnly = {
  status: TaskStatus;
};

interface TaskBody {
  projectId?: string;
  title?: string;
  description?: string;
  dueDate?: string | null;
  assignedToUserIds?: string[];
  status?: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  roleRequired?: string;
}

const validTaskStatuses = ['todo', 'in_progress', 'blocked', 'done'] as const;
const validTaskPriorities = ['low', 'medium', 'high'] as const;

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && validTaskStatuses.includes(value as TaskStatus);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && validTaskPriorities.includes(value as TaskPriority);
}

export const createTask = async (
  req: AuthenticatedRequest & { body: TaskBody },
  res: Response
): Promise<void> => {
  try {
    const {
      projectId,
      title,
      description,
      dueDate,
      assignedToUserIds,
      status,
      priority,
      tags,
      roleRequired
    } = req.body;

    if (!projectId) {
      res.status(400).json({ message: 'Project ID is required.' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ message: 'Task title is required.' });
      return;
    }

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    requireUser(req);
    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const canCreate = membership.role === 'Owner' || membership.permissions?.canCreateTasks;

    if (!canCreate) {
      res.status(403).json({ message: 'You do not have permission to create tasks.' });
      return;
    }

    let validatedAssignedUserIds: string[] = [];

    if (assignedToUserIds !== undefined) {
      if (!Array.isArray(assignedToUserIds)) {
        res.status(400).json({
          message: 'assignedToUserIds must be an array.'
        });
        return;
      }

      if (assignedToUserIds.length > 0) {
        const activeMembers = await ProjectMember.find({
          projectId,
          userId: { $in: assignedToUserIds },
          membershipStatus: 'active'
        }).select('userId');

        const activeUserIds = activeMembers.map((member) => member.userId.toString());

        const allAssignedUsersAreMembers = assignedToUserIds.every((id) =>
          activeUserIds.includes(id.toString())
        );

        if (!allAssignedUsersAreMembers) {
          res.status(400).json({
            message: 'One or more assigned users are not active members of this project.'
          });
          return;
        }

        validatedAssignedUserIds = assignedToUserIds;
      }
    }

    const validTaskStatuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
    const normalizedStatus: TaskStatus =
      typeof status === 'string' && validTaskStatuses.includes(status as TaskStatus)
        ? (status as TaskStatus)
        : 'todo';

    const validTaskPriorities: TaskPriority[] = ['low', 'medium', 'high'];
    const normalizedPriority: TaskPriority =
      typeof priority === 'string' && validTaskPriorities.includes(priority as TaskPriority)
        ? (priority as TaskPriority)
        : 'medium';

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
      : [];

    const taskData: {
      projectId: string;
      title: string;
      description: string;
      dueDate: Date | null;
      assignedToUserIds: string[];
      createdBy: string;
      status: 'todo' | 'in_progress' | 'blocked' | 'done';
      priority: 'low' | 'medium' | 'high';
      tags: string[];
      roleRequired: string;
      completedAt?: Date;
      completedBy?: string;
    } = {
      projectId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      dueDate: dueDate && !Number.isNaN(new Date(dueDate).getTime()) ? new Date(dueDate) : null,
      assignedToUserIds: validatedAssignedUserIds,
      createdBy: req.user._id,
      status: normalizedStatus,
      priority: normalizedPriority,
      tags: normalizedTags,
      roleRequired: typeof roleRequired === 'string' ? roleRequired.trim() : ''
    };

    if (normalizedStatus === 'done') {
      taskData.completedAt = new Date();
      taskData.completedBy = req.user._id;
    }

    const task = await Task.create(taskData);

    res.status(201).json({
      message: 'Task created successfully.',
      task
    });
  } catch (error) {
    console.error('createTask error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getProjectTasks = async (
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

    const projectExists = await Project.exists({ _id: projectId });
    if (!projectExists) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const tasks = await Task.find({ projectId })
      .populate('createdBy', 'displayName email')
      .populate('assignedToUserIds', 'displayName email')
      .populate('completedBy', 'displayName email')
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('getProjectTasks error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getTaskById = async (
  req: AuthenticatedRequest & { params: { taskId: string } },
  res: Response
): Promise<void> => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('createdBy', 'displayName email')
      .populate('assignedToUserIds', 'displayName email')
      .populate('completedBy', 'displayName email');

    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    requireUser(req);
    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('getTaskById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const updateTask = async (
  req: AuthenticatedRequest & { params: { taskId: string }; body: TaskBody },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { taskId } = req.params;
    const { title, description, dueDate, assignedToUserIds, status, priority, tags, roleRequired } =
      req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const canEdit =
      membership.role === 'Owner' ||
      membership.permissions?.canCreateTasks ||
      task.createdBy.toString() === req.user._id.toString();

    if (!canEdit) {
      res.status(403).json({ message: 'You do not have permission to update this task.' });
      return;
    }

    if (typeof title === 'string' && title.trim()) {
      task.title = title.trim();
    }

    if (typeof description === 'string') {
      task.description = description.trim();
    }

    if (dueDate === null || dueDate === '') {
      task.dueDate = null;
    } else if (dueDate && !Number.isNaN(new Date(dueDate).getTime())) {
      task.dueDate = new Date(dueDate);
    }

    if (status && ['todo', 'in_progress', 'blocked', 'done'].includes(status)) {
      task.status = status;

      if (status === 'done') {
        task.completedAt = new Date();
        task.completedBy = new mongoose.Types.ObjectId(req.user._id);
      } else {
        task.completedAt = null;
        task.completedBy = null;
      }
    }

    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      task.priority = priority;
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        res.status(400).json({ message: 'tags must be an array.' });
        return;
      }

      task.tags = tags
        .filter((tag) => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (typeof roleRequired === 'string') {
      task.roleRequired = roleRequired.trim();
    }

    if (assignedToUserIds !== undefined) {
      if (!Array.isArray(assignedToUserIds)) {
        res.status(400).json({
          message: 'assignedToUserIds must be an array.'
        });
        return;
      }

      if (assignedToUserIds.length === 0) {
        task.assignedToUserIds = [];
      } else {
        const activeMembers = await ProjectMember.find({
          projectId: task.projectId,
          userId: { $in: assignedToUserIds },
          membershipStatus: 'active'
        }).select('userId');

        const activeUserIds = activeMembers.map((member) => member.userId.toString());

        const allAssignedUsersAreMembers = assignedToUserIds.every((id) =>
          activeUserIds.includes(id.toString())
        );

        if (!allAssignedUsersAreMembers) {
          res.status(400).json({
            message: 'One or more assigned users are not active members of this project.'
          });
          return;
        }

        task.assignedToUserIds = assignedToUserIds;
      }
    }

    await task.save();

    res.status(200).json({
      message: 'Task updated successfully.',
      task
    });
  } catch (error) {
    console.error('updateTask error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const deleteTask = async (
  req: AuthenticatedRequest & { params: { taskId: string } },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const canDelete =
      membership.role === 'Owner' || task.createdBy.toString() === req.user._id.toString();

    if (!canDelete) {
      res.status(403).json({ message: 'You do not have permission to delete this task.' });
      return;
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    console.error('deleteTask error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getTasksTodo = async (
  request: AuthenticatedRequest,
  response: Response,
): Promise<void> => {
  try {
    requireUser(request);

    const memberships = await ProjectMember.find({
      userId: request.user._id,
      membershipStatus: 'active'
    });

    const projectIds = memberships.map(membership => membership.projectId);

    const todoTasks = await Task.find({
      projectId: { $in: projectIds },
      status: 'todo', 
    });

    response.status(200).json(todoTasks);
  } catch (error) {
    console.error('getTasksTodo error:', error);
    response.status(500).json({ message: 'Internal server error.' });
  }
};