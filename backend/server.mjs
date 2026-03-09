import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running perfectly! 🚀' });
});

app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080');
});