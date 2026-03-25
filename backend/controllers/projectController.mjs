import mongoose from 'mongoose';
import Project from '../models/Project.mjs';
import Task from '../models/Task.mjs';
import ProjectMember from '../models/ProjectMember.mjs';

export const createProject = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      name,
      description,
      visibility,
      dueDate,
      goals
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    // Normalize optional inputs
    const normalizedName = name.trim();
    const normalizedDescription =
      typeof description === 'string' ? description.trim() : '';

    const normalizedVisibility =
      visibility === 'private' || visibility === 'public'
        ? visibility
        : undefined; // let schema default handle it if missing/invalid

    const normalizedDueDate =
      dueDate && !Number.isNaN(new Date(dueDate).getTime())
        ? new Date(dueDate)
        : null; //If a due date is given, standardize it

    const normalizedGoals = Array.isArray(goals)
      ? goals
          .filter(
            (goal) =>
              goal &&
              typeof goal.title === 'string' &&
              goal.title.trim() !== ''
          )
          .map((goal) => ({
            title: goal.title.trim(),
            description:
              typeof goal.description === 'string'
                ? goal.description.trim()
                : ''
          }))
      : []; // Trim each field in each goal in the array

    let createdProject;

    await session.withTransaction(async () => {
      // Build project payload
      const projectData = {
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
      createdProject = project;

      // Add creator as the first project member
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

      // Turn goals into initial tasks
      if (normalizedGoals.length > 0) {
        const tasksToCreate = normalizedGoals.map((goal) => ({
          projectId: project._id,
          title: goal.title,
          description: goal.description,
          createdBy: req.user._id,
          dueDate: normalizedDueDate
        }));

        await Task.create(tasksToCreate, { session });
      }
    });

    const projectWithCreator = await Project.findById(createdProject._id)
      .populate('createdBy', 'username email');

    return res.status(201).json({
      message: 'Project created successfully.',
      project: projectWithCreator
    });
  } catch (error) {
    console.error('createProject error:', error);
    return res.status(500).json({
      message: 'Internal server error. Please try again.'
    });
  } finally {
    session.endSession();
  }
};