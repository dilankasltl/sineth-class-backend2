const Exam = require('../models/Exam');
const Mark = require('../models/Mark');
const User = require('../models/User');

// Helper to calculate Grade from mark percentage
const calculateGrade = (score, maxMarks = 100) => {
  const pct = (score / maxMarks) * 100;
  if (pct >= 75) return 'A';
  if (pct >= 65) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 35) return 'S';
  return 'F';
};

// --- EXAM CONTROLLERS ---

// @desc    Create Exam with Pure / Applied category (Admin)
// @route   POST /api/marks/exams
// @access  Private/Admin
const createExam = async (req, res) => {
  try {
    const { examName, subjectType, alYear, maxMarks, date } = req.body;
    if (!examName || !alYear) {
      return res.status(400).json({ message: 'Exam Name and A/L Year are required' });
    }

    const exam = await Exam.create({
      examName: examName.trim(),
      subjectType: subjectType === 'Applied' ? 'Applied' : 'Pure',
      alYear: parseInt(alYear),
      maxMarks: maxMarks ? parseInt(maxMarks) : 100,
      date: date ? new Date(date) : new Date()
    });

    return res.status(201).json(exam);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating exam' });
  }
};

// @desc    Get Exams (Filtered by Batch A/L Year)
// @route   GET /api/marks/exams
// @access  Private (Admin & Student)
const getExams = async (req, res) => {
  try {
    const { alYear } = req.query;
    let query = {};
    if (alYear && alYear !== 'all') {
      query.alYear = parseInt(alYear);
    }
    const exams = await Exam.find(query).sort({ date: -1 });
    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching exams' });
  }
};

// @desc    Get Deduplicated Grouped Exams list by Exam Name (for Class Exam Results selection)
// @route   GET /api/marks/grouped-exams
// @access  Private
const getGroupedExams = async (req, res) => {
  try {
    const { alYear } = req.query;
    let query = {};
    if (alYear && alYear !== 'all') {
      query.alYear = parseInt(alYear);
    }
    const exams = await Exam.find(query).sort({ date: -1 });

    // Group exams by examName (trimmed)
    const groupedMap = new Map();
    exams.forEach((ex) => {
      const nameKey = ex.examName.trim();
      if (!groupedMap.has(nameKey)) {
        groupedMap.set(nameKey, {
          examName: nameKey,
          alYear: ex.alYear,
          date: ex.date,
          maxMarks: ex.maxMarks
        });
      }
    });

    const groupedExams = Array.from(groupedMap.values());
    return res.json(groupedExams);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching grouped exams' });
  }
};

// @desc    Delete Exam (Admin)
// @route   DELETE /api/marks/exams/:id
// @access  Private/Admin
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await Mark.deleteMany({ examId: exam._id });
    await Exam.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Exam and all associated marks deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting exam' });
  }
};

// --- MARKS ENTRY & VIEW CONTROLLERS ---

// @desc    Get batch students and existing marks for an Exam (Admin Entry View)
// @route   GET /api/marks/exam/:examId/students
// @access  Private/Admin
const getExamMarksEntrySheet = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const students = await User.find({ role: 'student', alYear: exam.alYear })
      .select('firstName lastName studentId idNumber school alYear')
      .sort({ studentId: 1 });

    const existingMarks = await Mark.find({ examId: exam._id });
    const marksMap = {};
    existingMarks.forEach((m) => {
      marksMap[m.studentId] = m;
    });

    const entrySheet = students.map((student) => ({
      studentObjId: student._id,
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      idNumber: student.idNumber,
      school: student.school || 'N/A',
      alYear: student.alYear,
      marks: marksMap[student.studentId] !== undefined && marksMap[student.studentId] !== null ? marksMap[student.studentId].marks : '',
      grade: marksMap[student.studentId] ? marksMap[student.studentId].grade : '-',
      remarks: marksMap[student.studentId] ? marksMap[student.studentId].remarks : ''
    }));

    return res.json({
      exam,
      entrySheet,
      totalStudentsCount: students.length
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching entry sheet' });
  }
};

// @desc    Save/Update Batch Marks (Admin CRUD)
// @route   POST /api/marks/batch
// @access  Private/Admin
const saveBatchMarks = async (req, res) => {
  try {
    const { examId, marksData } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const validData = marksData.filter(
      (item) => item.marks !== '' && item.marks !== null && !isNaN(Number(item.marks))
    );

    const bulkOperations = validData.map((item) => {
      const markVal = Number(item.marks);
      const gradeVal = calculateGrade(markVal, exam.maxMarks);

      return {
        updateOne: {
          filter: { examId: exam._id, studentId: item.studentId },
          update: {
            $set: {
              studentObjId: item.studentObjId,
              alYear: exam.alYear,
              marks: markVal,
              grade: gradeVal,
              remarks: item.remarks || ''
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOperations.length > 0) {
      await Mark.bulkWrite(bulkOperations);
    }

    return res.json({ message: 'Marks updated successfully', count: bulkOperations.length });
  } catch (error) {
    console.error('Save Batch Marks Error:', error);
    return res.status(500).json({ message: 'Error saving batch marks' });
  }
};

// @desc    Delete single student mark (Admin)
// @route   DELETE /api/marks/:id
// @access  Private/Admin
const deleteMark = async (req, res) => {
  try {
    await Mark.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Mark deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting mark' });
  }
};

// @desc    View all marks for a specific exam (Student & Admin read-only view)
// @route   GET /api/marks/exam/:examId/view
// @access  Private
const getExamMarksForView = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const marks = await Mark.find({ examId: exam._id })
      .populate('studentObjId', 'firstName lastName studentId school alYear')
      .sort({ marks: -1 });

    return res.json({ exam, marks });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching exam marks' });
  }
};

// @desc    View combined marks (Pure, Applied, Full Average) for a specific Exam Name
// @route   GET /api/marks/grouped-view
// @access  Private
const getGroupedExamMarksForView = async (req, res) => {
  try {
    const { examName, alYear } = req.query;
    if (!examName) {
      return res.status(400).json({ message: 'Exam name is required' });
    }

    let examQuery = {
      examName: { $regex: new RegExp(`^${examName.trim()}$`, 'i') }
    };
    if (alYear && alYear !== 'all') {
      examQuery.alYear = parseInt(alYear);
    }

    const matchingExams = await Exam.find(examQuery);
    if (matchingExams.length === 0) {
      return res.status(404).json({ message: 'No matching exams found' });
    }

    const examIds = matchingExams.map((e) => e._id);
    const marks = await Mark.find({ examId: { $in: examIds } })
      .populate('studentObjId', 'firstName lastName studentId school alYear')
      .sort({ createdAt: 1 });

    // Group marks by studentId
    const studentMap = {};

    marks.forEach((m) => {
      const sId = m.studentId;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          studentId: sId,
          studentObjId: m.studentObjId,
          pureMark: null,
          appliedMark: null,
          remarks: []
        };
      }

      // Find matching exam subjectType
      const foundExam = matchingExams.find(
        (e) => e._id.toString() === m.examId.toString()
      );
      const subjectType = foundExam ? foundExam.subjectType : 'Pure';

      if (subjectType === 'Applied') {
        studentMap[sId].appliedMark = m.marks;
      } else {
        studentMap[sId].pureMark = m.marks;
      }

      if (m.remarks && m.remarks.trim() !== '') {
        studentMap[sId].remarks.push(`${subjectType}: ${m.remarks}`);
      }
    });

    const results = Object.values(studentMap).map((s) => {
      let averageMark = 0;
      if (s.pureMark !== null && s.appliedMark !== null) {
        averageMark = Math.round((s.pureMark + s.appliedMark) / 2);
      } else if (s.pureMark !== null) {
        averageMark = s.pureMark;
      } else if (s.appliedMark !== null) {
        averageMark = s.appliedMark;
      }

      const grade = calculateGrade(averageMark);

      return {
        studentId: s.studentId,
        studentObjId: s.studentObjId,
        pureMark: s.pureMark !== null ? s.pureMark : '-',
        appliedMark: s.appliedMark !== null ? s.appliedMark : '-',
        averageMark,
        grade,
        remarks: s.remarks.join(' | ') || '-'
      };
    });

    // Sort descending by averageMark
    results.sort((a, b) => b.averageMark - a.averageMark);

    return res.json({
      examName: examName.trim(),
      alYear: matchingExams[0]?.alYear || alYear,
      marks: results
    });
  } catch (error) {
    console.error('Grouped view marks error:', error);
    return res.status(500).json({ message: 'Error fetching grouped exam marks' });
  }
};

// @desc    Get 3-Category Performance (Pure, Applied, Combined Average)
// @route   GET /api/marks/performance/:studentId
// @access  Private (Restricted to logged in student or admin)
const getStudentPerformance = async (req, res) => {
  try {
    const targetStudentId = req.params.studentId;

    if (req.user.role === 'student' && req.user.studentId !== targetStudentId) {
      return res.status(403).json({
        message: 'Access Denied: You are only allowed to view your own performance analytics.'
      });
    }

    const student = await User.findOne({ studentId: targetStudentId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentMarks = await Mark.find({ studentId: targetStudentId }).populate('examId').sort({ createdAt: 1 });
    const validMarks = studentMarks.filter((m) => m.examId !== null && m.examId !== undefined);

    const pureMarks = validMarks.filter((m) => m.examId.subjectType === 'Pure');
    const appliedMarks = validMarks.filter((m) => m.examId.subjectType === 'Applied');

    const buildTimeline = async (marksList) => {
      let total = 0;
      let highest = 0;
      let lowest = 100;

      const timeline = await Promise.all(
        marksList.map(async (m) => {
          total += m.marks;
          if (m.marks > highest) highest = m.marks;
          if (m.marks < lowest) lowest = m.marks;

          const allExamMarks = await Mark.find({ examId: m.examId._id });
          const classAvg =
            allExamMarks.length > 0
              ? Math.round(allExamMarks.reduce((sum, item) => sum + item.marks, 0) / allExamMarks.length)
              : 0;

          return {
            examName: m.examId.examName,
            subjectType: m.examId.subjectType || 'Pure',
            date: new Date(m.examId.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            myScore: m.marks,
            classAverage: classAvg,
            maxMarks: m.examId.maxMarks,
            grade: m.grade
          };
        })
      );

      const count = timeline.length;
      return {
        stats: {
          examsTaken: count,
          overallAverage: count > 0 ? Math.round(total / count) : 0,
          highestMark: count > 0 ? highest : 0,
          lowestMark: count > 0 ? lowest : 0
        },
        graphTimeline: timeline
      };
    };

    const purePerformance = await buildTimeline(pureMarks);
    const appliedPerformance = await buildTimeline(appliedMarks);

    // Calculate Combined Average Performance (Pair matching exam names or all exams)
    const examGroupMap = {};
    validMarks.forEach((m) => {
      const nameKey = m.examId.examName.trim();
      if (!examGroupMap[nameKey]) {
        examGroupMap[nameKey] = { pure: null, applied: null, date: m.examId.date };
      }
      if (m.examId.subjectType === 'Applied') {
        examGroupMap[nameKey].applied = m;
      } else {
        examGroupMap[nameKey].pure = m;
      }
    });

    let combinedTotal = 0;
    let combinedHighest = 0;
    let combinedLowest = 100;
    const combinedTimeline = [];

    Object.keys(examGroupMap).forEach((nameKey) => {
      const group = examGroupMap[nameKey];
      let avgScore = 0;

      if (group.pure && group.applied) {
        avgScore = Math.round((group.pure.marks + group.applied.marks) / 2);
      } else if (group.pure) {
        avgScore = group.pure.marks;
      } else if (group.applied) {
        avgScore = group.applied.marks;
      }

      combinedTotal += avgScore;
      if (avgScore > combinedHighest) combinedHighest = avgScore;
      if (avgScore < combinedLowest) combinedLowest = avgScore;

      combinedTimeline.push({
        examName: nameKey,
        subjectType: 'Combined',
        date: new Date(group.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        myScore: avgScore,
        pureScore: group.pure ? group.pure.marks : null,
        appliedScore: group.applied ? group.applied.marks : null,
        maxMarks: 100
      });
    });

    const combinedCount = combinedTimeline.length;
    const combinedPerformance = {
      stats: {
        examsTaken: combinedCount,
        overallAverage: combinedCount > 0 ? Math.round(combinedTotal / combinedCount) : 0,
        highestMark: combinedCount > 0 ? combinedHighest : 0,
        lowestMark: combinedCount > 0 ? combinedLowest : 0
      },
      graphTimeline: combinedTimeline
    };

    return res.json({
      student: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        school: student.school || 'N/A',
        alYear: student.alYear
      },
      purePerformance,
      appliedPerformance,
      combinedPerformance
    });
  } catch (error) {
    console.error('Performance API error:', error);
    return res.status(500).json({ message: 'Error retrieving performance data' });
  }
};

// @desc    Get Batch Top Performers (Highest Average Score per Batch)
// @route   GET /api/marks/batch-toppers
// @access  Private
const getBatchToppers = async (req, res) => {
  try {
    const { alYear } = req.query;

    let examQuery = {};
    if (alYear && alYear !== 'all') {
      const yearNum = parseInt(alYear);
      examQuery = { $or: [{ alYear: yearNum }, { alYear: String(alYear) }] };
    }

    // 1. Fetch exams for the requested batch (or all exams)
    const matchingExams = await Exam.find(examQuery);
    const examIds = matchingExams.map((e) => e._id);

    // 2. Fetch marks for these exams
    const markQuery = examIds.length > 0 ? { examId: { $in: examIds } } : {};
    const batchMarks = await Mark.find(markQuery)
      .populate('studentObjId', 'firstName lastName studentId school alYear idNumber')
      .populate('examId', 'examName subjectType alYear maxMarks');

    // 3. Map student scores
    const studentMap = {};

    for (const m of batchMarks) {
      const sId = m.studentId;
      let batchYear = m.alYear || (m.examId && m.examId.alYear) || (m.studentObjId && m.studentObjId.alYear);
      if (!batchYear && sId && sId.length >= 4) {
        batchYear = sId.substring(0, 4);
      }
      batchYear = batchYear ? String(batchYear).trim() : 'Other';

      if (!studentMap[sId]) {
        let firstName = 'Student';
        let lastName = '';
        let school = 'N/A';
        if (m.studentObjId) {
          firstName = m.studentObjId.firstName || 'Student';
          lastName = m.studentObjId.lastName || '';
          school = m.studentObjId.school || 'N/A';
        } else {
          const userDoc = await User.findOne({ studentId: sId });
          if (userDoc) {
            firstName = userDoc.firstName;
            lastName = userDoc.lastName;
            school = userDoc.school || 'N/A';
          }
        }

        studentMap[sId] = {
          student: {
            studentId: sId,
            firstName,
            lastName,
            school,
            alYear: batchYear
          },
          totalMarks: 0,
          examsTaken: 0,
          highestMark: 0
        };
      }

      const score = Number(m.marks) || 0;
      studentMap[sId].totalMarks += score;
      studentMap[sId].examsTaken += 1;
      if (score > studentMap[sId].highestMark) {
        studentMap[sId].highestMark = score;
      }
    }

    // 4. Group by batch year and sort descending
    const toppersByBatch = {};

    Object.values(studentMap).forEach((item) => {
      if (item.examsTaken > 0) {
        let year = item.student.alYear ? String(item.student.alYear).trim() : '';
        if (!year && item.student.studentId && item.student.studentId.length >= 4) {
          year = item.student.studentId.substring(0, 4);
        }
        if (!year) year = 'Other';

        if (!toppersByBatch[year]) {
          toppersByBatch[year] = [];
        }

        const overallAverage = Math.round(item.totalMarks / item.examsTaken);
        toppersByBatch[year].push({
          student: { ...item.student, alYear: year },
          examsTaken: item.examsTaken,
          overallAverage,
          highestMark: item.highestMark
        });
      }
    });

    // Sort each batch list by overallAverage descending
    Object.keys(toppersByBatch).forEach((year) => {
      toppersByBatch[year].sort((a, b) => {
        if (b.overallAverage !== a.overallAverage) {
          return b.overallAverage - a.overallAverage;
        }
        return b.highestMark - a.highestMark;
      });
    });

    const targetYearStr = alYear && alYear !== 'all' ? String(alYear).trim() : null;
    const currentToppers = targetYearStr ? (toppersByBatch[targetYearStr] || []) : [];

    return res.json({
      alYear: alYear || 'all',
      totalExamsCount: matchingExams.length,
      toppers: currentToppers,
      toppersByBatch
    });
  } catch (error) {
    console.error('Batch toppers error:', error);
    return res.status(500).json({ message: 'Error calculating batch toppers' });
  }
};

module.exports = {
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
};

