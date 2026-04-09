import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import User from '../models/User.js';
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
            .select('profile status createdAt')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if I searched my own account
        const isCurrentUser = currentUserId?.toString() === user._id.toString();

        // Fetch Projects
        // Owners see all their projects; visitors see only public ones
        const projectQuery = isCurrentUser
            ? { createdBy: userId }
            : { createdBy: userId, visibility: 'public' };

        const projects = await Project.find(projectQuery)
            .select('name description visibility createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Send Response Object
        return res.status(200).json({
            user: {
                id: user._id,
                ...user.profile, // displayName, school, aboutMe, etc.
                email: isCurrentUser ? user.email : undefined, // Privacy guard, only show my own email
                status: user.status,
                createdAt: user.createdAt,
                isCurrentUser
            },
            projects: projects.map(p => ({
                ...p,
                href: `/projects/${p._id}`
            }))
        });

    } catch (error) {
        console.error('getUserProfile error:', error);
        return res.status(500).json({ message: 'Server error fetching profile.' });
    }
};