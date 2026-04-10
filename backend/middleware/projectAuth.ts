import { Response, NextFunction } from 'express';
import ProjectMember from '../models/ProjectMember.js';
import { AuthenticatedRequest } from '../types/express.js';
import { requireUser } from '../types/guards.js';

export const checkCanManageMembers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // Narrows the type and throws/returns if user is missing
        requireUser(req);

        const { projectId } = req.params;
        const userId = req.user._id;

        const membership = await ProjectMember.findOne({
            projectId,
            userId,
            membershipStatus: 'active'
        });

        const canManage =
            membership?.role === 'Owner' ||
            membership?.permissions?.canManageMembers;

        if (!canManage) {
            res.status(403).json({ message: 'You do not have permission to manage members.' });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error during authorization.' });
    }
};