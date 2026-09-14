const mongoose = require('mongoose');

const markSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: String, required: true }, // custom student ID e.g., 20280001
    studentObjId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    alYear: { type: Number, required: true },
    marks: { type: Number, required: true },
    grade: { type: String, default: '-' },
    remarks: { type: String, default: '' }
  },
  { timestamps: true }
);

// Compound index so each student has at most 1 mark entry per exam
markSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
