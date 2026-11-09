import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryExtracted = [];

const extractedDocumentContentSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedDocument',
      },
    ],
    fileType: {
      type: String,
      required: true,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    rawText: {
      type: String,
      default: '',
    },
    sections: [
      {
        sectionIndex: { type: Number, default: 0 },
        itemNumber: { type: Number, default: 1 },
        itemType: { type: String, default: 'section' }, // 'slide', 'page', 'sheet', 'paragraph', 'image'
        title: { type: String, default: '' },
        text: { type: String, default: '' },
        bulletPoints: [{ type: String }],
        tables: { type: mongoose.Schema.Types.Mixed, default: [] },
        speakerNotes: { type: String, default: '' },
        images: [
          {
            filename: { type: String, default: '' },
            url: { type: String, default: '' },
            caption: { type: String, default: '' },
            ocrText: { type: String, default: '' },
            visionAnalysis: { type: String, default: '' },
          },
        ],
        sourceReference: {
          fileId: { type: String, default: '' },
          fileName: { type: String, default: '' },
          itemType: { type: String, default: '' },
          itemNumber: { type: Number, default: 1 },
          title: { type: String, default: '' },
          label: { type: String, default: '' },
        },
      },
    ],
    sheets: [
      {
        sheetName: { type: String, default: '' },
        rowCount: { type: Number, default: 0 },
        columnCount: { type: Number, default: 0 },
        headers: [{ type: String }],
        sampleRows: { type: mongoose.Schema.Types.Mixed, default: [] },
      },
    ],
    metadataSummary: {
      extractedEntities: [{ type: String }],
      estimatedWordCount: { type: Number, default: 0 },
      hasTables: { type: Boolean, default: false },
      hasSpeakerNotes: { type: Boolean, default: false },
      hasOcrApplied: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const MongoExtractedDocumentContent = mongoose.model(
  'ExtractedDocumentContent',
  extractedDocumentContentSchema
);

export class ExtractedDocumentContent {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoExtractedDocumentContent.create(data);
      } catch (err) {
        console.warn('[DB Error] ExtractedDocumentContent.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryExtracted.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoExtractedDocumentContent.findById(id);
      } catch (err) {
        console.warn('[DB Error] ExtractedDocumentContent.findById fallback:', err.message);
      }
    }
    return memoryExtracted.find((e) => String(e._id || e.id) === String(id)) || null;
  }

  static async findByDocumentId(documentId, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoExtractedDocumentContent.findOne({ documentId, teacherId });
      } catch (err) {
        console.warn('[DB Error] ExtractedDocumentContent.findByDocumentId fallback:', err.message);
      }
    }
    return (
      memoryExtracted.find(
        (e) =>
          String(e.documentId) === String(documentId) &&
          String(e.teacherId) === String(teacherId)
      ) || null
    );
  }

  static async updateById(id, teacherId, updates) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoExtractedDocumentContent.findOneAndUpdate(
          { _id: id, teacherId },
          updates,
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] ExtractedDocumentContent.updateById fallback:', err.message);
      }
    }

    const index = memoryExtracted.findIndex(
      (e) => String(e._id || e.id) === String(id) && String(e.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    memoryExtracted[index] = {
      ...memoryExtracted[index],
      ...updates,
      updatedAt: new Date(),
    };
    return memoryExtracted[index];
  }
}

export default MongoExtractedDocumentContent;
