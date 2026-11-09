import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryAIDrafts = [];

const aiDraftSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toolType: {
      type: String,
      enum: [
        'lesson_plan',
        'teaching_content',
        'notes',
        'mcq',
        'question_paper',
        'worksheet',
        'activity',
        'revision',
        'explanation',
        'ppt_outline',
      ],
      required: true,
      index: true,
    },
    inputs: {
      className: { type: String, default: '' },
      section: { type: String, default: '' },
      subject: { type: String, default: '' },
      academicYear: { type: String, default: '2026-2027' },
      unit: { type: String, default: '' },
      chapter: { type: String, default: '' },
      topic: { type: String, default: '' },
      subtopic: { type: String, default: '' },
      duration: { type: Number, default: 45 },
      language: { type: String, default: 'English' },
      learningLevel: { type: String, default: 'Average' },
      depth: { type: String, default: 'Intermediate' },
      numQuestions: { type: Number, default: 5 },
      additionalInstructions: { type: String, default: '' },
    },
    generatedContent: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'English',
    },
    status: {
      type: String,
      enum: ['Draft', 'Approved'],
      default: 'Draft',
      index: true,
    },
    approvedLessonPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonPlan',
      default: null,
    },
  },
  { timestamps: true }
);

const MongoAIDraft = mongoose.model('AIDraft', aiDraftSchema);

export class AIDraft {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIDraft.create(data);
      } catch (err) {
        console.warn('[DB Error] AIDraft.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'aid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      status: data.status || 'Draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryAIDrafts.push(item);
    return item;
  }

  static async findForTeacher(teacherId, query = {}) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIDraft.find({ teacherId, ...query }).sort({ createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] AIDraft.findForTeacher fallback:', err.message);
      }
    }
    return memoryAIDrafts
      .filter((d) => String(d.teacherId) === String(teacherId) && (!query.toolType || d.toolType === query.toolType))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIDraft.findById(id);
      } catch (err) {
        console.warn('[DB Error] AIDraft.findById fallback:', err.message);
      }
    }
    return memoryAIDrafts.find((d) => String(d._id || d.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAIDraft.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] AIDraft.updateById fallback:', err.message);
      }
    }
    const index = memoryAIDrafts.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    const merged = { ...memoryAIDrafts[index], ...updateData, updatedAt: new Date() };
    memoryAIDrafts[index] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoAIDraft.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] AIDraft.deleteById fallback:', err.message);
      }
    }
    const index = memoryAIDrafts.findIndex(
      (d) => String(d._id || d.id) === String(id) && String(d.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryAIDrafts.splice(index, 1);
    return true;
  }
}

export default MongoAIDraft;
