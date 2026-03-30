import type { Response } from 'express';
import User from '../models/User.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { requireUser } from '../types/guards.js';

// GET profile info
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    res.status(200).json(req.user.profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      message: 'Server error while retrieving profile info',
      error: message
    });
  }
};

// PUT profile info update
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    requireUser(req);
    const { profile } = req.body as { profile: unknown };
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profile } },
      {
        new: true,
        runValidators: true
      }
    ).select('profile');

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser.profile
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as Error & { errors?: unknown };
      res.status(400).json({
        message: 'Validation failed',
        errors: validationError.errors
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};