import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryUploadedDocs = [];

const uploadedDocumentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
      index: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fileHash: {
      type: String,
      index: true,
    },
    academicYear: {
      type: String,
      default: '2026-2027',
      index: true,
    },
    className: {
      type: String,
      default: 'General',
      index: true,
    },
    subject: {
      type: String,
      default: 'General',
      index: true,
    },
    unit: {
      type: String,
      default: '',
    },
    chapter: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      default: '',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['Uploaded', 'Processing', 'Extracted', 'Analysed', 'Generated', 'Failed'],
      default: 'Uploaded',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    extractedContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExtractedDocumentContent',
      default: null,
    },
    processingJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentProcessingJob',
      default: null,
    },
    isReplaced: {
      type: Boolean,
      default: false,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UploadedDocument',
      default: null,
    },
  },
  { timestamps: true }
);

const MongoUploadedDocument = mongoose.model('UploadedDocument', uploadedDocumentSchema);

export class UploadedDocument {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoUploadedDocument.create(data);
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'updoc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      status: data.status || 'Uploaded',
      isReplaced: !!data.isReplaced,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryUploadedDocs.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoUploadedDocument.findById(id);
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.findById fallback:', err.message);
      }
    }
    return memoryUploadedDocs.find((d) => String(d._id || d.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, query = {}) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const filter = { teacherId, isReplaced: false };
        if (query.className) filter.className = new RegExp(query.className, 'i');
        if (query.subject) filter.subject = new RegExp(query.subject, 'i');
        if (query.academicYear) filter.academicYear = query.academicYear;
        if (query.status) filter.status = query.status;
        if (query.topic) filter.topic = new RegExp(query.topic, 'i');
        if (query.search) {
          filter.$or = [
            { originalName: new RegExp(query.search, 'i') },
            { topic: new RegExp(query.search, 'i') },
            { subject: new RegExp(query.search, 'i') },
          ];
        }
        return await MongoUploadedDocument.find(filter).sort({ createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.findForTeacher fallback:', err.message);
      }
    }

    return memoryUploadedDocs
      .filter((d) => {
        if (String(d.teacherId) !== String(teacherId)) return false;
        if (d.isReplaced) return false;
        if (query.className && !new RegExp(query.className, 'i').test(d.className)) return false;
        if (query.subject && !new RegExp(query.subject, 'i').test(d.subject)) return false;
        if (query.academicYear && d.academicYear !== query.academicYear) return false;
        if (query.status && d.status !== query.status) return false;
        if (query.topic && !new RegExp(query.topic, 'i').test(d.topic || '')) return false;
        if (query.search) {
          const s = query.search.toLowerCase();
          const matchName = d.originalName && d.originalName.toLowerCase().includes(s);
          const matchTopic = d.topic && d.topic.toLowerCase().includes(s);
          const matchSubj = d.subject && d.subject.toLowerCase().includes(s);
          if (!matchName && !matchTopic && !matchSubj) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findByHash(teacherId, fileHash) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoUploadedDocument.findOne({ teacherId, fileHash, isReplaced: false });
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.findByHash fallback:', err.message);
      }
    }
    return (
      memoryUploadedDocs.find(
        (d) => String(d.teacherId) === String(teacherId) && d.fileHash === fileHash && !d.isReplaced
      ) || null
    );
  }

  static async updateById(id, teacherId, updates) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoUploadedDocument.findOneAndUpdate({ _id: id, teacherId }, updates, {
          new: true,
        });
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.updateById fallback:', err.message);
      }
    }

    const index = memoryUploadedDocs.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    memoryUploadedDocs[index] = {
      ...memoryUploadedDocs[index],
      ...updates,
      updatedAt: new Date(),
    };
    return memoryUploadedDocs[index];
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoUploadedDocument.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] UploadedDocument.deleteById fallback:', err.message);
      }
    }

    const index = memoryUploadedDocs.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryUploadedDocs.splice(index, 1);
    return true;
  }
}

export default MongoUploadedDocument;
