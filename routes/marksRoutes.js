const express = require('express');
const router = express.Router();
const {
  createExam,
  getExams,
  getGroupedExams,
  deleteExam,
  getExamMarksEntrySheet,
  saveBatchMarks,
  deleteMark,
  getExamMarksForView,
  getGroupedExamMarksForView,
  getStudentPerformance,
  getBatchToppers
} = require('../controllers/marksController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Exam routes
router.post('/exams', protect, adminOnly, createExam);
router.get('/exams', protect, getExams);
router.get('/grouped-exams', protect, getGroupedExams);
router.delete('/exams/:id', protect, adminOnly, deleteExam);

// Marks entry & batch routes
router.get('/exam/:examId/students', protect, adminOnly, getExamMarksEntrySheet);
router.post('/batch', protect, adminOnly, saveBatchMarks);
router.delete('/:id', protect, adminOnly, deleteMark);

// Read-only marks view, toppers & student personal analytics graph
router.get('/exam/:examId/view', protect, getExamMarksForView);
router.get('/grouped-view', protect, getGroupedExamMarksForView);
router.get('/performance/:studentId', protect, getStudentPerformance);
router.get('/batch-toppers', protect, getBatchToppers);

module.exports = router;
