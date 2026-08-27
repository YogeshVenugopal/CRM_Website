import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import connectDB from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(healthRoutes);

connectDB();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
