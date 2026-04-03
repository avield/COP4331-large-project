import type { Response } from 'express';
import User from '../models/User.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { requireUser } from '../types/guards.js';

// Extend the type to include Multer file property
type ProfileUploadRequest = AuthenticatedRequest & {
  file?: Express.Multer.File;
};

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
export const updateProfile = async (req: ProfileUploadRequest, res: Response): Promise<void> => {
  try {
    requireUser(req);
    const userId = req.user._id;

    // When using FOrmData on teh frontend, 'profile' might arrive as a JSON string or as individual fields. Adjust to handle both.
    let profileData: any = {};
    if(typeof req.body.profile === 'string') {
      profileData = JSON.parse(req.body.profile);
    } else {
      profileData = req.body.profile || {};
    }

    // If Multer successfully saved a file, add the local path to the profile object
    if (req.file) {
      profileData.profilePictureUrl = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profileData } },
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