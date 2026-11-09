import { User } from '../models/User.js';

// @desc    Update teacher profile
// @route   PUT /api/users/profile
// @access  Private (Protected)
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const {
      fullName,
      phoneNumber,
      schoolName,
      designation,
      subjectsTaught,
      classesHandled,
      preferredLanguage,
      bio,
      experienceYears,
    } = req.body;

    const parsedSubjects = Array.isArray(subjectsTaught)
      ? subjectsTaught
      : typeof subjectsTaught === 'string'
      ? subjectsTaught.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const parsedClasses = Array.isArray(classesHandled)
      ? classesHandled
      : typeof classesHandled === 'string'
      ? classesHandled.split(',').map(c => c.trim()).filter(Boolean)
      : undefined;

    const updatePayload = {};
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (phoneNumber !== undefined) updatePayload.phoneNumber = phoneNumber;
    if (schoolName !== undefined) updatePayload.schoolName = schoolName;
    if (designation !== undefined) updatePayload.designation = designation;
    if (parsedSubjects !== undefined) updatePayload.subjectsTaught = parsedSubjects;
    if (parsedClasses !== undefined) updatePayload.classesHandled = parsedClasses;
    if (preferredLanguage !== undefined) updatePayload.preferredLanguage = preferredLanguage;
    if (bio !== undefined) updatePayload.bio = bio;
    if (experienceYears !== undefined) updatePayload.experienceYears = Number(experienceYears);

    const updatedUser = await User.updateById(userId, updatePayload);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found to update.',
      });
    }

    const safeUser = updatedUser.toSafeObject ? updatedUser.toSafeObject() : updatedUser;

    res.status(200).json({
      success: true,
      message: 'Teacher profile updated successfully!',
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
