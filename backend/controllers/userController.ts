import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import User from '../models/User.js';
import ProjectMember from '../models/ProjectMember.js';
import Project from '../models/Project.js';
import { AuthenticatedRequest } from './searchController.js';

interface UserParams {
    userId: string;
}

export const getUserProfile = async (
    req: AuthenticatedRequest<UserParams>,
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
                select: 'name description visibility createdAt'
            })
            .sort({ createdAt: -1 })
            .lean();

        // Filter for Public Projects ONLY
        const publicProjects = memberships
            .filter((m: any) => m.projectId && m.projectId.visibility === 'public')
            .map((m: any) => ({
                _id: m.projectId._id,
                name: m.projectId.name,
                description: m.projectId.description,
                role: m.role,
                createdAt: m.projectId.createdAt,
                href: `/projects/${m.projectId._id}`
            }));

        return res.status(200).json({
            user: {
                id: user._id,
                ...user.profile,
                email: isCurrentUser ? user.email : undefined,
                status: user.status,
                createdAt: user.createdAt,
                isCurrentUser
            },
            projects: publicProjects
        });

    } catch (error) {
        console.error('getUserProfile error:', error);
        return res.status(500).json({ message: 'Server error fetching profile.' });
    }
};