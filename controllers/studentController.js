const User = require('../models/User');
const Mark = require('../models/Mark');

// @desc    Get all students (Admin)
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const { alYear, search } = req.query;
    let query = { role: 'student' };

    if (alYear && alYear !== 'all') {
      query.alYear = parseInt(alYear);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { studentId: searchRegex },
        { idNumber: searchRegex },
        { school: searchRegex }
      ];
    }

    const students = await User.find(query).select('-password').sort({ alYear: -1, studentId: 1 });
    return res.json(students);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching students' });
  }
};

// @desc    Update student details (Admin)
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const { firstName, lastName, idNumber, school, alYear } = req.body;
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.firstName = firstName || student.firstName;
    student.lastName = lastName || student.lastName;
    student.idNumber = idNumber || student.idNumber;
    student.school = school !== undefined ? school : student.school;

    if (alYear && parseInt(alYear) !== student.alYear) {
      student.alYear = parseInt(alYear);
    }

    const updatedStudent = await student.save();
    return res.json(updatedStudent);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating student' });
  }
};

// @desc    Delete student (Admin)
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Mark.deleteMany({ studentId: student.studentId });
    await User.findByIdAndDelete(req.params.id);

    return res.json({ message: `Student ${student.studentId} deleted successfully` });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting student' });
  }
};

module.exports = {
  getAllStudents,
  updateStudent,
  deleteStudent
};
