import Task from '../models/Task.mjs';
import Project from '../models/Project.mjs';
import ProjectMember from '../models/ProjectMember.mjs';

// Create Task
// POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { projectId, title, description, dueDate, assignedToUserIds, status, priority, tags, roleRequired } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const canCreate =
      membership.role === 'Owner' ||
      membership.permissions?.canCreateTasks;

    if (!canCreate) {
      return res.status(403).json({ message: 'You do not have permission to create tasks.' });
    }

    let validatedAssignedUserIds = [];

    if (assignedToUserIds !== undefined) {
      if (!Array.isArray(assignedToUserIds)) {
        return res.status(400).json({
          message: 'assignedToUserIds must be an array.'
        });
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
          return res.status(400).json({
            message: 'One or more assigned users are not active members of this project.'
          });
        }

        validatedAssignedUserIds = assignedToUserIds;
      }
    }

    const normalizedStatus =
      typeof status === 'string' &&
      ['todo', 'in_progress', 'blocked', 'done'].includes(status)
        ? status
        : 'todo';

    const normalizedPriority =
      typeof priority === 'string' &&
      ['low', 'medium', 'high'].includes(priority)
        ? priority
        : 'medium';

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean)
      : [];

    const taskData = {
      projectId,
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      dueDate:
        dueDate && !Number.isNaN(new Date(dueDate).getTime())
          ? new Date(dueDate)
          : null,
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

    return res.status(201).json({
      message: 'Task created successfully.',
      task
    });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Retrieve Tasks
// GET /api/tasks/project/:projectId
export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const projectExists = await Project.exists({ _id: projectId });
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const tasks = await Task.find({ projectId })
      .populate('createdBy', 'displayName email')
      .populate('assignedToUserIds', 'displayName email')
      .populate('completedBy', 'displayName email')
      .sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (error) {
    console.error('getProjectTasks error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Retrieve Task by ID
// GET /api/tasks/:taskId
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('createdBy', 'displayName email')
      .populate('assignedToUserIds', 'displayName email')
      .populate('completedBy', 'displayName email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json(task);
  } catch (error) {
    console.error('getTaskById error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update Task
// PUT /api/tasks/:taskId
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, assignedToUserIds, status, priority, tags, roleRequired } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const canEdit =
      membership.role === 'Owner' ||
      membership.permissions?.canCreateTasks ||
      task.createdBy.toString() === req.user._id.toString();

    if (!canEdit) {
      return res.status(403).json({ message: 'You do not have permission to update this task.' });
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
        task.completedBy = req.user._id;
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
        return res.status(400).json({ message: 'tags must be an array.' });
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
        return res.status(400).json({
          message: 'assignedToUserIds must be an array.'
        });
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
          return res.status(400).json({
            message: 'One or more assigned users are not active members of this project.'
          });
        }

        task.assignedToUserIds = assignedToUserIds;
      }
    }

    await task.save();

    return res.status(200).json({
      message: 'Task updated successfully.',
      task
    });
  } catch (error) {
    console.error('updateTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Delete Task
// DELETE /api/tasks/:taskId
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const membership = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const canDelete =
      membership.role === 'Owner' ||
      task.createdBy.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ message: 'You do not have permission to delete this task.' });
    }

    await Task.findByIdAndDelete(taskId);

    return res.status(200).json({
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    console.error('deleteTask error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};