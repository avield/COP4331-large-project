import type { AuthenticatedRequest, AuthenticatedUser } from './express.js';

export function requireUser(
  req: AuthenticatedRequest
): asserts req is AuthenticatedRequest & { user: AuthenticatedUser } {
  if (!req.user) {
    throw new Error('Authenticated user missing on request.');
  }
}

