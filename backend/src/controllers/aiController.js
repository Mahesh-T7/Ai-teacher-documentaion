import fs from 'fs';
import path from 'path';
import { AIDraft } from '../models/AIDraft.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { ExtractedDocumentContent } from '../models/ExtractedDocumentContent.js';
import { DocumentExtractionService } from '../services/documentExtractionService.js';
import {
  generatePedagogicalContent,
  generateStructuredDailyDocumentation,
  CBSE_CLASS_9_AI_UNITS,
} from '../services/aiService.js';

// @desc    Generate pedagogical content using AI Assistant
// @route   POST /api/ai/generate
// @access  Private (Teacher)
export const generateContent = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { toolType, topic, className, subject } = req.body;

    if (!toolType || !topic || !className || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Please provide tool type, topic name, class, and subject.',
      });
    }

    const generated = await generatePedagogicalContent(toolType, req.body, teacherId);

    const contentStr =
      typeof generated === 'string'
        ? generated
        : generated.contentHtml ||
          generated.detailedExplanation ||
          (generated.title ? `<h3>${generated.title}</h3><p>${generated.learningObjectives || ''}</p>` : '') ||
          JSON.stringify(generated, null, 2);

    // Persist as a draft for the teacher
    const draft = await AIDraft.create({
      teacherId,
      toolType,
      inputs: req.body,
      generatedContent: generated,
      content: contentStr,
      language: req.body.language || 'English',
      status: 'Draft',
    });

    res.status(200).json({
      success: true,
      message: 'Pedagogical content generated successfully.',
      draft,
      data: draft,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all saved AI drafts for the logged-in teacher
// @route   GET /api/ai/drafts
// @access  Private (Teacher)
export const getAIDrafts = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { toolType } = req.query;
    const drafts = await AIDraft.findForTeacher(teacherId, toolType ? { toolType } : {});

    res.status(200).json({
      success: true,
      count: drafts.length,
      drafts,
      data: drafts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single AI draft by ID
// @route   GET /api/ai/drafts/:id
// @access  Private (Teacher)
export const getAIDraftById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const draft = await AIDraft.findById(req.params.id);

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    if (String(draft.teacherId) !== String(teacherId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({ success: true, draft, data: draft });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI draft content
// @route   PUT /api/ai/drafts/:id
// @access  Private (Teacher)
export const updateAIDraft = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;
    const { generatedContent, content, status } = req.body;

    const existing = await AIDraft.findById(id);
    if (!existing || String(existing.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Draft not found or unauthorized.' });
    }

    const updateData = {};
    if (generatedContent !== undefined) updateData.generatedContent = generatedContent;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;

    const updated = await AIDraft.updateById(id, teacherId, updateData);

    res.status(200).json({
      success: true,
      message: 'Draft updated successfully.',
      draft: updated,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve an AI draft and optionally associate/convert to LessonPlan
// @route   POST /api/ai/drafts/:id/approve
// @access  Private (Teacher)
export const approveAIDraft = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const draft = await AIDraft.findById(id);
    if (!draft || String(draft.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    let createdPlanId = null;
    let createdPlan = null;

    // If it's a lesson plan draft, create a formal LessonPlan model entry
    if (draft.toolType === 'lesson_plan' && typeof draft.generatedContent === 'object') {
      const g = draft.generatedContent;
      const inp = draft.inputs || {};

      createdPlan = await LessonPlan.create({
        teacherId,
        title: g.title || inp.topic || 'AI Generated Lesson Plan',
        className: inp.className || 'Class 10',
        section: inp.section || 'A',
        classHandled: inp.className ? `${inp.className}-${inp.section || 'A'}` : 'Class 10-A',
        subject: inp.subject || 'General Science',
        unit: inp.unit || '',
        chapter: inp.chapter || '',
        topic: inp.topic || '',
        durationMinutes: Number(inp.duration) || 45,
        learningObjectives: g.learningObjectives || '',
        previousKnowledge: g.previousKnowledge || '',
        introduction: g.introduction || '',
        detailedExplanation: g.detailedExplanation || '',
        definitions: g.definitions || '',
        teachingMethodology: g.teachingMethodology || '5E Inquiry Model',
        teachingAids: g.teachingAids || '',
        classroomActivities: g.classroomActivities || '',
        assessmentQuestions: g.assessmentQuestions || '',
        expectedLearningOutcomes: g.expectedLearningOutcomes || '',
        homework: g.homework || '',
        status: 'Draft', // AI plans stay draft until teacher conducts / submits
        teacherRemarks: 'Generated via AI Assistant and reviewed by teacher.',
      });
      createdPlanId = createdPlan._id || createdPlan.id;
    }

    const updatedDraft = await AIDraft.updateById(id, teacherId, {
      status: 'Approved',
      approvedLessonPlanId: createdPlanId,
    });

    res.status(200).json({
      success: true,
      message: 'AI content approved by teacher. Converted to curriculum plan where applicable.',
      draft: updatedDraft,
      data: updatedDraft,
      lessonPlanId: createdPlanId,
      lessonPlan: createdPlan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete AI draft
// @route   DELETE /api/ai/drafts/:id
// @access  Private (Teacher)
export const deleteAIDraft = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { id } = req.params;

    const draft = await AIDraft.findById(id);
    if (!draft || String(draft.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    await AIDraft.deleteById(id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Draft deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pre-configured curriculum units (CBSE Class 9 AI, etc.)
// @route   GET /api/ai/syllabus
// @access  Private (Teacher)
export const getSyllabusUnits = async (req, res) => {
  res.status(200).json({
    success: true,
    units: CBSE_CLASS_9_AI_UNITS,
    data: {
      cbseClass9AI: CBSE_CLASS_9_AI_UNITS,
    },
  });
};

// @desc    Generate standardized 9-field documentation for daily teaching record workflow
// @route   POST /api/ai/generate-documentation
// @access  Private (Teacher)
export const generateDailyRecordDocumentation = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      manualDescription = '',
      additionalNotes = '',
      className = 'Class 10',
      subject = 'General Science',
      period = 1,
      date = new Date().toISOString().split('T')[0],
      documentIds = [],
    } = req.body;

    const documentTexts = [];

    if (Array.isArray(documentIds) && documentIds.length > 0) {
      for (const docId of documentIds) {
        try {
          let ext = await ExtractedDocumentContent.findByDocumentId(docId, teacherId);
          if (!ext) {
            const doc = await UploadedDocument.findById(docId);
            if (doc && doc.storageKey) {
              const filePath = path.resolve(process.cwd(), 'uploads', doc.storageKey);
              if (fs.existsSync(filePath)) {
                const buffer = await fs.promises.readFile(filePath);
                const extractedData = await DocumentExtractionService.extractDocumentContent({
                  buffer,
                  filename: doc.originalName,
                  extension: doc.extension,
                  fileId: doc._id,
                  mimeType: doc.mimeType,
                });
                ext = await ExtractedDocumentContent.create({
                  teacherId,
                  documentId: doc._id,
                  fileType: extractedData.fileType,
                  totalItems: extractedData.totalItems,
                  rawText: extractedData.rawText,
                  sections: extractedData.sections,
                });
              }
            }
          }
          if (ext && ext.rawText) {
            documentTexts.push(ext.rawText);
          }
        } catch (extractErr) {
          console.warn(`[AI Daily Doc] Failed extracting doc ${docId}:`, extractErr.message);
        }
      }
    }

    if (!manualDescription.trim() && documentTexts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide what you taught today or upload teaching materials to generate documentation.',
      });
    }

    const generated = await generateStructuredDailyDocumentation({
      manualDescription,
      additionalNotes,
      className,
      subject,
      period,
      date,
      documentTexts,
      teacherId,
    });

    res.status(200).json({
      success: true,
      message: 'Documentation successfully generated with AI.',
      data: generated,
    });
  } catch (error) {
    next(error);
  }
};
