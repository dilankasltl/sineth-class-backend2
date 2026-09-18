require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    await connectDB();
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

    if (updateResult.matchedCount === 0) {
      await User.create({
        firstName: 'Eshan',
        lastName: 'System',
        idNumber: 'ADMIN001',
        studentId: 'Eshan',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('[SUCCESS]: Admin created with Username: Eshan | Password: Eshan@9726');
    } else {
      console.log(`[SUCCESS]: ${updateResult.matchedCount} Admin account(s) updated to Username: Eshan | Password: Eshan@9726`);
    }
  } catch (err) {
    console.error('[ERROR]:', err);
  } finally {
    process.exit(0);
  }
})();
