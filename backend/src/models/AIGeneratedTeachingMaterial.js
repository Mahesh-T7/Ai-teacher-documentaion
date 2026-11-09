import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryMaterials = [];

const aiGeneratedTeachingMaterialSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedDocument',
      },
    ],
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentProcessingJob',
      default: null,
    },
    language: {
      type: String,
      enum: ['English', 'Kannada', 'Kannada + English'],
      default: 'English',
    },
    // Identified Concepts & Extracted vs Inferred Metadata
    detectedMetadata: {
      academicYear: { type: String, default: '2026-2027' },
      className: { type: String, default: '' },
      subject: { type: String, default: '' },
      unit: { type: String, default: '' },
      chapter: { type: String, default: '' },
      topic: { type: String, default: '' },
      subtopics: [{ type: String }],
      keyConcepts: [{ type: String }],
      definitions: [
        {
          term: { type: String, default: '' },
          definition: { type: String, default: '' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      examples: [
        {
          example: { type: String, default: '' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      activities: [
        {
          title: { type: String, default: '' },
          description: { type: String, default: '' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      learningObjectives: [
        {
          objective: { type: String, default: '' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      questions: [
        {
          question: { type: String, default: '' },
          type: { type: String, default: 'short' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      importantDiagrams: [
        {
          description: { type: String, default: '' },
          origin: { type: String, enum: ['extracted', 'inferred'], default: 'extracted' },
          sourceRef: { type: String, default: '' },
        },
      ],
      teachingAids: [{ type: String }],
    },
    // Teacher corrections to metadata
    teacherCorrections: {
      className: { type: String, default: '' },
      subject: { type: String, default: '' },
      unit: { type: String, default: '' },
      chapter: { type: String, default: '' },
      topic: { type: String, default: '' },
    },
    // Conflict and duplicate detections across multiple documents
    conflictDetections: [
      {
        field: { type: String, default: '' },
        description: { type: String, default: '' },
        sources: [
          {
            fileName: { type: String, default: '' },
            itemNumber: { type: Number, default: 1 },
            text: { type: String, default: '' },
          },
        ],
        resolutionSuggestion: { type: String, default: '' },
        teacherResolved: { type: Boolean, default: false },
      },
    ],
    // PowerPoint Slide-Wise Teaching Explanations
    slideExplanations: [
      {
        slideNumber: { type: Number, required: true },
        slideHeading: { type: String, default: '' },
        extractedOriginalContent: { type: String, default: '' },
        detailedTeacherExplanation: { type: String, default: '' },
        studentFriendlyExamples: { type: String, default: '' },
        questionsToAskStudents: [{ type: String }],
        classroomActivitySuggestions: { type: String, default: '' },
        sourceRef: { type: String, default: '' },
      },
    ],
    // A. Detailed Lesson Plan
    lessonPlan: {
      title: { type: String, default: '' },
      learningObjectives: { type: String, default: '' },
      previousKnowledge: { type: String, default: '' },
      introduction: { type: String, default: '' },
      topicExplanation: { type: String, default: '' },
      definitions: { type: String, default: '' },
      teachingMethodology: { type: String, default: '' },
      teachingAids: { type: String, default: '' },
      classroomActivities: { type: String, default: '' },
      realLifeExamples: { type: String, default: '' },
      assessment: { type: String, default: '' },
      learningOutcomes: { type: String, default: '' },
      homework: { type: String, default: '' },
      sourceReferences: { type: mongoose.Schema.Types.Mixed, default: [] },
    },
    // B. Detailed Classroom Teaching Notes
    classroomTeachingNotes: {
      topicWiseExplanation: { type: String, default: '' },
      definitions: { type: String, default: '' },
      subtopics: { type: String, default: '' },
      examples: { type: String, default: '' },
      stepByStepExplanations: { type: String, default: '' },
      classroomDiscussion: { type: String, default: '' },
      practicalApplications: { type: String, default: '' },
      summary: { type: String, default: '' },
      sourceReferences: { type: mongoose.Schema.Types.Mixed, default: [] },
    },
    // C. Question Bank
    questionBank: {
      mcqs: [
        {
          question: { type: String, default: '' },
          options: [{ type: String }],
          answer: { type: String, default: '' },
          explanation: { type: String, default: '' },
          sourceRef: { type: String, default: '' },
        },
      ],
      trueFalse: [
        {
          statement: { type: String, default: '' },
          isTrue: { type: Boolean, default: true },
          explanation: { type: String, default: '' },
          sourceRef: { type: String, default: '' },
        },
      ],
      fillBlanks: [
        {
          sentence: { type: String, default: '' },
          answer: { type: String, default: '' },
          sourceRef: { type: String, default: '' },
        },
      ],
      shortAnswers: [
        {
          question: { type: String, default: '' },
          answer: { type: String, default: '' },
          sourceRef: { type: String, default: '' },
        },
      ],
      longAnswers: [
        {
          question: { type: String, default: '' },
          answer: { type: String, default: '' },
          rubric: { type: String, default: '' },
          sourceRef: { type: String, default: '' },
        },
      ],
      answerKeys: { type: String, default: '' },
    },
    // D. Classroom Activity Plan
    classroomActivityPlan: {
      individualActivities: [
        {
          title: { type: String, default: '' },
          description: { type: String, default: '' },
          timeMinutes: { type: Number, default: 15 },
          materials: { type: String, default: '' },
          expectedOutcome: { type: String, default: '' },
        },
      ],
      groupActivities: [
        {
          title: { type: String, default: '' },
          description: { type: String, default: '' },
          groupSize: { type: String, default: '4-5 students' },
          materials: { type: String, default: '' },
          expectedOutcome: { type: String, default: '' },
        },
      ],
      practicalDemonstrations: [
        {
          title: { type: String, default: '' },
          steps: { type: String, default: '' },
          safetyNotes: { type: String, default: '' },
          expectedOutcome: { type: String, default: '' },
        },
      ],
      requiredMaterials: [{ type: String }],
      expectedOutcomes: { type: String, default: '' },
    },
    // E. Daily Teaching Diary Draft
    dailyTeachingDiaryDraft: {
      date: { type: Date, default: Date.now },
      className: { type: String, default: '' },
      subject: { type: String, default: '' },
      unit: { type: String, default: '' },
      topic: { type: String, default: '' },
      detailedTeachingExplanation: { type: String, default: '' },
      activities: { type: String, default: '' },
      teachingAids: { type: String, default: '' },
      expectedLearningOutcomes: { type: String, default: '' },
      homework: { type: String, default: '' },
      teacherRemarks: { type: String, default: '' },
      status: { type: String, default: 'Draft' },
      confirmedTaught: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['Draft', 'Approved', 'Exported'],
      default: 'Draft',
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    convertedLessonPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonPlan',
      default: null,
    },
    createdDiaryEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTeachingEntry',
      default: null,
    },
  },
  { timestamps: true }
);

const MongoAIGeneratedTeachingMaterial = mongoose.model(
  'AIGeneratedTeachingMaterial',
  aiGeneratedTeachingMaterialSchema
);

export class AIGeneratedTeachingMaterial {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIGeneratedTeachingMaterial.create(data);
      } catch (err) {
        console.warn('[DB Error] AIGeneratedTeachingMaterial.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'mat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      status: data.status || 'Draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryMaterials.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIGeneratedTeachingMaterial.findById(id);
      } catch (err) {
        console.warn('[DB Error] AIGeneratedTeachingMaterial.findById fallback:', err.message);
      }
    }
    return memoryMaterials.find((m) => String(m._id || m.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, limit = 20) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIGeneratedTeachingMaterial.find({ teacherId })
          .sort({ createdAt: -1 })
          .limit(limit);
      } catch (err) {
        console.warn('[DB Error] AIGeneratedTeachingMaterial.findForTeacher fallback:', err.message);
      }
    }
    return memoryMaterials
      .filter((m) => String(m.teacherId) === String(teacherId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  static async updateById(id, teacherId, updates) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIGeneratedTeachingMaterial.findOneAndUpdate(
          { _id: id, teacherId },
          updates,
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] AIGeneratedTeachingMaterial.updateById fallback:', err.message);
      }
    }

    const index = memoryMaterials.findIndex(
      (m) => String(m._id || m.id) === String(id) && String(m.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    memoryMaterials[index] = {
      ...memoryMaterials[index],
      ...updates,
      updatedAt: new Date(),
    };
    return memoryMaterials[index];
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoAIGeneratedTeachingMaterial.findOneAndDelete({
          _id: id,
          teacherId,
        });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] AIGeneratedTeachingMaterial.deleteById fallback:', err.message);
      }
    }

    const index = memoryMaterials.findIndex(
      (m) => String(m._id || m.id) === String(id) && String(m.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryMaterials.splice(index, 1);
    return true;
  }
}

export default MongoAIGeneratedTeachingMaterial;
