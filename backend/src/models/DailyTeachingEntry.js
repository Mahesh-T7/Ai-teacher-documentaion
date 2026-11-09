import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryDiary = [];

const dailyTeachingEntrySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teacherName: {
      type: String,
      default: '',
    },
    schoolName: {
      type: String,
      default: '',
    },
    schoolId: {
      type: String,
      default: '',
    },
    academicYear: {
      type: String,
      default: '2026-2027',
      index: true,
    },
    // Section A: Basic information
    date: {
      type: Date,
      required: [true, 'Teaching date is required'],
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      index: true,
    },
    section: {
      type: String,
      default: 'A',
      trim: true,
    },
    classHandled: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      index: true,
    },
    period: {
      type: Number,
      required: [true, 'Period number is required'],
      min: 1,
      max: 12,
    },
    startTime: {
      type: String,
      default: '',
      trim: true,
    },
    endTime: {
      type: String,
      default: '',
      trim: true,
    },
    timeSlot: {
      type: String,
      default: '',
      trim: true,
    },
    timetableEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
      default: null,
    },
    lessonPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonPlan',
      default: null,
    },

    // Section B: Lesson Information
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    chapter: {
      type: String,
      default: '',
      trim: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic covered is required'],
      trim: true,
    },
    subtopic: {
      type: String,
      default: '',
      trim: true,
    },
    learningObjectives: {
      type: String,
      default: '',
      trim: true,
    },
    previousKnowledge: {
      type: String,
      default: '',
      trim: true,
    },
    introduction: {
      type: String,
      default: '',
      trim: true,
    },
    teachingMethodology: {
      type: String,
      default: '',
      trim: true,
    },
    teachingAids: {
      type: String,
      default: '',
      trim: true,
    },

    // Section C: Detailed Teaching Content (Rich Text)
    detailedContent: {
      type: String,
      default: '',
    },

    // Section D: Classroom Activities
    activitiesConducted: {
      type: String,
      default: '',
    },
    studentParticipation: {
      type: String,
      default: '',
    },
    groupDiscussions: {
      type: String,
      default: '',
    },
    practicalDemonstrations: {
      type: String,
      default: '',
    },
    teachingMaterialsUsed: {
      type: String,
      default: '',
    },

    // Section E: Learning Outcomes
    learningOutcomes: {
      type: String,
      default: '',
    },
    skillsDeveloped: {
      type: String,
      default: '',
    },
    learningDifficultiesObserved: {
      type: String,
      default: '',
    },
    studentsRequiringSupport: {
      type: String,
      default: '',
    },
    assessment: {
      type: String,
      default: '',
      trim: true,
    },
    classroomActivities: {
      type: String,
      default: '',
      trim: true,
    },

    // Section F: Completion & Remarks
    homeworkAssigned: {
      type: String,
      default: '',
    },
    teacherRemarks: {
      type: String,
      default: '',
    },
    nextClassPlan: {
      type: String,
      default: '',
    },
    classroomPhotographs: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Draft', 'Partially Completed', 'Completed'],
      default: 'Draft',
      index: true,
    },
    teacherConfirmed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
dailyTeachingEntrySchema.index({ teacherId: 1, date: -1 });
dailyTeachingEntrySchema.index({ teacherId: 1, academicYear: 1 });
dailyTeachingEntrySchema.index({ teacherId: 1, className: 1 });
dailyTeachingEntrySchema.index({ teacherId: 1, subject: 1 });
dailyTeachingEntrySchema.index({ teacherId: 1, date: 1, period: 1 });

dailyTeachingEntrySchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  if (!this.timeSlot && this.startTime && this.endTime) {
    this.timeSlot = `${this.startTime} - ${this.endTime}`;
  }
  if (this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const MongoDailyTeachingEntry = mongoose.model('DailyTeachingEntry', dailyTeachingEntrySchema);

export class DailyTeachingEntry {
  static async create(data) {
    const { isConnected } = getDBStatus();

    const payload = {
      ...data,
      academicYear: data.academicYear || '2026-2027',
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
      timeSlot: data.timeSlot || (data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : ''),
      status: data.status || 'Draft',
    };

    if (payload.status === 'Completed' && !payload.completedAt) {
      payload.completedAt = new Date();
    }

    if (isConnected) {
      try {
        return await MongoDailyTeachingEntry.create(payload);
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.create fallback:', err.message);
        throw err;
      }
    }

    const item = {
      _id: 'dte_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDiary.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoDailyTeachingEntry.findById(id).populate('lessonPlanId', 'title status');
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.findById fallback:', err.message);
      }
    }
    return memoryDiary.find((d) => String(d._id || d.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.status) query.status = filters.status;
    if (filters.className) query.className = filters.className;
    if (filters.classHandled) query.classHandled = filters.classHandled;
    if (filters.subject) query.subject = new RegExp(filters.subject, 'i');
    if (filters.unit) query.unit = new RegExp(filters.unit, 'i');
    if (filters.topic) query.topic = new RegExp(filters.topic, 'i');

    if (filters.date) {
      const d = new Date(filters.date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { topic: regex },
        { subtopic: regex },
        { unit: regex },
        { chapter: regex },
        { subject: regex },
        { detailedContent: regex },
      ];
    }

    if (isConnected) {
      try {
        return await MongoDailyTeachingEntry.find(query).sort({ date: -1, period: 1 });
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.findForTeacher fallback:', err.message);
      }
    }

    // Memory filter
    return memoryDiary
      .filter((d) => {
        if (String(d.teacherId) !== String(teacherId)) return false;
        if (filters.status && d.status !== filters.status) return false;
        if (filters.className && d.className !== filters.className) return false;
        if (filters.classHandled && d.classHandled !== filters.classHandled) return false;
        if (filters.subject && !d.subject.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.unit && !d.unit?.toLowerCase().includes(filters.unit.toLowerCase())) return false;
        if (filters.topic && !d.topic?.toLowerCase().includes(filters.topic.toLowerCase())) return false;

        if (filters.date) {
          const targetStr = new Date(filters.date).toISOString().split('T')[0];
          const entryStr = new Date(d.date).toISOString().split('T')[0];
          if (targetStr !== entryStr) return false;
        } else {
          if (filters.startDate && new Date(d.date) < new Date(filters.startDate)) return false;
          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (new Date(d.date) > end) return false;
          }
        }

        if (filters.search) {
          const term = filters.search.toLowerCase();
          const match =
            d.topic?.toLowerCase().includes(term) ||
            d.subtopic?.toLowerCase().includes(term) ||
            d.unit?.toLowerCase().includes(term) ||
            d.chapter?.toLowerCase().includes(term) ||
            d.subject?.toLowerCase().includes(term) ||
            d.detailedContent?.toLowerCase().includes(term);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date) || a.period - b.period);
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();

    const payload = { ...updateData };
    if (payload.status === 'Completed' && !payload.completedAt) {
      payload.completedAt = new Date();
    }
    if (payload.className && payload.section) {
      payload.classHandled = `${payload.className}-${payload.section}`;
    }
    if (payload.startTime && payload.endTime) {
      payload.timeSlot = `${payload.startTime} - ${payload.endTime}`;
    }

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoDailyTeachingEntry.findOneAndUpdate(
          { _id: id, teacherId },
          { ...payload, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.updateById fallback:', err.message);
        throw err;
      }
    }

    const index = memoryDiary.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return null;

    const merged = {
      ...memoryDiary[index],
      ...payload,
      updatedAt: new Date(),
    };
    memoryDiary[index] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const res = await MongoDailyTeachingEntry.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.deleteById fallback:', err.message);
      }
    }

    const index = memoryDiary.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryDiary.splice(index, 1);
    return true;
  }

  // Duplicate check warning: does an entry already exist on the same date and period?
  static async checkDuplicatePeriod(teacherId, date, period, excludeId = null) {
    const d = new Date(date);
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const query = {
          teacherId,
          period: Number(period),
          date: { $gte: startOfDay, $lte: endOfDay },
        };
        if (excludeId) query._id = { $ne: excludeId };
        const found = await MongoDailyTeachingEntry.findOne(query);
        return found ? { exists: true, entry: found } : { exists: false };
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.checkDuplicatePeriod fallback:', err.message);
      }
    }

    const targetDateStr = new Date(date).toISOString().split('T')[0];
    const match = memoryDiary.find((item) => {
      if (String(item.teacherId) !== String(teacherId)) return false;
      if (Number(item.period) !== Number(period)) return false;
      if (excludeId && String(item._id || item.id) === String(excludeId)) return false;
      const itemDateStr = new Date(item.date).toISOString().split('T')[0];
      return itemDateStr === targetDateStr;
    });

    return match ? { exists: true, entry: match } : { exists: false };
  }

  // Dashboard Aggregations
  static async countForTeacher(teacherId, query = {}) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDailyTeachingEntry.countDocuments({ teacherId, ...query });
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.countForTeacher fallback:', err.message);
      }
    }
    return memoryDiary.filter((d) => {
      if (String(d.teacherId) !== String(teacherId)) return false;
      if (query.status && d.status !== query.status) return false;
      return true;
    }).length;
  }

  static async getDistinctTeachingDays(teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const records = await MongoDailyTeachingEntry.find({ teacherId }).select('date');
        const days = new Set(records.map((r) => new Date(r.date).toISOString().split('T')[0]));
        return days.size;
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.getDistinctTeachingDays fallback:', err.message);
      }
    }
    const days = new Set(
      memoryDiary
        .filter((d) => String(d.teacherId) === String(teacherId))
        .map((d) => new Date(d.date).toISOString().split('T')[0])
    );
    return days.size;
  }

  static async findRecent(teacherId, limit = 5) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoDailyTeachingEntry.find({ teacherId })
          .sort({ date: -1, period: -1 })
          .limit(limit);
      } catch (err) {
        console.warn('[DB Error] DailyTeachingEntry.findRecent fallback:', err.message);
      }
    }
    return memoryDiary
      .filter((d) => String(d.teacherId) === String(teacherId))
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.period - a.period)
      .slice(0, limit);
  }
}

export default MongoDailyTeachingEntry;
