import type { Response } from 'express';
import mongoose from 'mongoose';
import ProjectChatMessage from '../models/ProjectChatMessage.js';
import ProjectMember from '../models/ProjectMember.js';
import { requireUser } from '../types/guards.js';
import type { AuthenticatedRequest } from '../types/express.js';

export const getProjectChatMessages = async (
  req: AuthenticatedRequest & { params: { projectId: string } },
  res: Response
): Promise<void> => {
  try {
    requireUser(req);
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ message: 'Invalid project id.' });
      return;
    }

    const membership = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      membershipStatus: 'active'
    });

    if (!membership) {
      res.status(403).json({ message: 'Access denied.' });
      return;
    }

    const messages = await ProjectChatMessage.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(75)
      .populate('senderId', 'email profile.displayName profile.profilePictureUrl')
      .populate('mentionedUserIds', 'email profile.displayName profile.profilePictureUrl')
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('getProjectChatMessages error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
