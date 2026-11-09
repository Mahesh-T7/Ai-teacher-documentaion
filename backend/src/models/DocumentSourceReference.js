import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memorySourceRefs = [];

const documentSourceReferenceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UploadedDocument',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    itemType: {
      type: String,
      enum: ['slide', 'page', 'worksheet', 'image', 'section'],
      default: 'section',
    },
    itemNumber: {
      type: Number,
      default: 1,
    },
    locationLabel: {
      type: String,
      required: true, // e.g. "Slide 3", "Page 12", "Sheet: Syllabus"
    },
    snippet: {
      type: String,
      default: '',
    },
    targetField: {
      type: String,
      default: '', // e.g. "learningObjectives", "definitions", "topicExplanation"
    },
  },
  { timestamps: true }
);

const MongoDocumentSourceReference = mongoose.model(
  'DocumentSourceReference',
  documentSourceReferenceSchema
);

export class DocumentSourceReference {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentSourceReference.create(data);
      } catch (err) {
        console.warn('[DB Error] DocumentSourceReference.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'src_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memorySourceRefs.push(item);
    return item;
  }

  static async findForDocument(documentId, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentSourceReference.find({ documentId, teacherId });
      } catch (err) {
        console.warn('[DB Error] DocumentSourceReference.findForDocument fallback:', err.message);
      }
    }
    return memorySourceRefs.filter(
      (r) =>
        String(r.documentId) === String(documentId) &&
        String(r.teacherId) === String(teacherId)
    );
  }

  static async insertMany(items) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDocumentSourceReference.insertMany(items);
      } catch (err) {
        console.warn('[DB Error] DocumentSourceReference.insertMany fallback:', err.message);
      }
    }

    const created = items.map((data) => ({
      _id: 'src_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    memorySourceRefs.push(...created);
    return created;
  }
}

export default MongoDocumentSourceReference;
