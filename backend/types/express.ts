import type { Request } from 'express';

export interface UserProfile {
  displayName?: string;
  aboutMe?: string;
  preferredRoles?: string[];
  school?: string;
  profilePictureUrl?: string;
}

export interface AuthenticatedUser {
  _id: string;
  email: string;
  isEmailVerified?: boolean;
  tokenVersion?: number;
  profile?: UserProfile;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}