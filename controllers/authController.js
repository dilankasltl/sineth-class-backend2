const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'tuition_secret_key_2026_super_secure', {
    expiresIn: '30d'
  });
};

// @desc    Register Student & Auto-generate Student ID
// @route   POST /api/auth/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { firstName, lastName, idNumber, school, alYear, customPassword } = req.body;

    if (!firstName || !lastName || !idNumber || !alYear) {
      return res.status(400).json({ message: 'All required fields (First Name, Last Name, ID Number, A/L Year) must be filled' });
    }

    const yearNum = parseInt(alYear);

    // Check if ID Number already registered
    const existingId = await User.findOne({ idNumber: idNumber.trim() });
    if (existingId) {
      return res.status(400).json({ message: 'A student with this ID Number / NIC is already registered' });
    }

    // Calculate next sequence number for this batch A/L year
    const countInYear = await User.countDocuments({ role: 'student', alYear: yearNum });
    const sequenceNum = String(countInYear + 1).padStart(4, '0');
    const autoStudentId = `${yearNum}${sequenceNum}`;

    // Password defaults to ID Number if customPassword not provided
    const rawPassword = customPassword && customPassword.trim() ? customPassword.trim() : idNumber.trim();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const newStudent = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      idNumber: idNumber.trim(),
      school: school && school.trim() ? school.trim() : 'N/A',
      alYear: yearNum,
      studentId: autoStudentId,
      password: hashedPassword,
      role: 'student'
    });

    const token = generateToken(newStudent._id, newStudent.role);

    return res.status(201).json({
      message: 'Student registered successfully',
      student: {
        id: newStudent._id,
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        studentId: newStudent.studentId,
        idNumber: newStudent.idNumber,
        school: newStudent.school,
        alYear: newStudent.alYear,
        role: newStudent.role
      },
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: error.message || 'Server registration error' });
  }
};

// @desc    Login User (Student or Admin)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Please provide Student ID / Username and Password' });
    }

    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    let user = await User.findOne({
      $or: [
        { studentId: cleanId },
        { idNumber: cleanId },
        { role: 'admin', firstName: cleanId }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid Student ID / Username or Password' });
    }

    const isMatch = await bcrypt.compare(cleanPass, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Student ID / Username or Password' });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        studentId: user.studentId,
        idNumber: user.idNumber,
        school: user.school || 'N/A',
        alYear: user.alYear,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server login error' });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    return res.json(req.user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerStudent,
  loginUser,
  getMe
};
