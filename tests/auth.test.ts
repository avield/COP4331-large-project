import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockRequest, mockResponse } from './helpers/mockExpress.js';

const userModel: any = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const bcryptMock: any = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const jwtMock: any = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const sendMailMock: any = jest.fn();

jest.unstable_mockModule('../backend/models/User.js', () => ({
  default: userModel,
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: bcryptMock,
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: jwtMock,
}));

jest.unstable_mockModule('../backend/utils/mailer.js', () => ({
  default: {
    sendMail: sendMailMock,
  },
}));

const {
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} = await import('../backend/controllers/authController.js');

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    bcryptMock.hash.mockResolvedValue('hashed-password');
    bcryptMock.compare.mockResolvedValue(true);

    jwtMock.sign.mockImplementation((payload: { type?: string }) =>
      payload.type === 'refresh' ? 'refresh-token' : 'access-token'
    );
    jwtMock.verify.mockReturnValue({ id: 'user-1', type: 'refresh', tokenVersion: 0 });

    sendMailMock.mockResolvedValue(undefined);
  });

  it('loginUser returns 400 if missing email/password', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await loginUser(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser returns 400 if required fields are missing', async () => {
    const req = mockRequest({ body: { email: 'a@test.com' } });
    const res = mockResponse();

    await registerUser(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('registerUser creates a user and sends a verification email', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      _id: 'user-1',
      email: 'new@test.com',
      isEmailVerified: false,
      profile: { displayName: 'New User' },
    });

    const req = mockRequest({
      body: {
        email: 'new@test.com',
        password: 'Valid1!a',
        displayName: ' New User ',
      },
    });
    const res = mockResponse();

    await registerUser(req as any, res as any);

    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@test.com',
        profile: { displayName: 'New User' },
      })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@test.com',
        subject: 'Taskademia Account Email Verification',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('verifyEmail redirects to invalid-token when no matching user exists', async () => {
    userModel.findOne.mockResolvedValue(null);

    const req = mockRequest({ params: { token: 'missing-token' } });
    const res = mockResponse();

    await verifyEmail(req as any, res as any);

    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5000/login?error=invalid-token');
  });

  it('verifyEmail activates a matching user and redirects to verified page', async () => {
    const userDoc = {
      isEmailVerified: false,
      emailVerificationToken: 'old-token',
      emailVerificationExpires: new Date(Date.now() + 60_000),
      status: 'created',
      save: jest.fn(),
    };
    userModel.findOne.mockResolvedValue(userDoc);

    const req = mockRequest({ params: { token: 'valid-token' } });
    const res = mockResponse();

    await verifyEmail(req as any, res as any);

    expect(userDoc.save).toHaveBeenCalled();
    expect(userDoc.isEmailVerified).toBe(true);
    expect(userDoc.status).toBe('active');
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5000/login?verified=true');
  });

  it('resendVerificationEmail returns a generic message for verified users', async () => {
    userModel.findOne.mockResolvedValue({ isEmailVerified: true });

    const req = mockRequest({ body: { email: 'verified@test.com' } });
    const res = mockResponse();

    await resendVerificationEmail(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('loginUser stores a hashed refresh token and sets the refresh cookie', async () => {
    const userDoc = {
      _id: 'user-1',
      email: 'user@test.com',
      passwordHash: 'stored-hash',
      isEmailVerified: true,
      tokenVersion: 0,
      refreshTokenHash: null,
      refreshTokenExpires: null,
      profile: { displayName: 'Test User', profilePictureUrl: '' },
      save: jest.fn(),
    };
    userModel.findOne.mockResolvedValue(userDoc);

    const req = mockRequest({
      body: { email: 'user@test.com', password: 'Valid1!a' },
    });
    const res = mockResponse();

    await loginUser(req as any, res as any);

    expect(userDoc.refreshTokenHash).toBe(hashToken('refresh-token'));
    expect(userDoc.refreshTokenExpires).toBeInstanceOf(Date);
    expect(userDoc.save).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('refreshAccessToken returns 401 if refresh token is missing', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await refreshAccessToken(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('refreshAccessToken accepts legacy refresh tokens without tokenVersion', async () => {
    jwtMock.verify.mockReturnValue({ id: 'user-1', type: 'refresh' });
    userModel.findById.mockResolvedValue({
      _id: 'user-1',
      tokenVersion: 0,
      refreshTokenHash: hashToken('legacy-refresh-token'),
      refreshTokenExpires: new Date(Date.now() + 60_000),
    });

    const req = mockRequest({ cookies: { refreshToken: 'legacy-refresh-token' } });
    const res = mockResponse();

    await refreshAccessToken(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access-token' });
  });

  it('logoutUser clears stored refresh token state and cookie', async () => {
    const userDoc = {
      refreshTokenHash: 'old-hash',
      refreshTokenExpires: new Date(Date.now() + 60_000),
      save: jest.fn(),
    };
    userModel.findById.mockResolvedValue(userDoc);

    const req = mockRequest({ cookies: { refreshToken: 'refresh-token' } });
    const res = mockResponse();

    await logoutUser(req as any, res as any);

    expect(userDoc.refreshTokenHash).toBeNull();
    expect(userDoc.refreshTokenExpires).toBeNull();
    expect(userDoc.save).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('forgotPassword creates a reset token and sends email when the user exists', async () => {
    const userDoc = {
      email: 'user@test.com',
      passwordResetToken: null,
      passwordResetExpires: null,
      save: jest.fn(),
    };
    userModel.findOne.mockResolvedValue(userDoc);

    const req = mockRequest({ body: { email: 'user@test.com' } });
    const res = mockResponse();

    await forgotPassword(req as any, res as any);

    expect(userDoc.passwordResetToken).toEqual(expect.any(String));
    expect(userDoc.passwordResetExpires).toBeInstanceOf(Date);
    expect(userDoc.save).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Password Reset Request',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('resetPassword updates the password and increments tokenVersion', async () => {
    const userDoc = {
      passwordHash: 'old-hash',
      passwordResetToken: 'existing-token',
      passwordResetExpires: new Date(Date.now() + 60_000),
      tokenVersion: 0,
      save: jest.fn(),
    };
    userModel.findOne.mockResolvedValue(userDoc);

    const req = mockRequest({
      params: { token: 'reset-token' },
      body: { password: 'BrandNew1!' },
    });
    const res = mockResponse();

    await resetPassword(req as any, res as any);

    expect(userDoc.passwordHash).toBe('hashed-password');
    expect(userDoc.passwordResetToken).toBeNull();
    expect(userDoc.passwordResetExpires).toBeNull();
    expect(userDoc.tokenVersion).toBe(1);
    expect(userDoc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getCurrentUser returns 200 when req.user exists', async () => {
    const req = mockRequest({
      user: {
        _id: '123',
        email: 'test@test.com',
        profile: {
          displayName: 'Test User',
          profilePictureUrl: '',
        },
      },
    });
    const res = mockResponse();

    await getCurrentUser(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});