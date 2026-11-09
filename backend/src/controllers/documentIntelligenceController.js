import fs from 'fs';
import path from 'path';
import { storage } from '../config/storage.js';
import { UploadedDocument } from '../models/UploadedDocument.js';
import { DocumentProcessingJob } from '../models/DocumentProcessingJob.js';
import { ExtractedDocumentContent } from '../models/ExtractedDocumentContent.js';
import { DocumentSourceReference } from '../models/DocumentSourceReference.js';
import { AIGeneratedTeachingMaterial } from '../models/AIGeneratedTeachingMaterial.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { DocumentExtractionService } from '../services/documentExtractionService.js';
import { DocumentIntelligenceService } from '../services/documentIntelligenceService.js';
import { DocumentExportService } from '../services/documentExportService.js';
import { validateUploadedDocument, computeFileHash } from '../utils/documentSecurity.js';

// @desc    Upload educational documents with validation & metadata
// @route   POST /api/document-intelligence/upload
// @access  Private (Teacher)
export const uploadDocuments = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided for upload.',
      });
    }

    const {
      academicYear = '2026-2027',
      className = 'General',
      subject = 'General',
      unit = '',
      chapter = '',
      topic = '',
      date = new Date().toISOString(),
    } = req.body;

    const savedDocuments = [];
    const validationErrors = [];

    for (const file of files) {
      // 1. Rigorous security & content validation
      const validation = validateUploadedDocument(file);
      if (!validation.isValid) {
        validationErrors.push({ file: file.originalname, error: validation.error });
        continue;
      }

      // 2. Compute SHA-256 content hash for deduplication
      const fileHash = computeFileHash(file.buffer);

      // Check if teacher already has this exact active file
      const existingDoc = await UploadedDocument.findByHash(teacherId, fileHash);
      if (existingDoc) {
        savedDocuments.push({
          ...existingDoc,
          isDuplicate: true,
          duplicateNotice: 'Identical file content already uploaded and indexed.',
        });
        continue;
      }

      // 3. Store file securely
      const uploadResult = await storage.uploadFile({
        buffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
        folder: 'teaching_docs',
      });

      // 4. Save metadata in database
      const newDoc = await UploadedDocument.create({
        teacherId,
        originalName: file.originalname,
        fileName: path.basename(uploadResult.storageKey),
        storagePath: uploadResult.fileUrl,
        storageKey: uploadResult.storageKey,
        fileSize: file.buffer.length,
        mimeType: file.mimetype || 'application/octet-stream',
        extension: validation.extension,
        fileHash,
        academicYear: academicYear.trim(),
        className: className.trim(),
        subject: subject.trim(),
        unit: unit.trim(),
        chapter: chapter.trim(),
        topic: topic.trim(),
        date: new Date(date),
        status: 'Uploaded',
      });

      savedDocuments.push(newDoc);
    }

    if (savedDocuments.length === 0 && validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All uploaded files failed validation.',
        errors: validationErrors,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${savedDocuments.length} document(s).`,
      data: savedDocuments,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List uploaded documents with search & filter
// @route   GET /api/document-intelligence/documents
// @access  Private (Teacher)
export const getDocuments = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { className, subject, academicYear, status, topic, search } = req.query;

    const documents = await UploadedDocument.findForTeacher(teacherId, {
      className,
      subject,
      academicYear,
      status,
      topic,
      search,
    });

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single document details with extraction & job info
// @route   GET /api/document-intelligence/documents/:id
// @access  Private (Teacher)
export const getDocumentById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const document = await UploadedDocument.findById(req.params.id);

    if (!document || String(document.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied.',
      });
    }

    const extracted = await ExtractedDocumentContent.findByDocumentId(document._id, teacherId);
    let job = null;
    if (document.processingJobId) {
      job = await DocumentProcessingJob.findById(document.processingJobId);
    }

    return res.status(200).json({
      success: true,
      data: {
        document,
        extractedContent: extracted,
        processingJob: job,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Secure preview / download of uploaded document file
// @route   GET /api/document-intelligence/documents/:id/preview
// @access  Private (Teacher)
export const previewDocument = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const document = await UploadedDocument.findById(req.params.id);

    if (!document || String(document.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied.',
      });
    }

    const filePath = path.resolve(process.cwd(), 'uploads', document.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Underlying file is no longer available in storage.',
      });
    }

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

// @desc    Update document categorization (Class, Subject, Unit, Chapter, Topic)
// @route   PUT /api/document-intelligence/documents/:id
// @access  Private (Teacher)
export const updateDocument = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { academicYear, className, subject, unit, chapter, topic } = req.body;

    const updated = await UploadedDocument.updateById(req.params.id, teacherId, {
      ...(academicYear && { academicYear: academicYear.trim() }),
      ...(className && { className: className.trim() }),
      ...(subject && { subject: subject.trim() }),
      ...(unit !== undefined && { unit: unit.trim() }),
      ...(chapter !== undefined && { chapter: chapter.trim() }),
      ...(topic !== undefined && { topic: topic.trim() }),
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Document categorisation updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Replace an existing document with a new uploaded file
// @route   POST /api/document-intelligence/documents/:id/replace
// @access  Private (Teacher)
export const replaceDocument = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const oldDoc = await UploadedDocument.findById(req.params.id);

    if (!oldDoc || String(oldDoc.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied.',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Replacement file is required.',
      });
    }

    const validation = validateUploadedDocument(file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const fileHash = computeFileHash(file.buffer);
    const uploadResult = await storage.uploadFile({
      buffer: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype,
      folder: 'teaching_docs',
    });

    const newDoc = await UploadedDocument.create({
      teacherId,
      originalName: file.originalname,
      fileName: path.basename(uploadResult.storageKey),
      storagePath: uploadResult.fileUrl,
      storageKey: uploadResult.storageKey,
      fileSize: file.buffer.length,
      mimeType: file.mimetype || 'application/octet-stream',
      extension: validation.extension,
      fileHash,
      academicYear: oldDoc.academicYear,
      className: oldDoc.className,
      subject: oldDoc.subject,
      unit: oldDoc.unit,
      chapter: oldDoc.chapter,
      topic: oldDoc.topic,
      date: new Date(),
      status: 'Uploaded',
    });

    // Mark old document as replaced
    await UploadedDocument.updateById(oldDoc._id, teacherId, {
      isReplaced: true,
      replacedBy: newDoc._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Document replaced successfully.',
      data: newDoc,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete document and clean up storage
// @route   DELETE /api/document-intelligence/documents/:id
// @access  Private (Teacher)
export const deleteDocument = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const document = await UploadedDocument.findById(req.params.id);

    if (!document || String(document.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied.',
      });
    }

    // Delete storage file
    if (document.storageKey) {
      await storage.deleteFile(document.storageKey);
    }

    await UploadedDocument.deleteById(document._id, teacherId);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start extraction & AI analysis job (Single file or Multi-document combination)
// @route   POST /api/document-intelligence/jobs/process
// @access  Private (Teacher)
export const processDocumentJob = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { documentIds, language = 'English', userMetadata = {} } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one valid documentId to process.',
      });
    }

    // Verify all documents exist and belong to teacher
    const documents = [];
    for (const id of documentIds) {
      const doc = await UploadedDocument.findById(id);
      if (!doc || String(doc.teacherId) !== String(teacherId)) {
        return res.status(404).json({
          success: false,
          message: `Document ${id} not found or access denied.`,
        });
      }
      documents.push(doc);
    }

    const jobType = documents.length > 1 ? 'multi_document_combination' : 'single_file';

    // Create job record
    const job = await DocumentProcessingJob.create({
      teacherId,
      documentIds,
      jobType,
      status: 'Processing',
      progress: 10,
      currentStage: 'Validating documents and loading file buffers',
    });

    // Mark documents as processing
    for (const doc of documents) {
      await UploadedDocument.updateById(doc._id, teacherId, {
        status: 'Processing',
        processingJobId: job._id,
      });
    }

    // Process extraction for all documents
    const extractedContents = [];
    let progressStep = 10;
    const stepIncrement = Math.floor(50 / documents.length);

    for (const doc of documents) {
      const filePath = path.resolve(process.cwd(), 'uploads', doc.storageKey);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File ${doc.originalName} not found on disk.`);
      }

      const buffer = await fs.promises.readFile(filePath);

      await DocumentProcessingJob.updateById(job._id, teacherId, {
        progress: progressStep + 5,
        currentStage: `Extracting content and structure from ${doc.originalName}`,
      });

      // Extract content
      const extractedData = await DocumentExtractionService.extractDocumentContent({
        buffer,
        filename: doc.originalName,
        extension: doc.extension,
        fileId: doc._id,
        mimeType: doc.mimeType,
      });

      // Save ExtractedDocumentContent
      const savedExtracted = await ExtractedDocumentContent.create({
        teacherId,
        documentId: doc._id,
        documentIds,
        fileType: extractedData.fileType,
        totalItems: extractedData.totalItems,
        rawText: extractedData.rawText,
        sections: extractedData.sections,
        sheets: extractedData.sheets,
        metadataSummary: extractedData.metadataSummary,
      });

      extractedContents.push(savedExtracted);

      // Save DocumentSourceReferences
      const sourceRefs = extractedData.sections.map((s) => ({
        teacherId,
        documentId: doc._id,
        fileName: doc.originalName,
        fileType: extractedData.fileType,
        itemType: s.itemType,
        itemNumber: s.itemNumber,
        locationLabel: s.sourceReference ? s.sourceReference.label : `${s.itemType} ${s.itemNumber}`,
        snippet: (s.text || '').slice(0, 150),
        targetField: s.title || '',
      }));

      if (sourceRefs.length > 0) {
        await DocumentSourceReference.insertMany(sourceRefs);
      }

      await UploadedDocument.updateById(doc._id, teacherId, {
        status: 'Extracted',
        extractedContentId: savedExtracted._id,
      });

      progressStep += stepIncrement;
    }

    // Run AI Document Analysis
    await DocumentProcessingJob.updateById(job._id, teacherId, {
      progress: 75,
      currentStage: 'Running AI pedagogical concept analysis & conflict detection',
    });

    const analysisResults = await DocumentIntelligenceService.analyzeDocumentContent({
      extractedContents,
      userMetadata: {
        academicYear: userMetadata.academicYear || documents[0].academicYear,
        className: userMetadata.className || documents[0].className,
        subject: userMetadata.subject || documents[0].subject,
        unit: userMetadata.unit || documents[0].unit,
        chapter: userMetadata.chapter || documents[0].chapter,
        topic: userMetadata.topic || documents[0].topic,
      },
      language,
      teacherId,
    });

    // Mark documents as Analysed
    for (const doc of documents) {
      await UploadedDocument.updateById(doc._id, teacherId, {
        status: 'Analysed',
        unit: analysisResults.detectedMetadata.unit || doc.unit,
        chapter: analysisResults.detectedMetadata.chapter || doc.chapter,
        topic: analysisResults.detectedMetadata.topic || doc.topic,
      });
    }

    // Complete Job
    const completedJob = await DocumentProcessingJob.updateById(job._id, teacherId, {
      status: 'Analysed',
      progress: 100,
      currentStage: 'Analysis complete. Ready for teaching documentation generation.',
      completedAt: new Date(),
      resultData: analysisResults,
    });

    return res.status(200).json({
      success: true,
      message: 'Document extraction and AI analysis completed successfully.',
      data: {
        job: completedJob,
        extractedContents,
        analysis: analysisResults,
      },
    });
  } catch (err) {
    console.error('[Document Job Error]:', err);
    if (req.body.jobId) {
      await DocumentProcessingJob.updateById(req.body.jobId, req.user._id, {
        status: 'Failed',
        progress: 0,
        currentStage: 'Failed',
        errorDetails: {
          message: err.message,
          stack: err.stack,
          timestamp: new Date(),
        },
      });
    }
    return res.status(500).json({
      success: false,
      message: `Document processing failed: ${err.message}`,
      error: err.message,
    });
  }
};

// @desc    Poll job status and progress
// @route   GET /api/document-intelligence/jobs/:id/status
// @access  Private (Teacher)
export const getJobStatus = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const job = await DocumentProcessingJob.findById(req.params.id);

    if (!job || String(job.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Retry a failed processing job
// @route   POST /api/document-intelligence/jobs/:id/retry
// @access  Private (Teacher)
export const retryJob = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const job = await DocumentProcessingJob.findById(req.params.id);

    if (!job || String(job.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or access denied.',
      });
    }

    await DocumentProcessingJob.updateById(job._id, teacherId, {
      status: 'Processing',
      progress: 5,
      currentStage: 'Retrying document extraction and analysis',
      retryCount: (job.retryCount || 0) + 1,
      errorDetails: { message: '', stack: '', timestamp: null },
    });

    // Re-dispatch processDocumentJob
    req.body.documentIds = job.documentIds;
    return processDocumentJob(req, res, next);
  } catch (err) {
    next(err);
  }
};

// @desc    Generate comprehensive automatic teaching documentation
// @route   POST /api/document-intelligence/generate
// @access  Private (Teacher)
export const generateDocumentation = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      documentIds,
      detectedMetadata = {},
      teacherCorrections = {},
      language = 'English',
      jobId = null,
    } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one valid documentId.',
      });
    }

    // Load extracted contents for all documents
    const extractedContents = [];
    for (const id of documentIds) {
      const ext = await ExtractedDocumentContent.findByDocumentId(id, teacherId);
      if (ext) extractedContents.push(ext);
    }

    if (extractedContents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Documents must be extracted before generating teaching documentation.',
      });
    }

    // Generate all 5 artifacts + slide explanations
    const generated = await DocumentIntelligenceService.generateTeachingDocumentation({
      extractedContents,
      detectedMetadata,
      teacherCorrections,
      language,
      teacherId,
    });

    // Save into AIGeneratedTeachingMaterial
    const savedMaterial = await AIGeneratedTeachingMaterial.create({
      teacherId,
      documentIds,
      jobId,
      language,
      detectedMetadata: generated.detectedMetadata,
      teacherCorrections,
      conflictDetections: detectedMetadata.conflictDetections || [],
      slideExplanations: generated.slideExplanations,
      lessonPlan: generated.lessonPlan,
      classroomTeachingNotes: generated.classroomTeachingNotes,
      questionBank: generated.questionBank,
      classroomActivityPlan: generated.classroomActivityPlan,
      dailyTeachingDiaryDraft: generated.dailyTeachingDiaryDraft,
      status: 'Draft',
    });

    // Mark documents as Generated
    for (const docId of documentIds) {
      await UploadedDocument.updateById(docId, teacherId, { status: 'Generated' });
    }

    return res.status(201).json({
      success: true,
      message: 'Automatic teaching documentation generated successfully.',
      data: savedMaterial,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get generated teaching material dossier by ID
// @route   GET /api/document-intelligence/materials/:id
// @access  Private (Teacher)
export const getMaterialById = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Teaching material not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      data: material,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update / Edit sections in the Teacher Review Workspace
// @route   PUT /api/document-intelligence/materials/:id
// @access  Private (Teacher)
export const updateMaterial = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      lessonPlan,
      classroomTeachingNotes,
      questionBank,
      classroomActivityPlan,
      dailyTeachingDiaryDraft,
      slideExplanations,
      teacherCorrections,
    } = req.body;

    const updated = await AIGeneratedTeachingMaterial.updateById(req.params.id, teacherId, {
      ...(lessonPlan && { lessonPlan }),
      ...(classroomTeachingNotes && { classroomTeachingNotes }),
      ...(questionBank && { questionBank }),
      ...(classroomActivityPlan && { classroomActivityPlan }),
      ...(dailyTeachingDiaryDraft && { dailyTeachingDiaryDraft }),
      ...(slideExplanations && { slideExplanations }),
      ...(teacherCorrections && { teacherCorrections }),
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Teaching material not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Teaching material updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Regenerate individual section in Teacher Review Workspace
// @route   POST /api/document-intelligence/materials/:id/regenerate-section
// @access  Private (Teacher)
export const regenerateSection = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { sectionName } = req.body; // e.g. 'questionBank', 'lessonPlan', 'classroomActivities'
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    // Load extracted contents
    const extractedContents = [];
    for (const docId of material.documentIds) {
      const ext = await ExtractedDocumentContent.findByDocumentId(docId, teacherId);
      if (ext) extractedContents.push(ext);
    }

    const regenerated = await DocumentIntelligenceService.generateTeachingDocumentation({
      extractedContents,
      detectedMetadata: material.detectedMetadata,
      teacherCorrections: material.teacherCorrections,
      language: material.language,
      teacherId,
    });

    const updates = {};
    if (sectionName === 'lessonPlan') updates.lessonPlan = regenerated.lessonPlan;
    if (sectionName === 'classroomTeachingNotes') updates.classroomTeachingNotes = regenerated.classroomTeachingNotes;
    if (sectionName === 'questionBank') updates.questionBank = regenerated.questionBank;
    if (sectionName === 'classroomActivityPlan') updates.classroomActivityPlan = regenerated.classroomActivityPlan;
    if (sectionName === 'dailyTeachingDiaryDraft') updates.dailyTeachingDiaryDraft = regenerated.dailyTeachingDiaryDraft;
    if (sectionName === 'slideExplanations') updates.slideExplanations = regenerated.slideExplanations;

    const updated = await AIGeneratedTeachingMaterial.updateById(material._id, teacherId, updates);

    return res.status(200).json({
      success: true,
      message: `Section "${sectionName}" regenerated successfully.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve generated teaching material
// @route   POST /api/document-intelligence/materials/:id/approve
// @access  Private (Teacher)
export const approveMaterial = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const updated = await AIGeneratedTeachingMaterial.updateById(req.params.id, teacherId, {
      status: 'Approved',
      approvedAt: new Date(),
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Teaching material approved successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Convert approved material into a formal Lesson Plan record
// @route   POST /api/document-intelligence/materials/:id/convert-to-lesson-plan
// @access  Private (Teacher)
export const convertToLessonPlan = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    const meta = material.detectedMetadata || {};
    const plan = material.lessonPlan || {};

    const newLessonPlan = await LessonPlan.create({
      teacherId,
      academicYear: meta.academicYear || '2026-2027',
      title: plan.title || `Lesson Plan: ${meta.topic || 'Curriculum'}`,
      className: meta.className || 'Class 9',
      section: 'A',
      subject: meta.subject || 'General',
      unit: meta.unit || '',
      chapter: meta.chapter || '',
      topic: meta.topic || '',
      durationMinutes: 45,
      learningObjectives: plan.learningObjectives || '',
      previousKnowledge: plan.previousKnowledge || '',
      introduction: plan.introduction || '',
      detailedExplanation: plan.topicExplanation || '',
      definitions: plan.definitions || '',
      teachingMethodology: plan.teachingMethodology || '5E Model',
      teachingAids: plan.teachingAids || '',
      classroomActivities: plan.classroomActivities || '',
      realLifeExamples: plan.realLifeExamples || '',
      assessmentQuestions: plan.assessment || '',
      expectedLearningOutcomes: plan.learningOutcomes || '',
      homework: plan.homework || '',
      status: 'Draft',
    });

    await AIGeneratedTeachingMaterial.updateById(material._id, teacherId, {
      convertedLessonPlanId: newLessonPlan._id,
      status: 'Approved',
    });

    return res.status(201).json({
      success: true,
      message: 'Successfully converted approved material into formal Lesson Plan.',
      data: newLessonPlan,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Convert generated diary draft into formal Daily Teaching Diary (Draft status)
// @route   POST /api/document-intelligence/materials/:id/create-diary-draft
// @access  Private (Teacher)
export const createDiaryDraft = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { confirmedTaught = false, teacherRemarks = '', date } = req.body;
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    const meta = material.detectedMetadata || {};
    const draft = material.dailyTeachingDiaryDraft || {};

    // Do not mark completed automatically! Must be confirmed by teacher
    const status = confirmedTaught ? 'Completed' : 'Draft';

    const newDiaryEntry = await DailyTeachingEntry.create({
      teacherId,
      date: date ? new Date(date) : new Date(draft.date || Date.now()),
      periodNumber: 1,
      classHandled: meta.className || 'Class 9-A',
      subject: meta.subject || 'General',
      unitOrChapter: meta.unit || meta.chapter || 'Unit 1',
      topicTaught: meta.topic || 'Classroom Instruction',
      detailedTeachingExplanation: draft.detailedTeachingExplanation || '',
      classroomActivities: draft.activities || '',
      teachingAidsUsed: draft.teachingAids || '',
      learningOutcomesAchieved: draft.expectedLearningOutcomes || '',
      homeworkAssigned: draft.homework || '',
      teacherRemarks: teacherRemarks || draft.teacherRemarks || '',
      verificationStatus: status,
      isSignedByTeacher: confirmedTaught,
    });

    await AIGeneratedTeachingMaterial.updateById(material._id, teacherId, {
      createdDiaryEntryId: newDiaryEntry._id,
    });

    return res.status(201).json({
      success: true,
      message: confirmedTaught
        ? 'Daily teaching diary entry marked Completed and verified by teacher.'
        : 'Daily teaching diary draft created successfully (Draft status pending teacher completion confirmation).',
      data: newDiaryEntry,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export material to styled Microsoft Word (.docx)
// @route   GET /api/document-intelligence/materials/:id/export/word
// @access  Private (Teacher)
export const exportMaterialWord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    const docxBuffer = await DocumentExportService.exportToWord(material);
    const fileName = `Teaching_Dossier_${(material.detectedMetadata?.topic || 'Lesson').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (err) {
    next(err);
  }
};

// @desc    Export material to styled PDF (.pdf)
// @route   GET /api/document-intelligence/materials/:id/export/pdf
// @access  Private (Teacher)
export const exportMaterialPdf = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const material = await AIGeneratedTeachingMaterial.findById(req.params.id);

    if (!material || String(material.teacherId) !== String(teacherId)) {
      return res.status(404).json({
        success: false,
        message: 'Material not found or access denied.',
      });
    }

    const pdfBuffer = await DocumentExportService.exportToPDF(material);
    const fileName = `Teaching_Dossier_${(material.detectedMetadata?.topic || 'Lesson').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
