import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.mjs';
import authRoutes from "./routes/authRoutes.mjs";
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
//Checking that requests come from front end or a tool we use
const allowedOrigins = [
  process.env.FRONTEND_URL,
  `http://localhost:8080`
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    //allow tools like Postman or curl with no origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error ('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running perfectly! 🚀' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
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