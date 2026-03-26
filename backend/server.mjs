import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.mjs';
import authRoutes from "./routes/authRoutes.mjs";
import projectRoutes from "./routes/projectRoutes.mjs";
import taskRoutes from "./routes/taskRoutes.mjs";
import projectMemberRoutes from './routes/projectMemberRoutes.mjs';
import rateLimit from 'express-rate-limit';
import styleText from "node:util";
import { exit } from 'node:process';

const result = dotenv.config({ path: ["./.env", "../.env"] });

if (result.error) {
  console.error(styleText.styleText('red', `Error loading .env file: ${result.error.message}`));
  exit(1)
} else {
  console.log(styleText.styleText('green', ".env file loaded successfully!"));
}

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// Checking that requests come from front end or a tool we use
const allowedOrigins = [
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    //allow tools like Postman or curl with no origin
    if (!origin) return callback(null, true);

    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

    if (allowedOrigins.includes(origin) || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error ('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json()); // this middleware will parse JSON bodies: req.body
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use('/api/project-members', projectMemberRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many verification email requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});