import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryJobs = [];

const documentProcessingJobSchema = new mongoose.Schema(
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
    jobType: {
      type: String,
      enum: ['single_file', 'multi_document_combination'],
      default: 'single_file',
    },
    status: {
      type: String,
      enum: ['Uploaded', 'Processing', 'Extracted', 'Analysed', 'Generated', 'Failed'],
      default: 'Uploaded',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStage: {
      type: String,
      default: 'Initialized',
    },
    errorDetails: {
      message: { type: String, default: '' },
      stack: { type: String, default: '' },
      timestamp: { type: Date, default: null },
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    extractedContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExtractedDocumentContent',
      default: null,
    },
    generatedMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIGeneratedTeachingMaterial',
      default: null,
    },
    resultData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const MongoDocumentProcessingJob = mongoose.model(
  'DocumentProcessingJob',
  documentProcessingJobSchema
);

export class DocumentProcessingJob {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentProcessingJob.create(data);
      } catch (err) {
        console.warn('[DB Error] DocumentProcessingJob.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      progress: data.progress || 0,
      status: data.status || 'Uploaded',
      retryCount: data.retryCount || 0,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryJobs.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentProcessingJob.findById(id);
      } catch (err) {
        console.warn('[DB Error] DocumentProcessingJob.findById fallback:', err.message);
      }
    }
    return memoryJobs.find((j) => String(j._id || j.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updates) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentProcessingJob.findOneAndUpdate(
          { _id: id, teacherId },
          updates,
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] DocumentProcessingJob.updateById fallback:', err.message);
      }
    }

    const index = memoryJobs.findIndex(
      (j) => String(j._id || j.id) === String(id) && String(j.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    memoryJobs[index] = {
      ...memoryJobs[index],
      ...updates,
      updatedAt: new Date(),
    };
    return memoryJobs[index];
  }

  static async findForTeacher(teacherId, limit = 10) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentProcessingJob.find({ teacherId })
          .sort({ createdAt: -1 })
          .limit(limit);
      } catch (err) {
        console.warn('[DB Error] DocumentProcessingJob.findForTeacher fallback:', err.message);
      }
    }
    return memoryJobs
      .filter((j) => String(j.teacherId) === String(teacherId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

export default MongoDocumentProcessingJob;
