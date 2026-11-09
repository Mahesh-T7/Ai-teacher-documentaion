import { Student } from '../models/Student.js';
import { Attendance } from '../models/Attendance.js';

// ==========================================
// STUDENT ROSTER CONTROLLERS
// ==========================================

/**
 * @desc Add a student to a class roster
 * @route POST /api/attendance/students
 * @access Private
 */
export const addStudent = async (req, res) => {
  try {
    const { studentName, admissionNumber, className, section = 'A', rollNumber, contactNumber = '', parentName = '' } = req.body;

    if (!studentName || !admissionNumber || !className || rollNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Student name, admission number, class name, and roll number are required.',
      });
    }

    // Check for duplicate roll number in the same class and section
    const existingStudents = await Student.findForClass(req.user._id, className, section);
    const dupRoll = existingStudents.find((s) => Number(s.rollNumber) === Number(rollNumber));
    if (dupRoll) {
      return res.status(400).json({
        success: false,
        message: `Roll number ${rollNumber} already exists in Class ${className} Section ${section}.`,
      });
    }

    const student = await Student.create({
      teacherId: req.user._id,
      schoolId: req.user.schoolName || '',
      studentName,
      admissionNumber,
      className,
      section,
      rollNumber: Number(rollNumber),
      contactNumber,
      parentName,
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully to roster.',
      student,
    });
  } catch (error) {
    console.error('[Add Student Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add student.' });
  }
};

/**
 * @desc Get students for a specific class/section or all teacher's students
 * @route GET /api/attendance/students
 * @access Private
 */
export const getStudents = async (req, res) => {
  try {
    const { className, section, classHandled } = req.query;
    const students = await Student.findForTeacher(req.user._id, { className, section, classHandled });

    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error('[Get Students Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch students.' });
  }
};

/**
 * @desc Update a student's information
 * @route PUT /api/attendance/students/:id
 * @access Private
 */
export const updateStudent = async (req, res) => {
  try {
    const existing = await Student.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Student not found or unauthorized.' });
    }

    const { studentName, admissionNumber, className, section, rollNumber, contactNumber, parentName } = req.body;
    const updateData = {};
    if (studentName !== undefined) updateData.studentName = studentName;
    if (admissionNumber !== undefined) updateData.admissionNumber = admissionNumber;
    if (className !== undefined) updateData.className = className;
    if (section !== undefined) updateData.section = section;
    if (rollNumber !== undefined) updateData.rollNumber = Number(rollNumber);
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (parentName !== undefined) updateData.parentName = parentName;

    const updated = await Student.updateById(req.params.id, req.user._id, updateData);

    res.status(200).json({
      success: true,
      message: 'Student information updated successfully.',
      student: updated,
    });
  } catch (error) {
    console.error('[Update Student Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update student.' });
  }
};

/**
 * @desc Delete student from roster
 * @route DELETE /api/attendance/students/:id
 * @access Private
 */
export const deleteStudent = async (req, res) => {
  try {
    const existing = await Student.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Student not found or unauthorized.' });
    }

    await Student.deleteById(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Student removed from roster successfully.',
    });
  } catch (error) {
    console.error('[Delete Student Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete student.' });
  }
};

/**
 * @desc Bulk import students from JSON array or parsed CSV text
 * @route POST /api/attendance/students/import
 * @access Private
 */
export const importStudents = async (req, res) => {
  try {
    const { className, section = 'A', students } = req.body;

    if (!className || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide target class, section, and a non-empty array of students.',
      });
    }

    const existingClassStudents = await Student.findForClass(req.user._id, className, section);
    const existingRollMap = new Set(existingClassStudents.map((s) => Number(s.rollNumber)));

    const createdList = [];
    const skippedList = [];

    for (let i = 0; i < students.length; i++) {
      const item = students[i];
      const roll = Number(item.rollNumber || i + 1);

      if (existingRollMap.has(roll)) {
        skippedList.push({
          studentName: item.studentName || item.name,
          rollNumber: roll,
          reason: `Roll ${roll} already exists.`,
        });
        continue;
      }

      existingRollMap.add(roll);

      const created = await Student.create({
        teacherId: req.user._id,
        schoolId: req.user.schoolName || '',
        studentName: item.studentName || item.name || `Student ${roll}`,
        admissionNumber: item.admissionNumber || `ADM-${className}${section}-${roll}`,
        className,
        section,
        rollNumber: roll,
        contactNumber: item.contactNumber || item.phone || '',
        parentName: item.parentName || item.parent || '',
      });

      createdList.push(created);
    }

    res.status(201).json({
      success: true,
      message: `Import completed. ${createdList.length} students added, ${skippedList.length} skipped.`,
      addedCount: createdList.length,
      skippedCount: skippedList.length,
      students: createdList,
      skipped: skippedList,
    });
  } catch (error) {
    console.error('[Import Students Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to import students.' });
  }
};

// ==========================================
// ATTENDANCE ROLL-CALL CONTROLLERS
// ==========================================

/**
 * @desc Record or submit daily attendance
 * @route POST /api/attendance
 * @access Private
 */
export const recordAttendance = async (req, res) => {
  try {
    const { date, className, section = 'A', records, updateIfExisting = true } = req.body;

    if (!date || !className || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Date, class name, and student attendance records are required.',
      });
    }

    // Check for existing attendance record on the same date for this class
    const existing = await Attendance.findByDateAndClass(req.user._id, date, className, section);

    if (existing) {
      if (updateIfExisting) {
        // Update existing with audit history
        const updated = await Attendance.updateById(
          existing._id || existing.id,
          req.user._id,
          { records },
          `Attendance updated on ${new Date().toLocaleDateString('en-GB')}`
        );
        return res.status(200).json({
          success: true,
          message: 'Attendance record updated successfully.',
          attendance: updated,
          wasUpdated: true,
        });
      } else {
        return res.status(409).json({
          success: false,
          message: `Attendance for Class ${className}-${section} on this date has already been recorded.`,
        });
      }
    }

    const newAttendance = await Attendance.create({
      teacherId: req.user._id,
      date: new Date(date),
      className,
      section,
      records,
      auditHistory: [
        {
          editedAt: new Date(),
          editedBy: req.user.fullName || 'Teacher',
          changeSummary: 'Initial attendance recorded',
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      attendance: newAttendance,
      wasUpdated: false,
    });
  } catch (error) {
    console.error('[Record Attendance Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record attendance.' });
  }
};

/**
 * @desc Get attendance record for a specific date and class
 * @route GET /api/attendance/by-date
 * @access Private
 */
export const getAttendanceByDateAndClass = async (req, res) => {
  try {
    const { date, className, section = 'A' } = req.query;

    if (!date || !className) {
      return res.status(400).json({
        success: false,
        message: 'Date and class name are required query parameters.',
      });
    }

    const attendance = await Attendance.findByDateAndClass(req.user._id, date, className, section);

    res.status(200).json({
      success: true,
      attendance: attendance || null,
      found: !!attendance,
    });
  } catch (error) {
    console.error('[Get Attendance By Date Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch attendance.' });
  }
};

/**
 * @desc Get attendance records with filters (history)
 * @route GET /api/attendance
 * @access Private
 */
export const getAttendanceHistory = async (req, res) => {
  try {
    const { className, section, classHandled, date, startDate, endDate } = req.query;

    const list = await Attendance.findForTeacher(req.user._id, {
      className,
      section,
      classHandled,
      date,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      count: list.length,
      attendanceRecords: list,
    });
  } catch (error) {
    console.error('[Get Attendance History Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch attendance history.' });
  }
};

/**
 * @desc Update attendance record by ID
 * @route PUT /api/attendance/:id
 * @access Private
 */
export const updateAttendanceById = async (req, res) => {
  try {
    const { records, auditSummary } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Records array is required.' });
    }

    const updated = await Attendance.updateById(
      req.params.id,
      req.user._id,
      { records },
      auditSummary || `Modified by ${req.user.fullName || 'Teacher'}`
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Attendance record not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully.',
      attendance: updated,
    });
  } catch (error) {
    console.error('[Update Attendance By ID Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update attendance.' });
  }
};

/**
 * @desc Get monthly attendance summary analytics
 * @route GET /api/attendance/summary/monthly
 * @access Private
 */
export const getMonthlyAttendanceSummary = async (req, res) => {
  try {
    const { className, section = 'A', month, year } = req.query;

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const targetMonth = month !== undefined ? parseInt(month, 10) : new Date().getMonth() + 1; // 1-12

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const records = await Attendance.findForTeacher(req.user._id, {
      className,
      section,
      startDate,
      endDate,
    });

    const totalDaysRecorded = records.length;
    let totalPossibleAttendances = 0;
    let totalPresents = 0;
    let totalAbsents = 0;
    let totalLeaves = 0;

    // Student-level aggregation map: studentId -> { name, roll, present, absent, leave, total, percentage }
    const studentStats = {};

    records.forEach((att) => {
      (att.records || []).forEach((r) => {
        const key = String(r.studentId || r.rollNumber);
        if (!studentStats[key]) {
          studentStats[key] = {
            studentId: r.studentId,
            studentName: r.studentName,
            rollNumber: r.rollNumber,
            present: 0,
            absent: 0,
            leave: 0,
            totalDays: 0,
            percentage: 0,
          };
        }

        studentStats[key].totalDays += 1;
        totalPossibleAttendances += 1;

        if (r.status === 'Present') {
          studentStats[key].present += 1;
          totalPresents += 1;
        } else if (r.status === 'Absent') {
          studentStats[key].absent += 1;
          totalAbsents += 1;
        } else if (r.status === 'Leave') {
          studentStats[key].leave += 1;
          totalLeaves += 1;
        }
      });
    });

    // Calculate percentages
    const studentSummaries = Object.values(studentStats).map((s) => ({
      ...s,
      percentage: s.totalDays > 0 ? Math.round((s.present / s.totalDays) * 100) : 0,
    }));

    studentSummaries.sort((a, b) => a.rollNumber - b.rollNumber);

    const overallPercentage =
      totalPossibleAttendances > 0 ? Math.round((totalPresents / totalPossibleAttendances) * 100) : 0;

    res.status(200).json({
      success: true,
      month: targetMonth,
      year: targetYear,
      className: className || 'All',
      section: section || 'All',
      totalDaysRecorded,
      overallPercentage,
      totalPossibleAttendances,
      totalPresents,
      totalAbsents,
      totalLeaves,
      studentSummaries,
    });
  } catch (error) {
    console.error('[Get Monthly Summary Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to compute monthly summary.' });
  }
};
