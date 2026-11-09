import { Timetable } from '../models/Timetable.js';

// @desc    Create a new timetable entry
// @route   POST /api/timetable
// @access  Private (Teacher)
export const createTimetableEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      dayOfWeek,
      period,
      startTime,
      endTime,
      className,
      section,
      subject,
      room,
      remarks,
      academicYear,
    } = req.body;

    if (!dayOfWeek || !period || !startTime || !endTime || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide weekday, period number, start time, end time, class name, and subject.',
      });
    }

    const currentYear = academicYear || '2026-2027';

    // Check duplicate period on the same weekday
    const isDuplicate = await Timetable.checkDuplicate(
      teacherId,
      dayOfWeek,
      Number(period),
      currentYear
    );

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: `You already have a class scheduled for ${dayOfWeek}, Period ${period}. Duplicate periods are not permitted.`,
      });
    }

    const newEntry = await Timetable.create({
      teacherId,
      schoolId: req.user.schoolName || '',
      academicYear: currentYear,
      dayOfWeek,
      period: Number(period),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      className: className.trim(),
      section: (section || 'A').trim(),
      subject: subject.trim(),
      room: (room || 'Main Classroom').trim(),
      remarks: (remarks || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: `Period ${period} on ${dayOfWeek} successfully added to timetable.`,
      data: newEntry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all timetable entries for the logged-in teacher
// @route   GET /api/timetable
// @access  Private (Teacher)
export const getTimetable = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { dayOfWeek, className, classHandled, subject, academicYear } = req.query;

    const filters = {};
    if (dayOfWeek) filters.dayOfWeek = dayOfWeek;
    if (className) filters.className = className;
    if (classHandled) filters.classHandled = classHandled;
    if (subject) filters.subject = subject;
    if (academicYear) filters.academicYear = academicYear;

    const entries = await Timetable.findForTeacher(teacherId, filters);

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single timetable entry by ID
// @route   GET /api/timetable/:id
// @access  Private (Teacher)
export const getTimetableById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const entry = await Timetable.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found.',
      });
    }

    if (String(entry.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this timetable entry.',
      });
    }

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a timetable entry
// @route   PUT /api/timetable/:id
// @access  Private (Teacher)
export const updateTimetableEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await Timetable.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found to update.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own timetable entries.',
      });
    }

    const {
      dayOfWeek,
      period,
      startTime,
      endTime,
      className,
      section,
      subject,
      room,
      remarks,
      academicYear,
    } = req.body;

    const targetDay = dayOfWeek || existing.dayOfWeek;
    const targetPeriod = period !== undefined ? Number(period) : existing.period;
    const targetYear = academicYear || existing.academicYear || '2026-2027';

    // If changing day or period, ensure no collision with another slot
    if (targetDay !== existing.dayOfWeek || targetPeriod !== existing.period) {
      const isDuplicate = await Timetable.checkDuplicate(
        teacherId,
        targetDay,
        targetPeriod,
        targetYear,
        id
      );

      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message: `Cannot reschedule: You already have a period scheduled for ${targetDay}, Period ${targetPeriod}.`,
        });
      }
    }

    const updated = await Timetable.updateById(id, teacherId, {
      dayOfWeek: targetDay,
      period: targetPeriod,
      startTime: startTime || existing.startTime,
      endTime: endTime || existing.endTime,
      className: className || existing.className,
      section: section !== undefined ? section : existing.section,
      subject: subject || existing.subject,
      room: room !== undefined ? room : existing.room,
      remarks: remarks !== undefined ? remarks : existing.remarks,
      academicYear: targetYear,
    });

    res.status(200).json({
      success: true,
      message: 'Timetable period updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a timetable entry
// @route   DELETE /api/timetable/:id
// @access  Private (Teacher)
export const deleteTimetableEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await Timetable.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Timetable entry not found.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own timetable entries.',
      });
    }

    await Timetable.deleteById(id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Timetable entry deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
