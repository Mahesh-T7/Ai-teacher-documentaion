import { PracticalActivity } from '../models/PracticalActivity.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';

/**
 * @desc Create new practical activity entry
 * @route POST /api/practicals
 * @access Private
 */
export const createPracticalActivity = async (req, res) => {
  try {
    const {
      date,
      className,
      section = 'A',
      subject,
      unit = '',
      activityTitle,
      activityDescription = '',
      learningObjectives = '',
      toolsAndSoftwareUsed = '',
      practicalSteps = '',
      studentParticipation = '',
      learningOutcomes = '',
      teacherRemarks = '',
      associatedPhotos = [],
      teachingEntryId = null,
      status = 'Completed',
    } = req.body;

    if (!className || !subject || !activityTitle) {
      return res.status(400).json({
        success: false,
        message: 'Class name, subject, and activity title are required fields.',
      });
    }

    const practical = await PracticalActivity.create({
      teacherId: req.user._id,
      date: date ? new Date(date) : new Date(),
      className,
      section,
      classHandled: section ? `${className}-${section}` : className,
      subject,
      unit,
      activityTitle,
      activityDescription,
      learningObjectives,
      toolsAndSoftwareUsed,
      practicalSteps,
      studentParticipation,
      learningOutcomes,
      teacherRemarks,
      associatedPhotos,
      teachingEntryId: teachingEntryId || null,
      status,
    });

    // If linked to teaching entry, record that practical demonstration occurred
    if (teachingEntryId) {
      try {
        const entry = await DailyTeachingEntry.findById(teachingEntryId);
        if (entry && String(entry.teacherId) === String(req.user._id)) {
          const acts = entry.classroomActivities || {};
          acts.practicalDemonstrations = (acts.practicalDemonstrations ? acts.practicalDemonstrations + '\n' : '') + activityTitle;
          await DailyTeachingEntry.updateById(teachingEntryId, req.user._id, { classroomActivities: acts });
        }
      } catch (err) {
        console.warn('[Practical link warning]:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Practical activity recorded successfully.',
      practical,
    });
  } catch (error) {
    console.error('[Create Practical Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create practical activity.' });
  }
};

/**
 * @desc Get all practical activities for teacher with filters and search
 * @route GET /api/practicals
 * @access Private
 */
export const getPracticalActivities = async (req, res) => {
  try {
    const { className, classHandled, subject, unit, date, search } = req.query;

    const practicals = await PracticalActivity.findForTeacher(req.user._id, {
      className,
      classHandled,
      subject,
      unit,
      date,
      search,
    });

    res.status(200).json({
      success: true,
      count: practicals.length,
      practicals,
    });
  } catch (error) {
    console.error('[Get Practicals Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch practical activities.' });
  }
};

/**
 * @desc Get practical activity by ID
 * @route GET /api/practicals/:id
 * @access Private
 */
export const getPracticalById = async (req, res) => {
  try {
    const practical = await PracticalActivity.findById(req.params.id);
    if (!practical || String(practical.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Practical activity not found or unauthorized.' });
    }

    res.status(200).json({ success: true, practical });
  } catch (error) {
    console.error('[Get Practical By ID Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch practical activity.' });
  }
};

/**
 * @desc Update practical activity entry
 * @route PUT /api/practicals/:id
 * @access Private
 */
export const updatePracticalActivity = async (req, res) => {
  try {
    const existing = await PracticalActivity.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Practical activity not found or unauthorized.' });
    }

    const {
      date,
      className,
      section,
      subject,
      unit,
      activityTitle,
      activityDescription,
      learningObjectives,
      toolsAndSoftwareUsed,
      practicalSteps,
      studentParticipation,
      learningOutcomes,
      teacherRemarks,
      associatedPhotos,
      teachingEntryId,
      status,
    } = req.body;

    const updateData = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (className !== undefined) updateData.className = className;
    if (section !== undefined) updateData.section = section;
    if (className && section) updateData.classHandled = `${className}-${section}`;
    if (subject !== undefined) updateData.subject = subject;
    if (unit !== undefined) updateData.unit = unit;
    if (activityTitle !== undefined) updateData.activityTitle = activityTitle;
    if (activityDescription !== undefined) updateData.activityDescription = activityDescription;
    if (learningObjectives !== undefined) updateData.learningObjectives = learningObjectives;
    if (toolsAndSoftwareUsed !== undefined) updateData.toolsAndSoftwareUsed = toolsAndSoftwareUsed;
    if (practicalSteps !== undefined) updateData.practicalSteps = practicalSteps;
    if (studentParticipation !== undefined) updateData.studentParticipation = studentParticipation;
    if (learningOutcomes !== undefined) updateData.learningOutcomes = learningOutcomes;
    if (teacherRemarks !== undefined) updateData.teacherRemarks = teacherRemarks;
    if (associatedPhotos !== undefined) updateData.associatedPhotos = associatedPhotos;
    if (teachingEntryId !== undefined) updateData.teachingEntryId = teachingEntryId;
    if (status !== undefined) updateData.status = status;

    const updated = await PracticalActivity.updateById(req.params.id, req.user._id, updateData);

    res.status(200).json({
      success: true,
      message: 'Practical activity updated successfully.',
      practical: updated,
    });
  } catch (error) {
    console.error('[Update Practical Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update practical activity.' });
  }
};

/**
 * @desc Delete practical activity entry
 * @route DELETE /api/practicals/:id
 * @access Private
 */
export const deletePracticalActivity = async (req, res) => {
  try {
    const existing = await PracticalActivity.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Practical activity not found or unauthorized.' });
    }

    await PracticalActivity.deleteById(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Practical activity deleted successfully.',
    });
  } catch (error) {
    console.error('[Delete Practical Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete practical activity.' });
  }
};
