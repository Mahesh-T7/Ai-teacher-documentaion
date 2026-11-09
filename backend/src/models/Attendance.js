import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryAttendance = [];

const attendanceRecordItemSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Leave'],
      default: 'Present',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    className: {
      type: String,
      required: true,
      index: true,
    },
    section: {
      type: String,
      default: 'A',
    },
    classHandled: {
      type: String,
    },
    records: [attendanceRecordItemSchema],
    totalStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    leaveCount: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
    auditHistory: [
      {
        editedAt: { type: Date, default: Date.now },
        editedBy: { type: String, default: 'Teacher' },
        changeSummary: { type: String, default: 'Attendance updated' },
      },
    ],
  },
  { timestamps: true }
);

attendanceSchema.index({ teacherId: 1, date: 1, className: 1, section: 1 }, { unique: true });

attendanceSchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  const total = this.records.length;
  const present = this.records.filter((r) => r.status === 'Present').length;
  const absent = this.records.filter((r) => r.status === 'Absent').length;
  const leave = this.records.filter((r) => r.status === 'Leave').length;

  this.totalStudents = total;
  this.presentCount = present;
  this.absentCount = absent;
  this.leaveCount = leave;
  this.attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
  next();
});

const MongoAttendance = mongoose.model('Attendance', attendanceSchema);

export class Attendance {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const total = data.records?.length || 0;
    const present = data.records?.filter((r) => r.status === 'Present').length || 0;
    const absent = data.records?.filter((r) => r.status === 'Absent').length || 0;
    const leave = data.records?.filter((r) => r.status === 'Leave').length || 0;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const payload = {
      ...data,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
      totalStudents: total,
      presentCount: present,
      absentCount: absent,
      leaveCount: leave,
      attendancePercentage: pct,
    };

    if (isConnected) {
      try {
        return await MongoAttendance.create(payload);
      } catch (err) {
        console.warn('[DB Error] Attendance.create fallback:', err.message);
        throw err;
      }
    }

    const item = {
      _id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryAttendance.push(item);
    return item;
  }

  static async findByDateAndClass(teacherId, date, className, section = 'A') {
    const d = new Date(date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAttendance.findOne({
          teacherId,
          className,
          section,
          date: { $gte: start, $lte: end },
        });
      } catch (err) {
        console.warn('[DB Error] Attendance.findByDateAndClass fallback:', err.message);
      }
    }

    const targetDateStr = new Date(date).toISOString().split('T')[0];
    return (
      memoryAttendance.find((a) => {
        if (String(a.teacherId) !== String(teacherId)) return false;
        if (a.className !== className || a.section !== section) return false;
        const aDateStr = new Date(a.date).toISOString().split('T')[0];
        return aDateStr === targetDateStr;
      }) || null
    );
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.className) query.className = filters.className;
    if (filters.section) query.section = filters.section;
    if (filters.classHandled) query.classHandled = filters.classHandled;

    if (filters.date) {
      const d = new Date(filters.date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    if (isConnected) {
      try {
        return await MongoAttendance.find(query).sort({ date: -1 });
      } catch (err) {
        console.warn('[DB Error] Attendance.findForTeacher fallback:', err.message);
      }
    }

    return memoryAttendance
      .filter((a) => {
        if (String(a.teacherId) !== String(teacherId)) return false;
        if (filters.className && a.className !== filters.className) return false;
        if (filters.section && a.section !== filters.section) return false;
        if (filters.classHandled && a.classHandled !== filters.classHandled) return false;
        if (filters.date) {
          const aDate = new Date(a.date).toISOString().split('T')[0];
          const fDate = new Date(filters.date).toISOString().split('T')[0];
          if (aDate !== fDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static async updateById(id, teacherId, updateData, auditSummary = 'Attendance modified') {
    const { isConnected } = getDBStatus();
    const records = updateData.records || [];
    const total = records.length;
    const present = records.filter((r) => r.status === 'Present').length;
    const absent = records.filter((r) => r.status === 'Absent').length;
    const leave = records.filter((r) => r.status === 'Leave').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    const payload = {
      ...updateData,
      totalStudents: total,
      presentCount: present,
      absentCount: absent,
      leaveCount: leave,
      attendancePercentage: pct,
      $push: {
        auditHistory: {
          editedAt: new Date(),
          editedBy: 'Teacher',
          changeSummary: auditSummary,
        },
      },
    };

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoAttendance.findOneAndUpdate(
          { _id: id, teacherId },
          payload,
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] Attendance.updateById fallback:', err.message);
      }
    }

    const idx = memoryAttendance.findIndex(
      (a) => String(a._id || a.id) === String(id) && String(a.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;

    const existing = memoryAttendance[idx];
    const updated = {
      ...existing,
      ...updateData,
      totalStudents: total,
      presentCount: present,
      absentCount: absent,
      leaveCount: leave,
      attendancePercentage: pct,
      auditHistory: [
        ...(existing.auditHistory || []),
        { editedAt: new Date(), editedBy: 'Teacher', changeSummary: auditSummary },
      ],
      updatedAt: new Date(),
    };
    memoryAttendance[idx] = updated;
    return updated;
  }
}

export default MongoAttendance;
