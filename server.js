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

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

// Seed / Force Update Pre-configured Admin Account
const seedAdmin = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Eshan@9726', salt);

    const updateResult = await User.updateMany(
      { role: 'admin' },
      {
        $set: {
          firstName: 'Eshan',
          studentId: 'Eshan',
          idNumber: 'ADMIN001',
          password: hashedPassword
        }
      }
    );

    if (!updateResult || updateResult.matchedCount === 0) {
      await User.create({
        firstName: 'Eshan',
        lastName: 'System',
        idNumber: 'ADMIN001',
        studentId: 'Eshan',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('[Admin Account Seeded]: Username: Eshan | Password: Eshan@9726');
    } else {
      console.log(`[Admin Account Updated]: Username: Eshan | Password: Eshan@9726 (${updateResult.matchedCount} account updated)`);
    }
  } catch (error) {
    console.error('Notice: Admin seeder error:', error);
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
