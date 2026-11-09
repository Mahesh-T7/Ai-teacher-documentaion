import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryTimetable = [];

const timetableSchema = new mongoose.Schema(
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
    academicYear: {
      type: String,
      default: '2026-2027',
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: [true, 'Weekday is required (Monday to Saturday)'],
    },
    period: {
      type: Number,
      required: [true, 'Period number is required'],
      min: [1, 'Period must be at least 1'],
      max: [12, 'Period cannot exceed 12'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
    },
    timeSlot: {
      type: String,
      trim: true,
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
    room: {
      type: String,
      default: 'Main Classroom',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save to auto-fill timeSlot and classHandled if not explicitly set
timetableSchema.pre('save', function () {
  if (!this.timeSlot && this.startTime && this.endTime) {
    this.timeSlot = `${this.startTime} - ${this.endTime}`;
  }
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
});

// Compound unique index to prevent accidental duplicate periods for the same teacher, weekday and academic year
timetableSchema.index(
  { teacherId: 1, academicYear: 1, dayOfWeek: 1, period: 1 },
  { unique: true }
);

const MongoTimetable = mongoose.model('Timetable', timetableSchema);

export class Timetable {
  static async findUpcomingForTeacher(teacherId, academicYear = '2026-2027') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = days[new Date().getDay()];
    const targetDay = currentDayName === 'Sunday' ? 'Monday' : currentDayName;

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const slots = await MongoTimetable.find({
          teacherId,
          academicYear,
          dayOfWeek: targetDay,
        }).sort({ period: 1 });

        if (slots.length > 0) return { day: targetDay, slots };
        const anySlots = await MongoTimetable.find({ teacherId, academicYear }).limit(6);
        return { day: targetDay, slots: anySlots };
      } catch (err) {
        console.warn('[DB Error] Timetable.findUpcomingForTeacher fallback:', err.message);
      }
    }

    const todaySlots = memoryTimetable
      .filter(
        (t) =>
          String(t.teacherId) === String(teacherId) &&
          t.dayOfWeek === targetDay &&
          (!t.academicYear || t.academicYear === academicYear)
      )
      .sort((a, b) => a.period - b.period);

    if (todaySlots.length > 0) return { day: targetDay, slots: todaySlots };

    const fallbackSlots = memoryTimetable
      .filter((t) => String(t.teacherId) === String(teacherId))
      .slice(0, 6);

    return { day: targetDay, slots: fallbackSlots };
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId, ...filters };

    if (isConnected) {
      try {
        return await MongoTimetable.find(query).sort({ dayOfWeek: 1, period: 1 });
      } catch (err) {
        console.warn('[DB Error] Timetable.findForTeacher fallback:', err.message);
      }
    }

    return memoryTimetable
      .filter((t) => {
        if (String(t.teacherId) !== String(teacherId)) return false;
        if (filters.dayOfWeek && t.dayOfWeek !== filters.dayOfWeek) return false;
        if (filters.subject && !t.subject.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.classHandled && t.classHandled !== filters.classHandled) return false;
        if (filters.className && t.className !== filters.className) return false;
        if (filters.academicYear && t.academicYear !== filters.academicYear) return false;
        return true;
      })
      .sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.period - b.period;
      });
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoTimetable.findById(id);
      } catch (err) {
        console.warn('[DB Error] Timetable.findById fallback:', err.message);
      }
    }
    return memoryTimetable.find((t) => String(t._id || t.id) === String(id)) || null;
  }

  static async checkDuplicate(teacherId, dayOfWeek, period, academicYear = '2026-2027', excludeId = null) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const query = { teacherId, dayOfWeek, period, academicYear };
        if (excludeId) {
          query._id = { $ne: excludeId };
        }
        const existing = await MongoTimetable.findOne(query);
        return !!existing;
      } catch (err) {
        console.warn('[DB Error] Timetable.checkDuplicate fallback:', err.message);
      }
    }

    return memoryTimetable.some(
      (t) =>
        String(t.teacherId) === String(teacherId) &&
        t.dayOfWeek === dayOfWeek &&
        Number(t.period) === Number(period) &&
        (t.academicYear || '2026-2027') === academicYear &&
        (!excludeId || String(t._id || t.id) !== String(excludeId))
    );
  }

  static async create(data) {
    const { isConnected } = getDBStatus();

    // Fill defaults
    const payload = {
      ...data,
      academicYear: data.academicYear || '2026-2027',
      timeSlot: data.timeSlot || `${data.startTime} - ${data.endTime}`,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
    };

    if (isConnected) {
      try {
        return await MongoTimetable.create(payload);
      } catch (err) {
        console.warn('[DB Error] Timetable.create fallback:', err.message);
        if (err.code === 11000) {
          const dupErr = new Error(`A timetable entry already exists for ${payload.dayOfWeek}, Period ${payload.period}.`);
          dupErr.code = 11000;
          throw dupErr;
        }
        throw err;
      }
    }

    // Check duplicate in memory
    const isDup = memoryTimetable.some(
      (t) =>
        String(t.teacherId) === String(payload.teacherId) &&
        t.dayOfWeek === payload.dayOfWeek &&
        Number(t.period) === Number(payload.period) &&
        (t.academicYear || '2026-2027') === payload.academicYear
    );
    if (isDup) {
      const err = new Error(`A timetable entry already exists for ${payload.dayOfWeek}, Period ${payload.period}.`);
      err.code = 11000;
      throw err;
    }

    const item = {
      _id: 'tt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryTimetable.push(item);
    return item;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();

    if (isConnected) {
      try {
        return await MongoTimetable.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      } catch (err) {
        console.warn('[DB Error] Timetable.updateById fallback:', err.message);
        throw err;
      }
    }

    const index = memoryTimetable.findIndex(
      (t) => String(t._id || t.id) === String(id) && String(t.teacherId) === String(teacherId)
    );
    if (index === -1) return null;

    const updated = {
      ...memoryTimetable[index],
      ...updateData,
      updatedAt: new Date(),
    };
    if (updated.startTime && updated.endTime) {
      updated.timeSlot = `${updated.startTime} - ${updated.endTime}`;
    }
    if (updated.className) {
      updated.classHandled = updated.section ? `${updated.className}-${updated.section}` : updated.className;
    }
    memoryTimetable[index] = updated;
    return updated;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();

    if (isConnected) {
      try {
        const result = await MongoTimetable.findOneAndDelete({ _id: id, teacherId });
        return !!result;
      } catch (err) {
        console.warn('[DB Error] Timetable.deleteById fallback:', err.message);
      }
    }

    const index = memoryTimetable.findIndex(
      (t) => String(t._id || t.id) === String(id) && String(t.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryTimetable.splice(index, 1);
    return true;
  }
}

export default MongoTimetable;
