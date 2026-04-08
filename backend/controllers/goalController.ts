import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import Goal from '../models/Goal.js'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import ProjectMember from '../models/ProjectMember.js'

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string
    id?: string
    email?: string
  }
}

const canAccessProject = async (projectId: string, userId: string) => {
  const project = await Project.findById(projectId).select('_id visibility createdBy')
  if (!project) {
    return { allowed: false, project: null, membership: null }
  }

  const membership = await ProjectMember.findOne({
    projectId,
    userId,
    membershipStatus: 'active',
  })

  const isOwner =
    project.createdBy && project.createdBy.toString() === userId

  const allowed =
    !!membership || isOwner || project.visibility === 'public'

  return { allowed, project, membership }
}

const canManageGoals = async (projectId: string, userId: string) => {
  const project = await Project.findById(projectId).select('_id createdBy')
  if (!project) {
    return { allowed: false, project: null, membership: null }
  }

  const membership = await ProjectMember.findOne({
    projectId,
    userId,
    membershipStatus: 'active',
  })

  const isOwner =
    project.createdBy && project.createdBy.toString() === userId

  const allowed =
    isOwner || !!membership?.permissions?.canEditProject

  return { allowed, project, membership }
}

// POST /api/goals
export const createGoal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { projectId, title, description } = req.body as {
      projectId?: string
      title?: string
      description?: string
    }

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Valid projectId is required' })
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Goal title is required' })
    }

    const access = await canManageGoals(projectId, userId)
    if (!access.project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (!access.allowed) {
      return res.status(403).json({ message: 'Not allowed to create goals for this project' })
    }

    const lastGoal = await Goal.findOne({ projectId })
      .sort({ order: -1 })
      .select('order')

    const nextOrder = typeof lastGoal?.order === 'number' ? lastGoal.order + 1 : 0

    const goal = await Goal.create({
      projectId,
      title: title.trim(),
      description: description?.trim() ?? '',
      order: nextOrder,
      createdBy: userId,
    })

    return res.status(201).json({ goal })
  } catch (error) {
    console.error('createGoal error:', error)
    return res.status(500).json({ message: 'Failed to create goal' })
  }
}

// GET /api/goals/project/:projectId
export const getProjectGoals = async (
  req: AuthenticatedRequest & { params: { projectId: string } },
  res: Response
) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { projectId } = req.params

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId' })
    }

    const access = await canAccessProject(projectId, userId)
    if (!access.project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (!access.allowed) {
      return res.status(403).json({ message: 'Not allowed to view goals for this project' })
    }

    const goals = await Goal.find({ projectId })
      .sort({ order: 1, createdAt: 1 })
      .populate('createdBy', 'email profile.displayName')

    return res.status(200).json({ goals })
  } catch (error) {
    console.error('getProjectGoals error:', error)
    return res.status(500).json({ message: 'Failed to fetch goals' })
  }
}

// PUT /api/goals/:goalId
export const updateGoal = async (
  req: AuthenticatedRequest & { params: { goalId: string } },
  res: Response
) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { goalId } = req.params

    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goalId' })
    }

    const goal = await Goal.findById(goalId)
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' })
    }

    const access = await canManageGoals(goal.projectId.toString(), userId)
    if (!access.allowed) {
      return res.status(403).json({ message: 'Not allowed to update this goal' })
    }

    const { title, description, order } = req.body as {
      title?: string
      description?: string
      order?: number
    }

    if (typeof title === 'string') {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        return res.status(400).json({ message: 'Goal title cannot be empty' })
      }
      goal.title = trimmedTitle
    }

    if (typeof description === 'string') {
      goal.description = description.trim()
    }

    if (typeof order === 'number') {
      goal.order = order
    }

    await goal.save()

    return res.status(200).json({ goal })
  } catch (error) {
    console.error('updateGoal error:', error)
    return res.status(500).json({ message: 'Failed to update goal' })
  }
}

// DELETE /api/goals/:goalId
export const deleteGoal = async (
  req: AuthenticatedRequest & {
    params: { goalId: string }
    query: { taskAction?: string }
  },
  res: Response
) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { goalId } = req.params
    const taskAction = req.query.taskAction === 'delete' ? 'delete' : 'unassign'

    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: 'Invalid goalId' })
    }

    const goal = await Goal.findById(goalId)
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' })
    }

    const access = await canManageGoals(goal.projectId.toString(), userId)
    if (!access.allowed) {
      return res.status(403).json({ message: 'Not allowed to delete this goal' })
    }

    if (taskAction === 'delete') {
      await Task.deleteMany({ goalId: goal._id })
    } else {
      await Task.updateMany(
        { goalId: goal._id },
        { $set: { goalId: null } }
      )
    }

    await goal.deleteOne()

    return res.status(200).json({
      message:
        taskAction === 'delete'
          ? 'Goal and associated tasks deleted successfully'
          : 'Goal deleted successfully and tasks were unassigned',
    })
  } catch (error) {
    console.error('deleteGoal error:', error)
    return res.status(500).json({ message: 'Failed to delete goal' })
  }
}