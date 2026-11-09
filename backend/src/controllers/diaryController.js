import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { LessonPlan } from '../models/LessonPlan.js';

// Helper to determine weekday from date in Asia/Kolkata
const getKolkataWeekday = (dateInput) => {
  const d = new Date(dateInput);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(d);
};

// @desc    Create a new Daily Teaching Diary entry
// @route   POST /api/diary
// @access  Private (Teacher)
export const createDiaryEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      date,
      dayOfWeek,
      className,
      section,
      classHandled,
      subject,
      period,
      startTime,
      endTime,
      timeSlot,
      timetableEntryId,
      lessonPlanId,
      unit,
      chapter,
      topic,
      subtopic,
      learningObjectives,
      previousKnowledge,
      introduction,
      teachingMethodology,
      teachingAids,
      detailedContent,
      activitiesConducted,
      studentParticipation,
      groupDiscussions,
      practicalDemonstrations,
      teachingMaterialsUsed,
      learningOutcomes,
      skillsDeveloped,
      learningDifficultiesObserved,
      studentsRequiringSupport,
      homeworkAssigned,
      teacherRemarks,
      nextClassPlan,
      status,
      teacherConfirmed,
      academicYear,
      assessment,
      classroomActivities,
      homework,
    } = req.body;

    if (!date || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the teaching date, class, and subject.',
      });
    }

    const effectiveTopic = (topic || req.body.topicCovered || 'Daily Classroom Instruction').trim();
    const effectiveDayOfWeek = dayOfWeek || getKolkataWeekday(date);
    const parsedPeriod = (period !== undefined && period !== null && period !== '') ? Number(period) : 1;

    // Rule: Approved lesson plans do NOT auto-complete diary records.
    // Diary completion requires explicit teacher confirmation.
    let effectiveStatus = status || 'Draft';
    if (effectiveStatus === 'Completed' && !teacherConfirmed) {
      effectiveStatus = 'Draft';
    }

    // Check duplicate warning: does an entry already exist on the same date and period?
    const duplicateCheck = await DailyTeachingEntry.checkDuplicatePeriod(
      teacherId,
      date,
      parsedPeriod
    );

    let warning = null;
    if (duplicateCheck.exists) {
      warning = `Note: Another diary entry already exists for Period ${parsedPeriod} on this date. Entry saved as requested.`;
    }

    // If lessonPlanId is provided, verify it belongs to this teacher
    let verifiedLessonPlanId = null;
    if (lessonPlanId) {
      const plan = await LessonPlan.findById(lessonPlanId);
      if (plan && String(plan.teacherId) === String(teacherId)) {
        verifiedLessonPlanId = plan._id || plan.id;
      }
    }

    const newEntry = await DailyTeachingEntry.create({
      teacherId,
      teacherName: req.user.fullName || '',
      schoolName: req.user.schoolName || '',
      academicYear: academicYear || '2026-2027',
      date: new Date(date),
      dayOfWeek: effectiveDayOfWeek,
      className: className.trim(),
      section: (section || 'A').trim(),
      classHandled: classHandled || (section ? `${className}-${section}` : className),
      subject: subject.trim(),
      period: parsedPeriod,
      startTime: startTime || '',
      endTime: endTime || '',
      timeSlot: timeSlot || (startTime && endTime ? `${startTime} - ${endTime}` : ''),
      timetableEntryId: timetableEntryId || null,
      lessonPlanId: verifiedLessonPlanId,
      unit: unit || '',
      chapter: chapter || '',
      topic: effectiveTopic,
      subtopic: subtopic || '',
      learningObjectives: learningObjectives || '',
      previousKnowledge: previousKnowledge || '',
      introduction: introduction || '',
      teachingMethodology: teachingMethodology || '',
      teachingAids: teachingAids || '',
      detailedContent: detailedContent || '',
      activitiesConducted: activitiesConducted || classroomActivities || '',
      classroomActivities: classroomActivities || activitiesConducted || '',
      studentParticipation: studentParticipation || '',
      groupDiscussions: groupDiscussions || '',
      practicalDemonstrations: practicalDemonstrations || '',
      teachingMaterialsUsed: teachingMaterialsUsed || '',
      learningOutcomes: learningOutcomes || '',
      skillsDeveloped: skillsDeveloped || '',
      learningDifficultiesObserved: learningDifficultiesObserved || '',
      studentsRequiringSupport: studentsRequiringSupport || '',
      assessment: assessment || '',
      homeworkAssigned: homeworkAssigned || homework || '',
      teacherRemarks: teacherRemarks || '',
      nextClassPlan: nextClassPlan || '',
      status: effectiveStatus,
      teacherConfirmed: !!teacherConfirmed,
      completedAt: effectiveStatus === 'Completed' ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      message: 'Teaching diary record saved successfully.',
      warning,
      data: newEntry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all diary entries for logged-in teacher with filters
// @route   GET /api/diary
// @access  Private (Teacher)
export const getDiaryEntries = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      date,
      startDate,
      endDate,
      className,
      classHandled,
      subject,
      unit,
      topic,
      status,
      search,
    } = req.query;

    const filters = {};
    if (date) filters.date = date;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (className) filters.className = className;
    if (classHandled) filters.classHandled = classHandled;
    if (subject) filters.subject = subject;
    if (unit) filters.unit = unit;
    if (topic) filters.topic = topic;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const entries = await DailyTeachingEntry.findForTeacher(teacherId, filters);

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single diary entry by ID
// @route   GET /api/diary/:id
// @access  Private (Teacher)
export const getDiaryEntryById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const entry = await DailyTeachingEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Teaching diary record not found.',
      });
    }

    if (String(entry.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this diary record.',
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

// @desc    Update a diary entry
// @route   PUT /api/diary/:id
// @access  Private (Teacher)
export const updateDiaryEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await DailyTeachingEntry.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found to update.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own teaching diary records.',
      });
    }

    const updatePayload = { ...req.body };
    delete updatePayload._id;
    delete updatePayload.teacherId;

    if (updatePayload.date) {
      updatePayload.date = new Date(updatePayload.date);
      if (!updatePayload.dayOfWeek) {
        updatePayload.dayOfWeek = getKolkataWeekday(updatePayload.date);
      }
    }

    // If setting to Completed, require confirmation
    if (updatePayload.status === 'Completed') {
      if (!updatePayload.teacherConfirmed && !existing.teacherConfirmed) {
        return res.status(400).json({
          success: false,
          message: 'Teacher confirmation is required to mark this diary record as Completed.',
        });
      }
      updatePayload.completedAt = new Date();
      updatePayload.teacherConfirmed = true;
    }

    const updated = await DailyTeachingEntry.updateById(id, teacherId, updatePayload);

    res.status(200).json({
      success: true,
      message: 'Teaching diary entry updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a diary entry
// @route   DELETE /api/diary/:id
// @access  Private (Teacher)
export const deleteDiaryEntry = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await DailyTeachingEntry.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own diary records.',
      });
    }

    await DailyTeachingEntry.deleteById(id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Teaching diary entry removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Patch diary status (Draft / Partially Completed / Completed)
// @route   PATCH /api/diary/:id/status
// @access  Private (Teacher)
export const updateDiaryStatus = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;
    const { status, teacherConfirmed } = req.body;

    if (!status || !['Draft', 'Partially Completed', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required: Draft, Partially Completed, or Completed.',
      });
    }

    const existing = await DailyTeachingEntry.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Diary record not found.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (status === 'Completed' && !teacherConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm that you have conducted this teaching session to mark it Completed.',
      });
    }

    const patchData = {
      status,
      teacherConfirmed: status === 'Completed' ? true : !!teacherConfirmed,
      completedAt: status === 'Completed' ? new Date() : null,
    };

    const updated = await DailyTeachingEntry.updateById(id, teacherId, patchData);

    res.status(200).json({
      success: true,
      message: `Diary entry marked as ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
