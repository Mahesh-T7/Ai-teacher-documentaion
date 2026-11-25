import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Generate JWT token helper
const generateToken = (userId, email, rememberMe = true) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_teacher_portal_key_2026_dev_secure';
  const expiresIn = rememberMe === false ? '1d' : (process.env.JWT_EXPIRES_IN || '30d');
  return jwt.sign({ id: userId, email }, secret, { expiresIn });
};

// @desc    Register a new teacher
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      phoneNumber,
      schoolName,
      designation,
      subjectsTaught,
      classesHandled,
      preferredLanguage,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmailWithPassword(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A teacher account with this email address already exists. Please log in or use a different email.',
      });
    }

    // Parse arrays if sent as comma-separated strings
    const parsedSubjects = Array.isArray(subjectsTaught)
      ? subjectsTaught
      : typeof subjectsTaught === 'string' && subjectsTaught.trim()
      ? subjectsTaught.split(',').map(s => s.trim()).filter(Boolean)
      : ['General Sciences'];

    const parsedClasses = Array.isArray(classesHandled)
      ? classesHandled
      : typeof classesHandled === 'string' && classesHandled.trim()
      ? classesHandled.split(',').map(c => c.trim()).filter(Boolean)
      : ['Class 9', 'Class 10'];

    // Create teacher in database
    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber: phoneNumber || '',
      schoolName: schoolName || 'Government High School',
      designation: designation || 'Senior Teacher',
      subjectsTaught: parsedSubjects,
      classesHandled: parsedClasses,
      preferredLanguage: preferredLanguage || 'English',
    });

    const userId = user._id || user.id;
    const token = generateToken(userId, user.email);

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully! Welcome to your documentation portal.',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate teacher & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = true } = req.body;

    // Find teacher by email
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. No teacher account found with that email address.',
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your password and try again.',
      });
    }

    const safeUser = user.toSafeObject ? user.toSafeObject() : user;
    const userId = safeUser._id || safeUser.id;
    const token = generateToken(userId, safeUser.email, rememberMe);

    res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back.',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in teacher profile
// @route   GET /api/auth/me
// @access  Private (Protected)
export const getMe = async (req, res, next) => {
  try {
    const safeUser = req.user.toSafeObject ? req.user.toSafeObject() : req.user;
    res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
