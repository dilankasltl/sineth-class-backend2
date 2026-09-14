const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

// Models
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const marksRoutes = require('./routes/marksRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

// Seed Pre-configured Admin Account
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await User.create({
        firstName: 'admin',
        lastName: 'System',
        idNumber: 'ADMIN001',
        studentId: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('[Admin Account Seeded]: Username: admin | Password: admin123');
    }
  } catch (error) {
    console.error('Notice: Admin seeder pending DB connection...');
  }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`[Server Running]: Port ${PORT}`);
  const isConnected = await connectDB();
  if (isConnected) {
    await seedAdmin();
  }
});
