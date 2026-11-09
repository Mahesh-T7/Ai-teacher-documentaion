import { Assessment } from '../models/Assessment.js';

/**
 * @desc Create new assessment and record marks
 * @route POST /api/assessments
 * @access Private
 */
export const createAssessment = async (req, res) => {
  try {
    const {
      assessmentTitle,
      assessmentType,
      date,
      className,
      section = 'A',
      subject,
      maximumMarks = 25,
      studentMarks = [],
      associatedUnit = '',
      learningGapsIdentified = '',
      remedialActionPlan = '',
      teacherRemarks = '',
    } = req.body;

    if (!assessmentTitle || !assessmentType || !className || !subject || !maximumMarks) {
      return res.status(400).json({
        success: false,
        message: 'Assessment title, type, class name, subject, and maximum marks are required.',
      });
    }

    const maxMarksNum = Number(maximumMarks);

    // Compute student percentage if not provided
    const formattedMarks = (studentMarks || []).map((m) => {
      const marks = Number(m.marksObtained || 0);
      const pct = maxMarksNum > 0 ? Math.round((marks / maxMarksNum) * 100) : 0;
      return {
        ...m,
        marksObtained: marks,
        percentage: pct,
      };
    });

    const assessment = await Assessment.create({
      teacherId: req.user._id,
      assessmentTitle,
      assessmentType,
      date: date ? new Date(date) : new Date(),
      className,
      section,
      classHandled: section ? `${className}-${section}` : className,
      subject,
      maximumMarks: maxMarksNum,
      studentMarks: formattedMarks,
      associatedUnit,
      learningGapsIdentified,
      remedialActionPlan,
      teacherRemarks,
    });

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully.',
      assessment,
    });
  } catch (error) {
    console.error('[Create Assessment Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create assessment.' });
  }
};

/**
 * @desc Get all assessments for teacher with filters
 * @route GET /api/assessments
 * @access Private
 */
export const getAssessments = async (req, res) => {
  try {
    const { className, classHandled, subject, assessmentType, date, startDate, endDate } = req.query;

    const assessments = await Assessment.findForTeacher(req.user._id, {
      className,
      classHandled,
      subject,
      assessmentType,
      date,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      count: assessments.length,
      assessments,
    });
  } catch (error) {
    console.error('[Get Assessments Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch assessments.' });
  }
};

/**
 * @desc Get assessment by ID
 * @route GET /api/assessments/:id
 * @access Private
 */
export const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment || String(assessment.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Assessment not found or unauthorized.' });
    }

    res.status(200).json({ success: true, assessment });
  } catch (error) {
    console.error('[Get Assessment By ID Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch assessment.' });
  }
};

/**
 * @desc Update assessment and recalculate metrics
 * @route PUT /api/assessments/:id
 * @access Private
 */
export const updateAssessment = async (req, res) => {
  try {
    const existing = await Assessment.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Assessment not found or unauthorized.' });
    }

    const {
      assessmentTitle,
      assessmentType,
      date,
      className,
      section,
      subject,
      maximumMarks,
      studentMarks,
      associatedUnit,
      learningGapsIdentified,
      remedialActionPlan,
      teacherRemarks,
    } = req.body;

    const updateData = {};
    if (assessmentTitle !== undefined) updateData.assessmentTitle = assessmentTitle;
    if (assessmentType !== undefined) updateData.assessmentType = assessmentType;
    if (date !== undefined) updateData.date = new Date(date);
    if (className !== undefined) updateData.className = className;
    if (section !== undefined) updateData.section = section;
    if (className && section) updateData.classHandled = `${className}-${section}`;
    if (subject !== undefined) updateData.subject = subject;
    if (associatedUnit !== undefined) updateData.associatedUnit = associatedUnit;
    if (learningGapsIdentified !== undefined) updateData.learningGapsIdentified = learningGapsIdentified;
    if (remedialActionPlan !== undefined) updateData.remedialActionPlan = remedialActionPlan;
    if (teacherRemarks !== undefined) updateData.teacherRemarks = teacherRemarks;

    const maxMarks = maximumMarks !== undefined ? Number(maximumMarks) : existing.maximumMarks;
    if (maximumMarks !== undefined) updateData.maximumMarks = maxMarks;

    if (studentMarks !== undefined) {
      updateData.studentMarks = studentMarks.map((m) => {
        const marks = Number(m.marksObtained || 0);
        const pct = maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : 0;
        return {
          ...m,
          marksObtained: marks,
          percentage: pct,
        };
      });
    }

    const updated = await Assessment.updateById(req.params.id, req.user._id, updateData);

    res.status(200).json({
      success: true,
      message: 'Assessment updated successfully.',
      assessment: updated,
    });
  } catch (error) {
    console.error('[Update Assessment Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update assessment.' });
  }
};

/**
 * @desc Delete assessment
 * @route DELETE /api/assessments/:id
 * @access Private
 */
export const deleteAssessment = async (req, res) => {
  try {
    const existing = await Assessment.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Assessment not found or unauthorized.' });
    }

    await Assessment.deleteById(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Assessment deleted successfully.',
    });
  } catch (error) {
    console.error('[Delete Assessment Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete assessment.' });
  }
};

/**
 * @desc Get analytics and learning gaps overview across assessments
 * @route GET /api/assessments/summary/overview
 * @access Private
 */
export const getAssessmentSummary = async (req, res) => {
  try {
    const { className, subject } = req.query;
    const assessments = await Assessment.findForTeacher(req.user._id, { className, subject });

    const totalAssessments = assessments.length;
    let grandTotalPercentage = 0;
    const gapStudentsMap = {};

    assessments.forEach((ass) => {
      grandTotalPercentage += ass.classAverage || 0;
      (ass.studentMarks || []).forEach((m) => {
        if (m.percentage < 40) {
          const key = m.studentName;
          if (!gapStudentsMap[key]) {
            gapStudentsMap[key] = {
              studentName: m.studentName,
              rollNumber: m.rollNumber,
              lowScoresCount: 0,
              tests: [],
            };
          }
          gapStudentsMap[key].lowScoresCount += 1;
          gapStudentsMap[key].tests.push({
            title: ass.assessmentTitle,
            percentage: m.percentage,
          });
        }
      });
    });

    const averagePerformance = totalAssessments > 0 ? Math.round(grandTotalPercentage / totalAssessments) : 0;
    const studentsNeedingSupport = Object.values(gapStudentsMap).sort((a, b) => b.lowScoresCount - a.lowScoresCount);

    res.status(200).json({
      success: true,
      totalAssessments,
      averagePerformance,
      studentsNeedingSupportCount: studentsNeedingSupport.length,
      studentsNeedingSupport,
    });
  } catch (error) {
    console.error('[Get Assessment Summary Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to compute assessment summary.' });
  }
};
