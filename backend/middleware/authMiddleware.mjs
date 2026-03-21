import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';

/**
 * protect middleware
 *
 * This middleware protects routes that require authentication.
 * It performs the following steps:
 *
 * 1. Checks for a Bearer token in the Authorization header.
 * 2. Verifies the JWT using the server's secret.
 * 3. Fetches the corresponding user from the database.
 * 4. Ensures the user exists and has verified their email.
 * 5. Attaches the user object to req.user for downstream handlers.
 *
 * If any step fails, an appropriate 401 or 403 response is returned.
 */

const protect = async (req, res, next) => {
  // Authorization header should be in the form: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    // Verify token signature and decode payload
    // Throws error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Retrieve the authenticated user from database
    // Exclude password hash from the returned document
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Enforce email verification before allowing access to protected routes
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before accessing this resource.'
      });
    }

    // Attach authenticated user to request object for later middleware/controllers
    req.user = user;

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export default protect;