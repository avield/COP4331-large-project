import { once } from 'node:events';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const userModel: any = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const sendMailMock: any = jest.fn();

jest.unstable_mockModule('../backend/models/User.js', () => ({
  default: userModel,
}));

jest.unstable_mockModule('../backend/utils/mailer.js', () => ({
  default: {
    sendMail: sendMailMock,
  },
}));

const { default: authRoutes } = await import('../backend/routes/authRoutes.js');

function createAwaitableFindByIdResult(user: any) {
  const promise = Promise.resolve(user);

  return {
    select: (jest.fn() as any).mockResolvedValue(user),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
}

function createUserDoc(overrides: Record<string, unknown> = {}) {
  const id = overrides._id ?? { toString: () => 'user-1' };

  return {
    _id: id,
    email: 'user@test.com',
    passwordHash: '',
    isEmailVerified: true,
    refreshTokenHash: null,
    refreshTokenExpires: null,
    tokenVersion: 0,
    profile: {
      displayName: 'Integration User',
      profilePictureUrl: '',
    },
    save: (jest.fn() as any).mockResolvedValue(undefined),
    ...overrides,
  };
}

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

describe('Auth route integration', () => {
  let server: ReturnType<express.Express['listen']>;
  let baseUrl = '';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRoutes);

    server = app.listen(0);
    await once(server, 'listening');

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers through the real auth route and sends a verification email', async () => {
    const createdUser = createUserDoc({
      email: 'new@test.com',
      isEmailVerified: false,
      profile: { displayName: 'New User' },
    });

    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue(createdUser);
    sendMailMock.mockResolvedValue(undefined);

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@test.com',
        password: 'ValidPass1!',
        displayName: ' New User ',
      }),
    });

    const body = await readJsonSafe(response);

    expect(response.status).toBe(201);
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@test.com',
        profile: { displayName: 'New User' },
      })
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Please check your email'),
        user: expect.objectContaining({ email: 'new@test.com' }),
      })
    );
  });

  it('logs in through the real route and sets a refresh-token cookie', async () => {
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    const userDoc = createUserDoc({ passwordHash });

    userModel.findOne.mockResolvedValue(userDoc);

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'Passw0rd!',
      }),
    });

    const body = await readJsonSafe(response);
    const setCookies = response.headers.getSetCookie();

    expect(response.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Login successful',
        accessToken: expect.any(String),
        user: expect.objectContaining({ email: 'user@test.com' }),
      })
    );
    expect(setCookies.some((cookie) => cookie.startsWith('refreshToken='))).toBe(true);
    expect(userDoc.refreshTokenHash).toEqual(expect.any(String));
    expect(userDoc.save).toHaveBeenCalled();
  });

  it('refreshes an access token using the cookie issued by the login route', async () => {
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    const userDoc = createUserDoc({ passwordHash });

    userModel.findOne.mockResolvedValue(userDoc);
    userModel.findById.mockImplementation(() => createAwaitableFindByIdResult(userDoc));

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'Passw0rd!',
      }),
    });

    const refreshCookie = loginResponse.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith('refreshToken='))
      ?.split(';')[0];

    expect(refreshCookie).toBeDefined();

    const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: refreshCookie ?? '',
      },
    });

    const body = await readJsonSafe(refreshResponse);

    expect(refreshResponse.status).toBe(200);
    expect(body).toEqual({ accessToken: expect.any(String) });
  });

  it('protects /me and returns the authenticated user for a valid bearer token', async () => {
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    const userDoc = createUserDoc({ passwordHash });

    userModel.findOne.mockResolvedValue(userDoc);
    userModel.findById.mockImplementation(() => createAwaitableFindByIdResult(userDoc));

    const unauthorizedResponse = await fetch(`${baseUrl}/api/auth/me`);
    const unauthorizedBody = await readJsonSafe(unauthorizedResponse);

    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedBody).toEqual({ message: 'Not authorized, no token' });

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'Passw0rd!',
      }),
    });

    const loginBody = await readJsonSafe(loginResponse);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    const meBody = await readJsonSafe(meResponse);

    expect(meResponse.status).toBe(200);
    expect(meBody).toEqual({
      user: {
        id: 'user-1',
        email: 'user@test.com',
        profile: {
          displayName: 'Integration User',
          profilePictureUrl: '',
        },
      },
    });
  });
});