import express from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import projectMemberRoutes from './routes/projectMemberRoutes.js';
import profileRoute from './routes/profileRoutes.js';
import searchRoute from './routes/searchRoute.js';
import rateLimit from 'express-rate-limit';
import { styleText } from "node:util";
import { exit } from 'node:process';
import path from 'path'; // for dealing with profile images
import { fileURLToPath } from 'url'; // for dealing with profile images

// using absolute paths for dealing with bugs due to ES modules when running server from different directory
// This was added for dealing with profile image files (next two lines)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = dotenv.config({ path: ["./.env", "../.env"] });

if (result.error) {
  console.error(styleText('red', `Error loading .env file: ${result.error.message}`));
  exit(1)
} else {
  console.log(styleText('green', ".env file loaded successfully!"));
}

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
// Checking that requests come from front end or a tool we use
const allowedOrigins: string[] = [process.env.FRONTEND_URL].filter(
  (origin): origin is string => Boolean(origin));

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow tools like Postman or curl with no origin
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhost =
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:');

    if (allowedOrigins.includes(origin) || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

//Middleware
app.use(cors(corsOptions));
app.use(express.json()); // this middleware will parse JSON bodies: req.body
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use('/api/project-members', projectMemberRoutes);
app.use('/api/users', profileRoute);
app.use("/api/search", searchRoute);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // for dealing with profile images NOT AN ENDPOINT

const PORT: number = Number(process.env.PORT) || 5000;

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