const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true },
    subjectType: { type: String, enum: ['Pure', 'Applied'], default: 'Pure' },
    alYear: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    maxMarks: { type: Number, default: 100 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
