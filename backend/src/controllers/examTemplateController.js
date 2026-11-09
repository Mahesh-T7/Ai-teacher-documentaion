import { ExamTemplate } from '../models/ExamTemplate.js';
import { validateTemplateConfiguration, calculateStudentMarksResult } from '../utils/marksCalculationEngine.js';

// @desc    Get all exam templates (teacher's own + system presets)
// @route   GET /api/exams/templates
// @access  Private (Teacher)
export const getTemplates = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { className, subject } = req.query;

    const templates = await ExamTemplate.findForTeacher(teacherId, { className, subject });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam template by ID
// @route   GET /api/exams/templates/:id
// @access  Private (Teacher)
export const getTemplateById = async (req, res, next) => {
  try {
    const template = await ExamTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Examination template not found.' });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new examination template
// @route   POST /api/exams/templates
// @access  Private (Teacher / Admin)
export const createTemplate = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      templateName,
      academicYear = '2026-2027',
      className = 'Class 10',
      subject = 'General',
      totalFinalMarks = 100,
      description = '',
      components = [],
      gradingRules = {},
    } = req.body;

    if (!templateName || !templateName.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a template name.' });
    }

    if (!components || components.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one assessment component.' });
    }

    // Validate formulas, component codes, and cycle detection
    const validation = validateTemplateConfiguration(components);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Template configuration errors found.',
        errors: validation.errors,
      });
    }

    const created = await ExamTemplate.create({
      teacherId,
      templateName: templateName.trim(),
      academicYear,
      className,
      subject,
      totalFinalMarks: Number(totalFinalMarks) || 100,
      description,
      components,
      gradingRules: {
        minPassPercentage: gradingRules.minPassPercentage || 35,
        distinctionPercentage: gradingRules.distinctionPercentage || 75,
        roundingRule: gradingRules.roundingRule || 'decimal_1',
        gradeBoundaries: gradingRules.gradeBoundaries || [
          { grade: 'A+', minPercentage: 90 },
          { grade: 'A', minPercentage: 80 },
          { grade: 'B+', minPercentage: 70 },
          { grade: 'B', minPercentage: 60 },
          { grade: 'C', minPercentage: 50 },
          { grade: 'D', minPercentage: 35 },
          { grade: 'F', minPercentage: 0 },
        ],
      },
      isPreset: false,
    });

    res.status(201).json({
      success: true,
      message: 'Examination template created successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing examination template (increments version)
// @route   PUT /api/exams/templates/:id
// @access  Private (Teacher)
export const updateTemplate = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const existing = await ExamTemplate.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    if (existing.isPreset) {
      return res.status(403).json({
        success: false,
        message: 'Built-in curriculum presets cannot be directly modified. Duplicate this template to customize it.',
      });
    }

    if (req.body.components) {
      const validation = validateTemplateConfiguration(req.body.components);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Template configuration errors found.',
          errors: validation.errors,
        });
      }
    }

    const updated = await ExamTemplate.updateById(id, teacherId, req.body);

    res.status(200).json({
      success: true,
      message: 'Template updated successfully. New version indexed.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate an existing template
// @route   POST /api/exams/templates/:id/duplicate
// @access  Private (Teacher)
export const duplicateTemplate = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;
    const { newName } = req.body;

    const duplicated = await ExamTemplate.duplicate(id, teacherId, newName);

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully.',
      data: duplicated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete template
// @route   DELETE /api/exams/templates/:id
// @access  Private (Teacher)
export const deleteTemplate = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const deleted = await ExamTemplate.deleteById(id, teacherId);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete built-in presets or template not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Examination template deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Live calculation preview using sample marks
// @route   POST /api/exams/templates/preview-calculation
// @access  Private (Teacher)
export const previewCalculation = async (req, res) => {
  try {
    const { components = [], gradingRules = {}, totalFinalMarks = 100, sampleRawMarks = {} } = req.body;

    const validation = validateTemplateConfiguration(components);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template configuration.',
        errors: validation.errors,
      });
    }

    const mockStudent = {
      studentName: 'Sample Student (Simulation)',
      rollNumber: 1,
      componentMarks: sampleRawMarks,
    };

    const mockTemplate = {
      totalFinalMarks: Number(totalFinalMarks) || 100,
      components,
      gradingRules,
    };

    const computed = calculateStudentMarksResult(mockStudent, mockTemplate);

    res.status(200).json({
      success: true,
      message: 'Calculation simulation executed successfully.',
      data: computed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
