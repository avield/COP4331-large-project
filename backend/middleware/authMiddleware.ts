import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import type { AuthenticatedUser } from '../types/express.js';

interface AccessTokenPayload extends jwt.JwtPayload {
  id: string;
  type?: string;
  tokenVersion?: number;
}

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

const protect = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.ACCESS_TOKEN_SECRET;

    if (!jwtSecret) {
      res.status(500).json({ message: 'JWT secret is not configured' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === 'string') {
      res.status(401).json({ message: 'Not authorized, invalid token' });
      return;
    }

    const payload = decoded as AccessTokenPayload;

    if (!payload.id) {
      res.status(401).json({ message: 'Not authorized, invalid token payload' });
      return;
    }

    if (payload.type && payload.type !== 'access') {
      res.status(401).json({ message: 'Not authorized, wrong token type' });
      return;
    }

    const user = await User.findById(payload.id).select('-passwordHash');

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    if (payload.tokenVersion !== undefined && (user.tokenVersion ?? 0) !== payload.tokenVersion) {
      res.status(401).json({ message: 'Not authorized, token expired or revoked' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({
        message: 'Please verify your email before accessing this resource.'
      });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      tokenVersion: user.tokenVersion ?? 0,
      profile: user.profile ?? undefined
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export default protect;