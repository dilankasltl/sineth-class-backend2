const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    idNumber: { type: String, required: true }, // NIC / National ID
    school: { type: String, default: 'N/A' }, // Student School Name
    alYear: { type: Number }, // e.g., 2028
    studentId: { type: String, unique: true, sparse: true }, // e.g. "20280001"
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student'], default: 'student' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
