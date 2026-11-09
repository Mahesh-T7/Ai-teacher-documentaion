import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memorySyllabus = [];

const syllabusSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    classHandled: {
      type: String,
      required: true,
    },
    term: {
      type: String,
      default: 'Term 1',
    },
    totalTopics: {
      type: Number,
      required: true,
      default: 20,
    },
    completedTopics: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

const MongoSyllabus = mongoose.model('SyllabusProgress', syllabusSchema);

export class SyllabusProgress {
  static async getAverageCompletion(teacherId) {
    const { isMemoryFallback } = getDBStatus();
    if (!isMemoryFallback) {
      try {
        const list = await MongoSyllabus.find({ teacherId });
        if (list.length === 0) return 0;
        const total = list.reduce((sum, item) => {
          const pct = item.totalTopics > 0 ? (item.completedTopics / item.totalTopics) * 100 : 0;
          return sum + pct;
        }, 0);
        return Math.round(total / list.length);
      } catch (err) {
        console.warn('[DB Error] SyllabusProgress.getAverageCompletion fallback:', err.message);
      }
    }

    const teacherList = memorySyllabus.filter(s => String(s.teacherId) === String(teacherId));
    if (teacherList.length === 0) return 0;
    const total = teacherList.reduce((sum, item) => {
      const pct = item.totalTopics > 0 ? (item.completedTopics / item.totalTopics) * 100 : 0;
      return sum + pct;
    }, 0);
    return Math.round(total / teacherList.length);
  }

  static async findForTeacher(teacherId) {
    const { isMemoryFallback } = getDBStatus();
    if (!isMemoryFallback) {
      try {
        return await MongoSyllabus.find({ teacherId });
      } catch (err) {
        console.warn('[DB Error] SyllabusProgress.findForTeacher fallback:', err.message);
      }
    }
    return memorySyllabus.filter(s => String(s.teacherId) === String(teacherId));
  }

  static async create(data) {
    const { isMemoryFallback } = getDBStatus();
    if (!isMemoryFallback) {
      try {
        return await MongoSyllabus.create(data);
      } catch (err) {
        console.warn('[DB Error] SyllabusProgress.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'syl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      createdAt: new Date(),
    };
    memorySyllabus.push(item);
    return item;
  }
}

export default MongoSyllabus;
