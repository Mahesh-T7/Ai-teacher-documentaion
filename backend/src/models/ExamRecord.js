import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';
import { calculateStudentMarksResult, calculateExamStatistics } from '../utils/marksCalculationEngine.js';
import { loadCollection, saveCollection } from '../utils/localDiskStore.js';

const memoryExamRecords = loadCollection('examRecords', []);
const persistExamRecords = () => saveCollection('examRecords', memoryExamRecords);

const examRecordSchema = new mongoose.Schema(
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
    templateId: {
      type: mongoose.Schema.Types.Mixed, // string or ObjectId
      required: true,
      index: true,
    },
    templateSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    examTitle: {
      type: String,
      required: [true, 'Examination title is required'],
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2026-2027',
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
      index: true,
    },
    classHandled: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    examDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Draft', 'Finalized'],
      default: 'Draft',
      index: true,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    finalizedBy: {
      type: String,
      default: '',
    },
    studentMarks: [
      {
        studentId: { type: String, default: null },
        studentName: { type: String, required: true },
        admissionNumber: { type: String, default: '' },
        rollNumber: { type: Number, required: true },
        gender: { type: String, default: 'M' },
        caste: { type: String, default: 'GEN' },
        fatherName: { type: String, default: '' },
        componentMarks: { type: mongoose.Schema.Types.Mixed, default: {} },
        totalRaw: { type: Number, default: 0 },
        totalFinal: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        grade: { type: String, default: 'F' },
        isPass: { type: Boolean, default: false },
        isDistinction: { type: Boolean, default: false },
        isEntirelyAbsent: { type: Boolean, default: false },
        remarks: { type: String, default: '' },
      },
    ],
    statistics: {
      totalStudents: { type: Number, default: 0 },
      appearedCount: { type: Number, default: 0 },
      absentCount: { type: Number, default: 0 },
      passedCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      passPercentage: { type: Number, default: 0 },
      classAverage: { type: Number, default: 0 },
      highestMarks: { type: Number, default: 0 },
      lowestMarks: { type: Number, default: 0 },
      gradeDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    auditHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        action: { type: String, required: true },
        user: { type: String, default: '' },
        details: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

examRecordSchema.index({ teacherId: 1, academicYear: 1, className: 1, subject: 1 });

const MongoExamRecord = mongoose.model('ExamRecord', examRecordSchema);

export class ExamRecord {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const classHandled = data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className);

    // Run calculation engine on all students against template snapshot
    const template = data.templateSnapshot || {};
    const computedStudents = (data.studentMarks || []).map((stu) =>
      calculateStudentMarksResult(stu, template)
    );
    const statistics = calculateExamStatistics(computedStudents, template);

    const payload = {
      ...data,
      classHandled,
      studentMarks: computedStudents,
      statistics,
      auditHistory: [
        {
          timestamp: new Date(),
          action: 'CREATED',
          user: data.finalizedBy || 'Teacher',
          details: `Created examination marks record with ${computedStudents.length} students.`,
        },
      ],
    };

    if (isConnected) {
      try {
        return await MongoExamRecord.create(payload);
      } catch (err) {
        console.warn('[DB Error] ExamRecord.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'exam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryExamRecords.push(item);
    persistExamRecords();
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoExamRecord.findById(id);
      } catch (err) {
        console.warn('[DB Error] ExamRecord.findById fallback:', err.message);
      }
    }
    return memoryExamRecords.find((r) => String(r._id || r.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.className) query.className = filters.className;
    if (filters.section) query.section = filters.section;
    if (filters.subject) query.subject = filters.subject;
    if (filters.status) query.status = filters.status;
    if (filters.academicYear) query.academicYear = filters.academicYear;

    if (isConnected) {
      try {
        return await MongoExamRecord.find(query).sort({ updatedAt: -1, createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] ExamRecord.findForTeacher fallback:', err.message);
      }
    }

    return memoryExamRecords
      .filter((r) => {
        if (String(r.teacherId) !== String(teacherId)) return false;
        if (filters.className && r.className !== filters.className) return false;
        if (filters.section && r.section !== filters.section) return false;
        if (filters.subject && r.subject !== filters.subject) return false;
        if (filters.status && r.status !== filters.status) return false;
        if (filters.academicYear && r.academicYear !== filters.academicYear) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  static async updateById(id, teacherId, updateData, userEmail = '') {
    const existing = await this.findById(id);
    if (!existing) return null;

    // Guard: Finalized records cannot be casually altered without authorization
    if (existing.status === 'Finalized' && updateData.status !== 'Finalized' && !updateData.forceUnlock) {
      throw new Error('This examination has already been finalized and locked. Administrative unlock required.');
    }

    const { isConnected } = getDBStatus();
    const template = updateData.templateSnapshot || existing.templateSnapshot || {};

    let computedStudents = existing.studentMarks;
    let statistics = existing.statistics;

    if (updateData.studentMarks) {
      computedStudents = updateData.studentMarks.map((stu) =>
        calculateStudentMarksResult(stu, template)
      );
      statistics = calculateExamStatistics(computedStudents, template);
    }

    const auditEntry = {
      timestamp: new Date(),
      action: updateData.status === 'Finalized' ? 'FINALIZED' : 'UPDATED',
      user: userEmail || 'Teacher',
      details: updateData.status === 'Finalized'
        ? `Finalized and locked marks for ${computedStudents.length} students.`
        : `Updated marks draft.`,
    };

    const payload = {
      ...updateData,
      studentMarks: computedStudents,
      statistics,
      updatedAt: new Date(),
    };

    if (updateData.status === 'Finalized' && existing.status !== 'Finalized') {
      payload.finalizedAt = new Date();
      payload.finalizedBy = userEmail || 'Teacher';
    }

    if (isConnected) {
      try {
        return await MongoExamRecord.findOneAndUpdate(
          { _id: id, teacherId },
          {
            $set: payload,
            $push: { auditHistory: auditEntry },
          },
          { returnDocument: 'after' }
        );
      } catch (err) {
        console.warn('[DB Error] ExamRecord.updateById fallback:', err.message);
      }
    }

    const idx = memoryExamRecords.findIndex(
      (r) => String(r._id || r.id) === String(id) && String(r.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;

    const currentAudit = memoryExamRecords[idx].auditHistory || [];
    const merged = {
      ...memoryExamRecords[idx],
      ...payload,
      auditHistory: [...currentAudit, auditEntry],
    };
    memoryExamRecords[idx] = merged;
    persistExamRecords();
    return merged;
  }

  static async deleteById(id, teacherId) {
    const existing = await this.findById(id);
    if (!existing) return false;

    if (existing.status === 'Finalized') {
      throw new Error('Cannot delete a finalized official examination record.');
    }

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoExamRecord.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] ExamRecord.deleteById fallback:', err.message);
      }
    }

    const idx = memoryExamRecords.findIndex(
      (r) => String(r._id || r.id) === String(id) && String(r.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryExamRecords.splice(idx, 1);
    persistExamRecords();
    return true;
  }
}

export default MongoExamRecord;
