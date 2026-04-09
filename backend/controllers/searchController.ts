import { Request, Response } from 'express';
import { FilterQuery, Types } from 'mongoose';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ProjectMember from '../models/ProjectMember.js';

export interface AuthenticatedRequest<P = any> extends Request<P> {
  user?: {
    _id: Types.ObjectId | string;
  };
}

const PAGE_SIZE = 10;

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parsePage = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
};

const buildPagination = (total: number, page: number) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

export const globalSearch = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all').trim().toLowerCase();

    if (!req.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!q) {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    const allowedTypes = ['all', 'users', 'projects', 'tasks'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: 'Invalid search type. Must be one of: all, users......, projects, tasks.'
      });
    }

    const usersPage = parsePage(req.query.usersPage);
    const projectsPage = parsePage(req.query.projectsPage);
    const tasksPage = parsePage(req.query.tasksPage);

    const usersSkip = (usersPage - 1) * PAGE_SIZE;
    const projectsSkip = (projectsPage - 1) * PAGE_SIZE;
    const tasksSkip = (tasksPage - 1) * PAGE_SIZE;

    const escapedQuery = escapeRegex(q);
    const searchRegex = new RegExp(escapedQuery, 'i');

    const userId =
      typeof req.user._id === 'string'
        ? new Types.ObjectId(req.user._id)
        : req.user._id;

    // Find projects where current user is an active member
    const memberships = await ProjectMember.find({
      userId,
      membershipStatus: 'active'
    })
      .select('projectId')
      .lean();

    const memberProjectIds = memberships.map((membership) => membership.projectId);

    let users: any[] = [];
    let projects: any[] = [];
    let tasks: any[] = [];

    let usersTotal = 0;
    let projectsTotal = 0;
    let tasksTotal = 0;

    if (type === 'all' || type === 'users') {
      const usersQuery: FilterQuery<any> = {
        $or: [
          { 'profile.displayName': searchRegex },
          { email: searchRegex },
          { 'profile.aboutMe': searchRegex },
          { 'profile.school': searchRegex }
        ]
      };

      [usersTotal, users] = await Promise.all([
        User.countDocuments(usersQuery),
        User.find(usersQuery)
          .select('_id profile.displayName email profile.profilePictureUrl')
          .sort({ 'profile.displayName': 1 })
          .skip(usersSkip)
          .limit(PAGE_SIZE)
          .lean()
      ]);
    }

    if (type === 'all' || type === 'projects') {
      const projectsQuery: FilterQuery<any> = {
        $and: [
          {
            $or: [{ name: searchRegex }, { description: searchRegex }]
          },
          {
            $or: [
              { visibility: 'public' },
              { _id: { $in: memberProjectIds } }
            ]
          }
        ]
      };

      [projectsTotal, projects] = await Promise.all([
        Project.countDocuments(projectsQuery),
        Project.find(projectsQuery)
          .select('_id name description visibility createdBy')
          .sort({ createdAt: -1 })
          .skip(projectsSkip)
          .limit(PAGE_SIZE)
          .lean()
      ]);
    }

    if (type === 'all' || type === 'tasks') {
      const tasksQuery: FilterQuery<any> = {
        $and: [
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { status: searchRegex }
            ]
          },
          {
            projectId: { $in: memberProjectIds }
          }
        ]
      };

      [tasksTotal, tasks] = await Promise.all([
        Task.countDocuments(tasksQuery),
        Task.find(tasksQuery)
          .select('_id title description status projectId')
          .populate('projectId', 'name')
          .sort({ createdAt: -1 })
          .skip(tasksSkip)
          .limit(PAGE_SIZE)
          .lean()
      ]);
    }

    const formattedUsers = users.map((user) => ({
      type: 'user',
      id: user._id,
      displayName: user.profile.displayName,
      email: user.email,
      profilePictureUrl: user.profile.profilePictureUrl || '',
      href: `/users/${user._id}`
    }));

    const formattedProjects = projects.map((project) => ({
      type: 'project',
      id: project._id,
      name: project.name,
      description: project.description || '',
      visibility: project.visibility,
      href: `/projects/${project._id}`
    }));

    const formattedTasks = tasks.map((task) => {
      const populatedProject = task.projectId as
        | { _id: Types.ObjectId | string; name?: string }
        | Types.ObjectId
        | string
        | null;

      const projectId =
        populatedProject &&
        typeof populatedProject === 'object' &&
        '_id' in populatedProject
          ? populatedProject._id
          : populatedProject;

      const projectName =
        populatedProject &&
        typeof populatedProject === 'object' &&
        'name' in populatedProject
          ? populatedProject.name || ''
          : '';

      return {
        type: 'task',
        id: task._id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        projectId,
        projectName,
        href: projectId
          ? `/projects/${projectId}?taskId=${task._id}`
          : `/tasks/${task._id}`
      };
    });

    return res.status(200).json({
      query: q,
      results: {
        users: formattedUsers,
        projects: formattedProjects,
        tasks: formattedTasks
      },
      pagination: {
        users:
          type === 'all' || type === 'users'
            ? buildPagination(usersTotal, usersPage)
            : null,
        projects:
          type === 'all' || type === 'projects'
            ? buildPagination(projectsTotal, projectsPage)
            : null,
        tasks:
          type === 'all' || type === 'tasks'
            ? buildPagination(tasksTotal, tasksPage)
            : null
      }
    });
  } catch (error) {
    console.error('globalSearch error:', error);
    return res.status(500).json({
      message: 'Server error while searching.'
    });
  }
};