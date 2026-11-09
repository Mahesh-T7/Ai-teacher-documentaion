import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryAssessments = [];

const studentMarkItemSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    studentName: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: Number,
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assessmentTitle: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    assessmentType: {
      type: String,
      enum: ['Quiz', 'Assignment', 'Unit Test', 'Practical Assessment', 'Project', 'Classroom Activity'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
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
    subject: {
      type: String,
      required: true,
      index: true,
    },
    maximumMarks: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
    },
    studentMarks: [studentMarkItemSchema],
    totalStudentsAppeared: {
      type: Number,
      default: 0,
    },
    classAverage: {
      type: Number,
      default: 0,
    },
    highestMarks: {
      type: Number,
      default: 0,
    },
    lowestMarks: {
      type: Number,
      default: 0,
    },
    learningGapsIdentified: {
      type: String,
      default: '',
    },
    teacherRemarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

assessmentSchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  const max = this.maximumMarks || 25;
  const list = this.studentMarks || [];
  this.totalStudentsAppeared = list.length;

  if (list.length > 0) {
    let sum = 0;
    let highest = -Infinity;
    let lowest = Infinity;

    list.forEach((s) => {
      s.percentage = Math.round((s.marksObtained / max) * 100);
      sum += s.marksObtained;
      if (s.marksObtained > highest) highest = s.marksObtained;
      if (s.marksObtained < lowest) lowest = s.marksObtained;
    });

    this.classAverage = Math.round((sum / list.length) * 10) / 10;
    this.highestMarks = highest === -Infinity ? 0 : highest;
    this.lowestMarks = lowest === Infinity ? 0 : lowest;
  }
  next();
});

const MongoAssessment = mongoose.model('Assessment', assessmentSchema);

export class Assessment {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const max = Number(data.maximumMarks) || 25;
    const list = (data.studentMarks || []).map((s) => ({
      ...s,
      percentage: Math.round((s.marksObtained / max) * 100),
    }));

    let sum = 0;
    let highest = list.length > 0 ? list[0].marksObtained : 0;
    let lowest = list.length > 0 ? list[0].marksObtained : 0;

    list.forEach((s) => {
      sum += s.marksObtained;
      if (s.marksObtained > highest) highest = s.marksObtained;
      if (s.marksObtained < lowest) lowest = s.marksObtained;
    });

    const avg = list.length > 0 ? Math.round((sum / list.length) * 10) / 10 : 0;

    const payload = {
      ...data,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
      studentMarks: list,
      totalStudentsAppeared: list.length,
      classAverage: avg,
      highestMarks: highest,
      lowestMarks: lowest,
    };

    if (isConnected) {
      try {
        return await MongoAssessment.create(payload);
      } catch (err) {
        console.warn('[DB Error] Assessment.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'asm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryAssessments.push(item);
    return item;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.className) query.className = filters.className;
    if (filters.classHandled) query.classHandled = filters.classHandled;
    if (filters.subject) query.subject = new RegExp(filters.subject, 'i');
    if (filters.assessmentType) query.assessmentType = filters.assessmentType;

    if (isConnected) {
      try {
        return await MongoAssessment.find(query).sort({ date: -1 });
      } catch (err) {
        console.warn('[DB Error] Assessment.findForTeacher fallback:', err.message);
      }
    }

    return memoryAssessments
      .filter((a) => {
        if (String(a.teacherId) !== String(teacherId)) return false;
        if (filters.className && a.className !== filters.className) return false;
        if (filters.classHandled && a.classHandled !== filters.classHandled) return false;
        if (filters.subject && !a.subject?.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.assessmentType && a.assessmentType !== filters.assessmentType) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoAssessment.findById(id);
      } catch (err) {
        console.warn('[DB Error] Assessment.findById fallback:', err.message);
      }
    }
    return memoryAssessments.find((a) => String(a._id || a.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    const max = Number(updateData.maximumMarks) || 25;
    const list = (updateData.studentMarks || []).map((s) => ({
      ...s,
      percentage: Math.round((s.marksObtained / max) * 100),
    }));

    let sum = 0;
    let highest = list.length > 0 ? list[0].marksObtained : 0;
    let lowest = list.length > 0 ? list[0].marksObtained : 0;

    list.forEach((s) => {
      sum += s.marksObtained;
      if (s.marksObtained > highest) highest = s.marksObtained;
      if (s.marksObtained < lowest) lowest = s.marksObtained;
    });

    const avg = list.length > 0 ? Math.round((sum / list.length) * 10) / 10 : 0;

    const payload = {
      ...updateData,
      studentMarks: list,
      totalStudentsAppeared: list.length,
      classAverage: avg,
      highestMarks: highest,
      lowestMarks: lowest,
    };

    if (isConnected) {
      try {
        return await MongoAssessment.findOneAndUpdate(
          { _id: id, teacherId },
          { ...payload, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] Assessment.updateById fallback:', err.message);
      }
    }

    const idx = memoryAssessments.findIndex(
      (a) => String(a._id || a.id) === String(id) && String(a.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;
    const merged = { ...memoryAssessments[idx], ...payload, updatedAt: new Date() };
    memoryAssessments[idx] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoAssessment.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] Assessment.deleteById fallback:', err.message);
      }
    }
    const idx = memoryAssessments.findIndex(
      (a) => String(a._id || a.id) === String(id) && String(a.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryAssessments.splice(idx, 1);
    return true;
  }
}

export default MongoAssessment;
