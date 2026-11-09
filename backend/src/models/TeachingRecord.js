import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';
import { DailyTeachingEntry } from './DailyTeachingEntry.js';

const memoryRecords = [];

const teachingRecordSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    period: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    classHandled: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topicCovered: {
      type: String,
      required: true,
      trim: true,
    },
    learningObjectives: {
      type: String,
      trim: true,
      default: '',
    },
    homeworkAssigned: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Rescheduled', 'Draft', 'Partially Completed'],
      default: 'Completed',
    },
  },
  { timestamps: true }
);

const MongoTeachingRecord = mongoose.model('TeachingRecord', teachingRecordSchema);

export class TeachingRecord {
  static async countForTeacher(teacherId, query = {}) {
    // Combine count from TeachingRecord and DailyTeachingEntry
    const dteQuery = {};
    if (query.status === 'Completed') {
      dteQuery.status = 'Completed';
    }
    const dteCount = await DailyTeachingEntry.countForTeacher(teacherId, dteQuery);

    const { isConnected } = getDBStatus();
    let trCount = 0;
    if (isConnected) {
      try {
        trCount = await MongoTeachingRecord.countDocuments({ teacherId, ...query });
      } catch (err) {
        console.warn('[DB Error] TeachingRecord.countForTeacher fallback:', err.message);
      }
    } else {
      trCount = memoryRecords.filter((r) => {
        if (String(r.teacherId) !== String(teacherId)) return false;
        if (query.status && r.status !== query.status) return false;
        return true;
      }).length;
    }
    return Math.max(dteCount, trCount);
  }

  static async getDistinctTeachingDays(teacherId) {
    const dteDays = await DailyTeachingEntry.getDistinctTeachingDays(teacherId);

    const { isConnected } = getDBStatus();
    let trDays = 0;
    if (isConnected) {
      try {
        const records = await MongoTeachingRecord.find({ teacherId }).select('date');
        const days = new Set(records.map((r) => new Date(r.date).toISOString().split('T')[0]));
        trDays = days.size;
      } catch (err) {
        console.warn('[DB Error] TeachingRecord.getDistinctTeachingDays fallback:', err.message);
      }
    } else {
      const days = new Set(
        memoryRecords
          .filter((r) => String(r.teacherId) === String(teacherId))
          .map((r) => new Date(r.date).toISOString().split('T')[0])
      );
      trDays = days.size;
    }
    return Math.max(dteDays, trDays);
  }

  static async findRecent(teacherId, limit = 5) {
    const dteRecent = await DailyTeachingEntry.findRecent(teacherId, limit);
    if (dteRecent && dteRecent.length > 0) {
      return dteRecent.map((d) => ({
        _id: d._id || d.id,
        id: d._id || d.id,
        topicCovered: d.topic || d.topicCovered,
        classHandled: d.classHandled,
        subject: d.subject,
        period: d.period,
        status: d.status,
        date: d.date,
        homeworkAssigned: d.homeworkAssigned,
      }));
    }

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoTeachingRecord.find({ teacherId }).sort({ date: -1, period: -1 }).limit(limit);
      } catch (err) {
        console.warn('[DB Error] TeachingRecord.findRecent fallback:', err.message);
      }
    }
    return memoryRecords
      .filter((r) => String(r.teacherId) === String(teacherId))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }

  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoTeachingRecord.create(data);
      } catch (err) {
        console.warn('[DB Error] TeachingRecord.create fallback:', err.message);
      }
    }
    const record = {
      _id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      createdAt: new Date(),
    };
    memoryRecords.push(record);
    return record;
  }

  static async countPending(teacherId) {
    const dtePending = await DailyTeachingEntry.countForTeacher(teacherId, { status: 'Draft' });

    const { isConnected } = getDBStatus();
    let trPending = 0;
    if (isConnected) {
      try {
        trPending = await MongoTeachingRecord.countDocuments({ teacherId, status: 'Pending' });
      } catch (err) {
        console.warn('[DB Error] TeachingRecord.countPending fallback:', err.message);
      }
    } else {
      trPending = memoryRecords.filter(
        (r) => String(r.teacherId) === String(teacherId) && r.status === 'Pending'
      ).length;
    }
    return dtePending + trPending;
  }
}

export default MongoTeachingRecord;
