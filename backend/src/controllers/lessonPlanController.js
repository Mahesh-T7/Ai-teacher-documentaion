import { LessonPlan } from '../models/LessonPlan.js';
import { generateLessonPlanPdf } from '../services/lessonPlanPdfService.js';

// @desc    Create a new lesson plan
// @route   POST /api/lesson-plans
// @access  Private (Teacher)
export const createLessonPlan = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      title,
      academicYear,
      className,
      section,
      classHandled,
      subject,
      unit,
      chapter,
      unitOrChapter,
      topic,
      durationMinutes,
      learningObjectives,
      previousKnowledge,
      introduction,
      detailedExplanation,
      definitions,
      teachingMethodology,
      teachingAids,
      classroomActivities,
      realLifeExamples,
      assessmentQuestions,
      expectedLearningOutcomes,
      homework,
      teacherRemarks,
      photos,
      classroomPhotographs,
      status,
    } = req.body;

    if (!title || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide lesson title, class name, and subject.',
      });
    }

    const newPlan = await LessonPlan.create({
      teacherId,
      academicYear: academicYear || '2026-2027',
      title: title.trim(),
      className: className.trim(),
      section: (section || 'A').trim(),
      classHandled: classHandled || (section ? `${className}-${section}` : className),
      subject: subject.trim(),
      unit: unit || '',
      chapter: chapter || '',
      unitOrChapter: unitOrChapter || unit || chapter || '',
      topic: topic || '',
      durationMinutes: durationMinutes ? Number(durationMinutes) : 45,
      learningObjectives: learningObjectives || '',
      previousKnowledge: previousKnowledge || '',
      introduction: introduction || '',
      detailedExplanation: detailedExplanation || '',
      definitions: definitions || '',
      teachingMethodology: teachingMethodology || 'Inquiry-based Learning',
      teachingAids: teachingAids || '',
      classroomActivities: classroomActivities || '',
      realLifeExamples: realLifeExamples || '',
      assessmentQuestions: assessmentQuestions || '',
      expectedLearningOutcomes: expectedLearningOutcomes || '',
      homework: homework || '',
      teacherRemarks: teacherRemarks || '',
      photos: Array.isArray(photos) ? photos : [],
      classroomPhotographs: Array.isArray(classroomPhotographs)
        ? classroomPhotographs
        : Array.isArray(photos)
        ? photos.map((p) => p.url || `/uploads/${p.storageKey}`).filter(Boolean)
        : [],
      status: status || 'Draft',
      submittedAt: status === 'Submitted' ? new Date() : null,
      approvedAt: status === 'Approved' ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      message: 'Lesson plan created successfully.',
      data: newPlan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all lesson plans for the logged-in teacher
// @route   GET /api/lesson-plans
// @access  Private (Teacher)
export const getLessonPlans = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { status, subject, className, classHandled, unit, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (subject) filters.subject = subject;
    if (className) filters.className = className;
    if (classHandled) filters.classHandled = classHandled;
    if (unit) filters.unit = unit;
    if (search) filters.search = search;

    const plans = await LessonPlan.findForTeacher(teacherId, filters);

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lesson plan by ID
// @route   GET /api/lesson-plans/:id
// @access  Private (Teacher)
export const getLessonPlanById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const plan = await LessonPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found.',
      });
    }

    if (String(plan.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this lesson plan.',
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a lesson plan
// @route   PUT /api/lesson-plans/:id
// @access  Private (Teacher)
export const updateLessonPlan = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await LessonPlan.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found to update.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own lesson plans.',
      });
    }

    const updatePayload = { ...req.body };
    delete updatePayload._id;
    delete updatePayload.teacherId;

    if (updatePayload.durationMinutes) {
      updatePayload.durationMinutes = Number(updatePayload.durationMinutes);
    }

    const updated = await LessonPlan.updateById(id, teacherId, updatePayload);

    res.status(200).json({
      success: true,
      message: 'Lesson plan updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a lesson plan
// @route   DELETE /api/lesson-plans/:id
// @access  Private (Teacher)
export const deleteLessonPlan = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await LessonPlan.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own lesson plans.',
      });
    }

    await LessonPlan.deleteById(id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Lesson plan deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit or approve a lesson plan
// @route   PATCH /api/lesson-plans/:id/approval
// @access  Private (Teacher)
export const updateLessonPlanApproval = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;
    const { status, approverRemarks } = req.body;

    if (!status || !['Draft', 'Submitted', 'Approved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid approval status is required: Draft, Submitted, or Approved.',
      });
    }

    const existing = await LessonPlan.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found.',
      });
    }

    if (String(existing.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    const patchPayload = {
      status,
      approverRemarks: approverRemarks !== undefined ? approverRemarks : existing.approverRemarks,
    };

    if (status === 'Submitted') {
      patchPayload.submittedAt = new Date();
    } else if (status === 'Approved') {
      patchPayload.approvedAt = new Date();
    }

    const updated = await LessonPlan.updateById(id, teacherId, patchPayload);

    res.status(200).json({
      success: true,
      message: `Lesson plan status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate an existing lesson plan
// @route   POST /api/lesson-plans/:id/duplicate
// @access  Private (Teacher)
export const duplicateLessonPlan = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const duplicated = await LessonPlan.duplicate(id, teacherId);
    if (!duplicated) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found to duplicate.',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lesson plan duplicated as a new draft.',
      data: duplicated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Lesson Plan as Official A4 PDF
// @route   GET /api/lesson-plans/:id/pdf
// @access  Private (Teacher)
export const exportLessonPlanPdf = async (req, res, next) => {
  try {
    const plan = await LessonPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Lesson plan not found.',
      });
    }

    const teacherInfo = {
      fullName: req.user.fullName || req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const planObj = plan.toObject ? plan.toObject() : JSON.parse(JSON.stringify(plan));
    const pdfBuffer = await generateLessonPlanPdf({
      ...planObj,
      teacher: teacherInfo,
      teacherName: teacherInfo.fullName,
      teacherDesignation: teacherInfo.designation,
      schoolName: teacherInfo.schoolName,
    });

    const safeClass = (planObj.className || 'Class9').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeSub = (planObj.subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const nowStr = new Date().toISOString().split('T')[0];
    const fileName = `LessonPlan_${safeClass}_${safeSub}_${nowStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate on-the-fly A4 PDF for draft or previewing lesson plan
// @route   POST /api/lesson-plans/preview-pdf
// @access  Private (Teacher)
export const generatePreviewPdf = async (req, res, next) => {
  try {
    const planData = req.body || {};
    const teacherInfo = {
      fullName: req.user.fullName || req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const pdfBuffer = await generateLessonPlanPdf({
      ...planData,
      teacher: teacherInfo,
      teacherName: teacherInfo.fullName,
      teacherDesignation: teacherInfo.designation,
      schoolName: teacherInfo.schoolName,
    });

    const safeClass = (planData.className || 'Class9').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeSub = (planData.subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const nowStr = new Date().toISOString().split('T')[0];
    const fileName = `LessonPlan_${safeClass}_${safeSub}_${nowStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
