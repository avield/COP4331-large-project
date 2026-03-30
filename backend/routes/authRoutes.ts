import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationEmail,
    refreshAccessToken,
    logoutUser,
    forgotPassword,
    resetPassword,
    getCurrentUser
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js'

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {message: 'Too many login attempts. Please try again later.'}
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {message: 'Too many registration attempts. Please try again later.'}
});

const resendVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {message: 'Too many verification email requests. Please try again later.'}
});

const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {message: 'Too many verification attempts. Please try again later.'}
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {message: 'Too many refresh attempts. Please try again later.'}
});

//Login and Register
router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/verify-email/:token', verifyEmailLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerificationEmail);

//Using JWT:
router.post('/refresh', refreshLimiter, refreshAccessToken);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/me', protect, getCurrentUser);

export default router;