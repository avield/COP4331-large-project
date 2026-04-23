import { Response } from 'express';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import Task from '../models/Task.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import ProjectMember from '../models/ProjectMember.js';
import Project from '../models/Project.js';
import { requireUser } from '../types/guards.js';
import type { AuthenticatedRequest } from '../types/express.js';
import path from 'node:path';
import { UPLOAD_DIR } from './profileController.js';
import fs from 'fs/promises';


interface UserParams {
    userId: string;
}

interface ProfileProject {
    _id: any;
    name: string;
    description: string;
    role: string;
    status: string;
    createdAt: Date;
    href: string;
}

export const getUserProfile = async (
    req: AuthenticatedRequest & { params: UserParams },
    res: Response
): Promise<Response> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?._id;

        // Validate ID format
        if (!Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid User ID format.' });
        }

        // Fetch User Data
        const user = await User.findById(userId)
            .select('profile status email createdAt')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if I searched my own account
        const isCurrentUser = currentUserId?.toString() === user._id.toString();

        // Fetch Projects and memberships where user is active
        const projectQuery = isCurrentUser
            ? { createdBy: userId }
            : { createdBy: userId, visibility: 'public' };

        // Fetch memberships and populate the project details
        const memberships = await ProjectMember.find({
            userId: userId,
            membershipStatus: 'active'
        })
            .populate({
                path: 'projectId',
                select: 'name description visibility createdAt status'
            })
            .sort({ createdAt: -1 })
            .lean();

        // Filter and Map the data into two separate buckets
        const projects = memberships
            .filter((m: any) => {
                if (!m.projectId) return false;
                // If it's me, show all. If it's a visitor, show only public.
                return isCurrentUser || m.projectId.visibility === 'public';
            })
            .reduce((acc, m: any) => {
                const projectInfo: ProfileProject = {
                    _id: m.projectId._id,
                    name: m.projectId.name,
                    description: m.projectId.description,
                    role: m.role || 'Member',
                    status: m.projectId.status || 'active', // Fallback
                    createdAt: m.projectId.createdAt,
                    href: `/projects/${m.projectId._id}`
                };

                if (m.projectId.status === 'completed') {
                    acc.completed.push(projectInfo);
                } else {
                    acc.active.push(projectInfo);
                }
                return acc;
            }, { active: [] as ProfileProject[], completed: [] as ProfileProject[] });

        return res.status(200).json({
            user: {
                id: user._id,
                ...user.profile,
                email: isCurrentUser ? user.email : undefined,
                status: user.status,
                createdAt: user.createdAt,
                isCurrentUser
            },
            projects: projects
        });

    } catch (error) {
        console.error('getUserProfile error:', error);
        return res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

export const deleteMyAccount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();

  try {
    requireUser(req);
    const userId = req.user._id;
    let user_pic_path = req.user.profile?.profilePictureUrl || null;

    await session.withTransaction(async () => {
      // 1) Find every active membership for this user
      const memberships = await ProjectMember.find({
        userId,
        membershipStatus: 'active',
      }).session(session);

      for (const membership of memberships) {
        const projectId = membership.projectId;
        const isOwner = membership.role === 'Owner';

        if (isOwner) {
          // Find other active members ordered by seniority
          const replacementMember = await ProjectMember.findOne({
            projectId,
            userId: { $ne: userId },
            membershipStatus: 'active',
          })
            .sort({ createdAt: 1, _id: 1 })
            .session(session);

          if (replacementMember) {
            // Transfer project ownership
            await Project.findByIdAndUpdate(
              projectId,
              { createdBy: replacementMember.userId },
              { session }
            );

            replacementMember.role = 'Owner';
            replacementMember.permissions = {
              canEditProject: true,
              canManageMembers: true,
              canCreateTasks: true,
              canAssignTasks: true,
              canCompleteAnyTask: true,
              canModerateChat: true,
            };
            await replacementMember.save({ session });

            // Remove old owner's membership row
            await ProjectMember.deleteOne({ _id: membership._id }).session(session);
          } else {
            // No other active members: delete the whole project
            await Task.deleteMany({ projectId }).session(session);
            await Goal.deleteMany({ projectId }).session(session);
            await ProjectMember.deleteMany({ projectId }).session(session);
            await Project.deleteOne({ _id: projectId }).session(session);
          }
        } else {
          // Non-owner: just remove their membership
          await ProjectMember.deleteOne({ _id: membership._id }).session(session);
        }
      }

      // 2) Unassign this user from all tasks
      await Task.updateMany(
        { assignedToUserIds: userId },
        { $pull: { assignedToUserIds: userId } },
        { session }
      );

      // 3) In case there are pending invitations / requests for this user, remove those too
      await ProjectMember.deleteMany({ userId }).session(session);

      // 4) Delete the user
      await User.deleteOne({ _id: userId }).session(session);
    });

    if (user_pic_path) {
      await deleteUserPicture(user_pic_path);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/api/auth/refresh',
    });

    res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('deleteMyAccount error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  } finally {
    await session.endSession();
  }
};

async function deleteUserPicture(oldPath: string) {
  // Only delete if there's an existing path that isn't empty
  if (oldPath && oldPath.includes('/public/uploads/')) {
    try {
      // Get the filename
      const filename = path.basename(oldPath);

      // Construct the path
      // Ensures the OS handles the slashes correctly using path.resolve
      const fullOldPath = path.join(UPLOAD_DIR, filename);

      // Delete the old file
      await fs.unlink(fullOldPath);
      console.log(`Deleted: ${fullOldPath}`);
    } catch (error: any) {
      // If the file is already gone, we don't want to crash the update
      if (error.code !== 'ENOENT') {
        console.error("Error during file deletion:", error.message);
      }
    }
  }
}