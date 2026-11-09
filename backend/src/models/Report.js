import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryReports = [];

const reportSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      enum: [
        'daily',
        'weekly',
        'monthly',
        'custom',
        'class',
        'subject',
        'practical',
        'attendance',
        'assessment',
        'syllabus',
        'academic_year',
      ],
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      default: '2026-2027',
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    className: {
      type: String,
      default: '',
    },
    section: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      default: '',
    },
    outputFormat: {
      type: String,
      enum: ['pdf', 'docx', 'xlsx', 'zip'],
      default: 'pdf',
    },
    fileName: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    sectionsIncluded: {
      type: [String],
      default: ['basicInfo', 'lessonInfo', 'detailedContent', 'activities', 'outcomes', 'photos', 'signatures'],
    },
    selectedPhotoIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedPhoto',
      },
    ],
    generationStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Completed',
    },
    approvalStatus: {
      type: String,
      enum: ['Draft', 'Approved'],
      default: 'Draft',
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      default: '',
    },
    previewData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    auditLogs: [
      {
        action: { type: String, default: 'Generated' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

reportSchema.index({ teacherId: 1, createdAt: -1 });

const MongoReport = mongoose.model('Report', reportSchema);

export class Report {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReport.create(data);
      } catch (err) {
        console.warn('[DB Error] Report.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      approvalStatus: data.approvalStatus || 'Draft',
      generationStatus: data.generationStatus || 'Completed',
      auditLogs: data.auditLogs || [{ action: 'Generated', timestamp: new Date(), details: 'Initial generation' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryReports.push(item);
    return item;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };
    if (filters.reportType) query.reportType = filters.reportType;
    if (filters.outputFormat) query.outputFormat = filters.outputFormat;
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;

    if (isConnected) {
      try {
        return await MongoReport.find(query).sort({ createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] Report.findForTeacher fallback:', err.message);
      }
    }

    return memoryReports
      .filter((r) => {
        if (String(r.teacherId) !== String(teacherId)) return false;
        if (filters.reportType && r.reportType !== filters.reportType) return false;
        if (filters.outputFormat && r.outputFormat !== filters.outputFormat) return false;
        if (filters.approvalStatus && r.approvalStatus !== filters.approvalStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReport.findById(id);
      } catch (err) {
        console.warn('[DB Error] Report.findById fallback:', err.message);
      }
    }
    return memoryReports.find((r) => String(r._id || r.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReport.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] Report.updateById fallback:', err.message);
      }
    }
    const idx = memoryReports.findIndex(
      (r) => String(r._id || r.id) === String(id) && String(r.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;

    const existing = memoryReports[idx];
    const auditLogs = [...(existing.auditLogs || [])];
    if (updateData.$push?.auditLogs) {
      auditLogs.push(updateData.$push.auditLogs);
    }
    const cleanUpdate = { ...updateData };
    delete cleanUpdate.$push;

    const merged = { ...existing, ...cleanUpdate, auditLogs, updatedAt: new Date() };
    memoryReports[idx] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoReport.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] Report.deleteById fallback:', err.message);
      }
    }
    const idx = memoryReports.findIndex(
      (r) => String(r._id || r.id) === String(id) && String(r.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryReports.splice(idx, 1);
    return true;
  }
}

export default MongoReport;
