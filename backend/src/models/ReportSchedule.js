import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memorySchedules = [];

const reportScheduleSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    reportType: {
      type: String,
      default: 'daily',
    },
    outputFormat: {
      type: String,
      enum: ['pdf', 'docx', 'xlsx', 'zip'],
      default: 'pdf',
    },
    scheduledTime: {
      type: String,
      default: '17:00', // 5:00 PM IST
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    className: {
      type: String,
      default: '',
    },
    subject: {
      type: String,
      default: '',
    },
    sectionsIncluded: {
      type: [String],
      default: ['basicInfo', 'lessonInfo', 'detailedContent', 'activities', 'outcomes', 'photos', 'signatures'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastRunStatus: {
      type: String,
      default: 'Never Run',
    },
    nextRunAt: {
      type: Date,
      default: null,
    },
    runLogs: [
      {
        runAt: { type: Date, default: Date.now },
        status: { type: String, default: 'Success' },
        message: { type: String, default: '' },
        reportId: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

reportScheduleSchema.index({ teacherId: 1, frequency: 1 });

const MongoReportSchedule = mongoose.model('ReportSchedule', reportScheduleSchema);

export class ReportSchedule {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReportSchedule.create(data);
      } catch (err) {
        console.warn('[DB Error] ReportSchedule.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'sch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memorySchedules.push(item);
    return item;
  }

  static async findForTeacher(teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReportSchedule.find({ teacherId }).sort({ createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] ReportSchedule.findForTeacher fallback:', err.message);
      }
    }
    return memorySchedules.filter((s) => String(s.teacherId) === String(teacherId));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReportSchedule.findById(id);
      } catch (err) {
        console.warn('[DB Error] ReportSchedule.findById fallback:', err.message);
      }
    }
    return memorySchedules.find((s) => String(s._id || s.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoReportSchedule.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] ReportSchedule.updateById fallback:', err.message);
      }
    }
    const idx = memorySchedules.findIndex(
      (s) => String(s._id || s.id) === String(id) && String(s.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;
    const merged = { ...memorySchedules[idx], ...updateData, updatedAt: new Date() };
    memorySchedules[idx] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoReportSchedule.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] ReportSchedule.deleteById fallback:', err.message);
      }
    }
    const idx = memorySchedules.findIndex(
      (s) => String(s._id || s.id) === String(id) && String(s.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memorySchedules.splice(idx, 1);
    return true;
  }
}

export default MongoReportSchedule;
