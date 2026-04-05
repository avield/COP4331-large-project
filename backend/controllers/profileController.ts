import type { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import User from '../models/User.js';
import type { AuthenticatedRequest } from '../types/express.js';
import { requireUser } from '../types/guards.js';
import multer, {MulterError} from "multer";

// Helper for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Check if the user is present on the request
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = req.user._id;

    // Find user to handle file cleanup
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get the profile data from FormData
    const { displayName, aboutMe, school, profilePictureUrl } = req.body;

    const profileData: any = {
      displayName,
      aboutMe,
      school,
      profilePictureUrl,
    }

    // Safely parse preferredRoles since it is JSON.stringified on the frontend
    if (req.body.preferredRoles) {
      try{
        profileData.preferredRoles = JSON.parse(req.body.preferredRoles);
      } catch(err) {
        profileData.preferredRoles = [];
      }
    }

    // Clean up logic to remove old image files already uploaded to server
    if (req.file) {
      // Check if the user already has an old profile picture stored in the server
      const oldPath = user.profile?.profilePictureUrl;

      // Only delete if there's an existing path that isn't empty
      if (oldPath && oldPath.startsWith('/uploads/')) {
        // Construct the full system path to the file
        const cleanOldPath = oldPath.substring(1);
        const fullOldPath = path.join(__dirname, '..', 'public', oldPath);

        try {
          // Delete the old file
          await fs.unlink(fullOldPath);
          console.log(`Deleted old profile pic: ${fullOldPath}`);
        } catch (error) {
          // Log error but don't stop the update if deletion fails since it could have been deleted manually
          console.error("Old file cleanup failed", error);
        }
      }

      // Set the new path, assign the new filename to the profile object
      profileData.profilePictureUrl = `/uploads/${req.file.filename}`;
    }

    // Update the database
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {$set: {profile: {...user.profile, ...profileData}}},
        {new: true, runValidators: true}
    ).select('profile');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser?.profile
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

    // Catch profile picture errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'File is too large. Max limit is 2MB.' });
        return;
      }
      res.status(400).json({ message: `Upload error: ${error.message}` });
      return;
    }

    // Catch file validation errors from fileFilter check and general errors
    if (error instanceof Error) {
      if (error.message === 'Only jpg, jpeg or png images are allowed!') {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(500).json({
        message: 'Server error', error: error.message
      })
    }

    // Default error message that aren't error objects thrown
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Server error', error: message });
  }
};