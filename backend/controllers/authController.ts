import type { Request, Response, CookieOptions } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import emojiRegex from 'emoji-regex';
import { requireUser } from '../types/guards.js';
import User from '../models/User.js';
import transporter from '../utils/mailer.js';
import type { AuthenticatedRequest } from '../types/express.js';

interface JwtUserLike {
  _id: { toString(): string } | string;
  tokenVersion?: number;
}

interface RefreshTokenPayload extends jwt.JwtPayload {
  id: string;
  type: 'refresh';
  tokenVersion?: number;
}

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface ForgotPasswordBody {
  email?: string;
}

interface ResetPasswordBody {
  password?: string;
}

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

if (!accessTokenSecret || !refreshTokenSecret) {
  throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be defined.');
}

const DEFAULT_REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseJwtExpiresInToMs(value: string | undefined): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  const asNumber = Number(trimmed);

  // jsonwebtoken treats numeric strings as seconds.
  if (Number.isFinite(asNumber)) {
    return asNumber * 1000;
  }

  const match = trimmed.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

const refreshTokenMaxAgeMs =
  parseJwtExpiresInToMs(process.env.REFRESH_TOKEN_EXPIRES_IN) ?? DEFAULT_REFRESH_MAX_AGE_MS;

const generateAccessToken = (user: JwtUserLike): string => {
  return jwt.sign(
    {
      id: user._id.toString(),
      type: 'access',
      tokenVersion: user.tokenVersion ?? 0
    },
    accessTokenSecret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '5m' } as SignOptions
  );
};

const generateRefreshToken = (user: JwtUserLike): string => {
  return jwt.sign(
    {
      id: user._id.toString(),
      type: 'refresh',
      tokenVersion: user.tokenVersion ?? 0
    },
    refreshTokenSecret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' } as SignOptions
  );
};

const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: refreshTokenMaxAgeMs
  };
};

const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    ...getRefreshCookieOptions(),
    maxAge: undefined
  });
};

const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

function isLowerCaseUnicode(char: string): boolean {
  return /^\p{Ll}$/u.test(char);
}

function isUpperCaseUnicode(char: string): boolean {
  return /^\p{Lu}$/u.test(char);
}

function isNumber(char: string): boolean {
  return /^\p{Nd}$/u.test(char);
}

const emojiRe = emojiRegex();

function isSymbol(char: string): boolean {
  return /[\p{P}\p{S}]/u.test(char) && !emojiRe.test(char);
}

export const registerUser = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response
): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ message: 'Email, password, and display name are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Passwords must be at least 8 characters long.' });
      return;
    }

    let flagSymbols = false;
    let flagNumber = false;
    let flagUpper = false;
    let flagLower = false;

    for (let i = 0; i < password.length; i++) {
      const char = password[i];

      if (!flagLower && isLowerCaseUnicode(char)) flagLower = true;
      if (!flagUpper && isUpperCaseUnicode(char)) flagUpper = true;
      if (!flagNumber && isNumber(char)) flagNumber = true;
      if (!flagSymbols && isSymbol(char)) flagSymbols = true;

      if (flagLower && flagUpper && flagNumber && flagSymbols) {
        break;
      }
    }

    if (!flagLower) {
      res.status(400).json({ message: 'Passwords must contain a lower case letter.' });
      return;
    }
    if (!flagUpper) {
      res.status(400).json({ message: 'Passwords must contain an upper case letter.' });
      return;
    }
    if (!flagNumber) {
      res.status(400).json({ message: 'Passwords must contain a number.' });
      return;
    }
    if (!flagSymbols) {
      res.status(400).json({ message: 'Passwords must contain a symbol.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = displayName.trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rawEmailVerificationToken = generateEmailVerificationToken();
    const hashedEmailVerificationToken = hashToken(rawEmailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      emailVerificationToken: hashedEmailVerificationToken,
      emailVerificationExpires,
      isEmailVerified: false,
      refreshTokenHash: null,
      refreshTokenExpires: null,
      tokenVersion: 0,
      profile: {
        displayName: trimmedName
      }
    });

    const verificationUrl = `${process.env.BACKEND_URL}/auth/verify-email/${rawEmailVerificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Taskademia Account Email Verification',
      html: `
      <div style="font-family: Arial, sans-serif; text-align: center;">
        <h2>Welcome to Taskademia!</h2>
        <p>Click the button below to verify your account:</p>
        <a href="${verificationUrl}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
           Verify My Account
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If the button doesn't work, copy this link: <br>
          ${verificationUrl}
        </p>
      </div>
    `
    };

    try {
      await transporter.sendMail(mailOptions);

      res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.profile?.displayName ?? '',
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (error) {
      console.error('Email delivery failed:', error);
      res.status(500).json({ message: 'User created, but verification email failed to send.' });
    }
  } catch (error) {
    console.error(error);

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      res.status(400).json({ message: 'User already exists.' });
      return;
    }

    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

export const verifyEmail = async (
  req: Request<{ token: string }>,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ message: 'Verification token is required.' });
      return;
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid-token`);
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.status = 'active';

    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (error) {
    console.error(error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server-error`);
  }
};

export const resendVerificationEmail = async (
  req: Request<{}, {}, { email?: string }>,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    const genericMessage =
      'If that email exists and still needs verification, a verification link has been sent.';

    if (!user || user.isEmailVerified) {
      res.status(200).json({ message: genericMessage });
      return;
    }

    const rawToken = generateEmailVerificationToken();
    const hashedToken = hashToken(rawToken);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await user.save();

    const verificationUrl = `${process.env.BACKEND_URL}/auth/verify-email/${rawToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Taskademia Account Email Verification (Resend)',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>Verify your account</h2>
          <p>You requested a new verification link. Click below:</p>
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify My Account</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If the button doesn't work, copy this link: <br>
          ${verificationUrl}
        </p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: genericMessage });
    } catch (error) {
      console.error('Email delivery failed:', error);
      res.status(500).json({ error: 'Could not send verification email.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const loginUser = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please enter an email and/or password.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(403).json({ message: 'Please verify your email before logging in.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenExpires = new Date(Date.now() + refreshTokenMaxAgeMs);
    await user.save();

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.profile?.displayName ?? '',
        isEmailVerified: user.isEmailVerified,
        profile: {
          displayName: user.profile?.displayName ?? '',
          profilePictureUrl: user.profile?.profilePictureUrl ?? ''
        }
      },
      accessToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = (req as Request & { cookies?: { refreshToken?: string } }).cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token missing.' });
      return;
    }

    let decoded: RefreshTokenPayload;

    try {
      const verified = jwt.verify(refreshToken, refreshTokenSecret);
      if (typeof verified === 'string') {
        res.status(401).json({ message: 'Invalid or expired refresh token.' });
        return;
      }
      decoded = verified as RefreshTokenPayload;
    } catch {
      res.status(401).json({ message: 'Invalid or expired refresh token.' });
      return;
    }

    if (decoded.type !== 'refresh') {
      res.status(401).json({ message: 'Invalid token type.' });
      return;
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'User not found.' });
      return;
    }

    // Backward compatibility: older refresh tokens may not carry tokenVersion.
    const decodedTokenVersion = decoded.tokenVersion ?? 0;
    if ((user.tokenVersion ?? 0) !== decodedTokenVersion) {
      res.status(401).json({ message: 'Refresh token revoked.' });
      return;
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpires) {
      res.status(401).json({ message: 'Refresh token not recognized.' });
      return;
    }

    if (user.refreshTokenExpires <= new Date()) {
      res.status(401).json({ message: 'Stored refresh token expired' });
      return;
    }

    const incomingHash = hashToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      res.status(401).json({ message: 'Refresh token mismatch' });
      return;
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = (req as Request & { cookies?: { refreshToken?: string } }).cookies?.refreshToken;

    if (refreshToken) {
      try {
        const verified = jwt.verify(refreshToken, refreshTokenSecret);
        if (typeof verified !== 'string') {
          const decoded = verified as RefreshTokenPayload;
          const user = await User.findById(decoded.id);

          if (user) {
            user.refreshTokenHash = null;
            user.refreshTokenExpires = null;
            await user.save();
          }
        }
      } catch {
        // ignore invalid cookie on logout
      }
    }

    clearRefreshTokenCookie(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (
  req: Request<{}, {}, ForgotPasswordBody>,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click <a href="${resetUrl}">here</a> to reset it.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset link sent to email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const resetPassword = async (
  req: Request<{ token: string }, {}, ResetPasswordBody>,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Password is required.' });
      return;
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({ message: 'Token is invalid or has expired.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    res.status(200).json({ message: 'Password updated successfully. Try logging in now.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  requireUser(req);
  res.status(200).json({
    user: {
      id: req.user._id,
      email: req.user.email,
      profile: {
        displayName: req.user.profile?.displayName ?? '',
        profilePictureUrl: req.user.profile?.profilePictureUrl ?? ''
      }
    }
  });
};