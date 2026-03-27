import mongoose from 'mongoose';
import Project from '../models/Project.mjs';
import Task from '../models/Task.mjs';
import ProjectMember from '../models/ProjectMember.mjs';

// Create Project
// Post /api/projects/create
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

            await Task.insertMany(tasksToCreate, { session });
        }
        });

        const projectWithCreator = await Project.findById(createdProject._id)
        .populate('createdBy', 'displayName email');

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

// Retrieve Projects by userID
// GET /api/projects
export const getMyProjects = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({
      userId: req.user._id,
      membershipStatus: 'active'
    }).select('projectId');

    const projectIds = memberships.map((m) => m.projectId);

    const projects = await Project.find({
      _id: { $in: projectIds }
    })
      .populate('createdBy', 'displayName email username')
      .sort({ updatedAt: -1 });

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const members = await ProjectMember.countDocuments({
          projectId: project._id,
          membershipStatus: 'active'
        });

        const tasks = await Task.find({ projectId: project._id }).select('status');

        return {
          ...project.toObject(),
          memberCount: members,
          taskCounts: {
            total: tasks.length,
            todo: tasks.filter((t) => t.status === 'todo').length,
            in_progress: tasks.filter((t) => t.status === 'in_progress').length,
            blocked: tasks.filter((t) => t.status === 'blocked').length,
            done: tasks.filter((t) => t.status === 'done').length
          }
        };
      })
    );

    return res.status(200).json(enrichedProjects);
  } catch (error) {
    console.error('getMyProjects error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Retrieve Projects by ProjectID
// GET /api/projects/:projectId
export const getProjectById = async (req, res) => {
    try {
        const {projectId} = req.params;

        const membership = await ProjectMember.findOne({
            projectId,
            userId: req.user._id,
            membershipStatus: 'active'
        });

        if (!membership) {
            return res.status(403).json({message: "Access denied."});
        }

        const project = await Project.findById(projectId).populate('createdBy', 'displayName email');

        if (!project) {
            return res.status(404).json({message: "Project not found."});
        }

        return res.status(200).json(project);
    } catch (error){
        console.error('getProjectById error: ', error);
        return res.status(500).json({message: "Internal server error."});
    }
};

// Update Projects
// PUT /api/projects/:projectId
export const updateProject = async (req, res) => {
    try {
        const {projectId} = req.params;
        const {name, description, visibility, dueDate} = req.body;

        const membership = await ProjectMember.findOne({
            projectId,
            userId: req.user._id,
            membershipStatus: 'active'
        });

        if (!membership) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const canEdit = membership.role === 'Owner' || membership.permissions?.canEditProject;

        if (!canEdit) {
            return res.status(403).json({message: "You do not have permission to edit this project."});
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({message: "Project not found."});
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

        await project.save();

        return res.status(200).json({message: "Project updated successfully.", project});
    } catch (error) {
        console.error("updateProject error: ", error);
        return res.status(500).json({message: "Internal server error."});
    }
};

// Delete project
// DELETE /api/projects/:projectId
export const deleteProject = async (req, res) => {
    try {
        const {projectId} = req.params;

        const membership = await ProjectMember.findOne({
            projectId,
            userId: req.user._id,
            membershipStatus: 'active'
        });

        if (!membership) {
            return res.status(403).json({message: "Access denied."});
        }

        if (membership.role !== 'Owner') {
            return res.status(403).json({message: "Only the project owner can delete this project."});
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({message: "Project not found."});
        }

        await Task.deleteMany({projectId});
        await ProjectMember.deleteMany({projectId});
        await Project.findByIdAndDelete(projectId);

        return res.status(200).json({message: "Project deleted successfully."});

    } catch (error){
        console.error("deleteProject error: ", error);
        return res.status(500).json({message: "Internal server error."});
    }
};

// Get Project Details gives front end a simple route to get all details on a project.
// so
// GET /api/projects/:projectId/details
export const getProjectDetails = async (req, res) => {
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

    const project = await Project.findById(projectId)
      .populate('createdBy', 'displayName email username');

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const members = await ProjectMember.find({
      projectId,
      membershipStatus: 'active'
    })
      .populate('userId', 'displayName email username')
      .populate('joinedBy', 'displayName email username')
      .sort({ createdAt: 1 });

    const tasks = await Task.find({ projectId })
      .populate('createdBy', 'displayName email username')
      .populate('assignedToUserIds', 'displayName email username')
      .populate('completedBy', 'displayName email username')
      .sort({ createdAt: -1 });

    const stats = {
      totalTasks: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      done: tasks.filter((t) => t.status === 'done').length
    };

    return res.status(200).json({
      project,
      members,
      tasks,
      stats
    });
  } catch (error) {
    console.error('getProjectDetails error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};