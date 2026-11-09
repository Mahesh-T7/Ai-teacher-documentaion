import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryPlans = [];

const lessonPlanSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      default: '2026-2027',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
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
    unitOrChapter: {
      type: String,
      default: '',
      trim: true,
    },
    topic: {
      type: String,
      default: '',
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
      min: 15,
      max: 180,
    },
    learningObjectives: {
      type: String,
      default: '',
    },
    previousKnowledge: {
      type: String,
      default: '',
    },
    introduction: {
      type: String,
      default: '',
    },
    detailedExplanation: {
      type: String,
      default: '',
    },
    definitions: {
      type: String,
      default: '',
    },
    teachingMethodology: {
      type: String,
      default: 'Inquiry-based Learning',
    },
    teachingAids: {
      type: String,
      default: '',
    },
    classroomActivities: {
      type: String,
      default: '',
    },
    realLifeExamples: {
      type: String,
      default: '',
    },
    assessmentQuestions: {
      type: String,
      default: '',
    },
    expectedLearningOutcomes: {
      type: String,
      default: '',
    },
    homework: {
      type: String,
      default: '',
    },
    teacherRemarks: {
      type: String,
      default: '',
    },
    photos: {
      type: Array,
      default: [],
    },
    classroomPhotographs: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved'],
      default: 'Draft',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approverRemarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

lessonPlanSchema.index({ teacherId: 1, status: 1 });
lessonPlanSchema.index({ teacherId: 1, subject: 1 });
lessonPlanSchema.index({ teacherId: 1, className: 1 });

lessonPlanSchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  if (!this.unitOrChapter) {
    this.unitOrChapter = this.unit || this.chapter || '';
  }
  next();
});

const MongoLessonPlan = mongoose.model('LessonPlan', lessonPlanSchema);

export class LessonPlan {
  static async create(data) {
    const { isConnected } = getDBStatus();

    const payload = {
      ...data,
      academicYear: data.academicYear || '2026-2027',
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
      unitOrChapter: data.unitOrChapter || data.unit || data.chapter || '',
      status: data.status || 'Draft',
    };

    if (isConnected) {
      try {
        return await MongoLessonPlan.create(payload);
      } catch (err) {
        console.warn('[DB Error] LessonPlan.create fallback:', err.message);
        throw err;
      }
    }

    const item = {
      _id: 'lp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryPlans.push(item);
    return item;
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoLessonPlan.findById(id);
      } catch (err) {
        console.warn('[DB Error] LessonPlan.findById fallback:', err.message);
      }
    }
    return memoryPlans.find((p) => String(p._id || p.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.status) query.status = filters.status;
    if (filters.subject) query.subject = new RegExp(filters.subject, 'i');
    if (filters.className) query.className = filters.className;
    if (filters.classHandled) query.classHandled = filters.classHandled;
    if (filters.unit) {
      const uRegex = new RegExp(filters.unit, 'i');
      query.$or = [{ unit: uRegex }, { chapter: uRegex }, { unitOrChapter: uRegex }];
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { title: regex },
        { topic: regex },
        { subject: regex },
        { unit: regex },
        { chapter: regex },
        { learningObjectives: regex },
        { detailedExplanation: regex },
      ];
    }

    if (isConnected) {
      try {
        return await MongoLessonPlan.find(query).sort({ updatedAt: -1 });
      } catch (err) {
        console.warn('[DB Error] LessonPlan.findForTeacher fallback:', err.message);
      }
    }

    return memoryPlans
      .filter((p) => {
        if (String(p.teacherId) !== String(teacherId)) return false;
        if (filters.status && p.status !== filters.status) return false;
        if (filters.subject && !p.subject?.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.className && p.className !== filters.className) return false;
        if (filters.classHandled && p.classHandled !== filters.classHandled) return false;
        if (filters.unit) {
          const uTerm = filters.unit.toLowerCase();
          const matchUnit =
            p.unit?.toLowerCase().includes(uTerm) ||
            p.chapter?.toLowerCase().includes(uTerm) ||
            p.unitOrChapter?.toLowerCase().includes(uTerm);
          if (!matchUnit) return false;
        }
        if (filters.search) {
          const sTerm = filters.search.toLowerCase();
          const matches =
            p.title?.toLowerCase().includes(sTerm) ||
            p.topic?.toLowerCase().includes(sTerm) ||
            p.subject?.toLowerCase().includes(sTerm) ||
            p.unit?.toLowerCase().includes(sTerm) ||
            p.chapter?.toLowerCase().includes(sTerm) ||
            p.learningObjectives?.toLowerCase().includes(sTerm) ||
            p.detailedExplanation?.toLowerCase().includes(sTerm);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();

    const payload = { ...updateData };
    if (payload.className && payload.section) {
      payload.classHandled = `${payload.className}-${payload.section}`;
    }
    if (payload.unit || payload.chapter) {
      payload.unitOrChapter = payload.unit || payload.chapter;
    }

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoLessonPlan.findOneAndUpdate(
          { _id: id, teacherId },
          { ...payload, updatedAt: new Date() },
          { new: true, runValidators: true }
        );
      } catch (err) {
        console.warn('[DB Error] LessonPlan.updateById fallback:', err.message);
        throw err;
      }
    }

    const index = memoryPlans.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (index === -1) return null;

    const merged = {
      ...memoryPlans[index],
      ...payload,
      updatedAt: new Date(),
    };
    memoryPlans[index] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const res = await MongoLessonPlan.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] LessonPlan.deleteById fallback:', err.message);
      }
    }

    const index = memoryPlans.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryPlans.splice(index, 1);
    return true;
  }

  static async duplicate(id, teacherId) {
    const original = await this.findById(id);
    if (!original || String(original.teacherId) !== String(teacherId)) {
      return null;
    }

    const doc = original.toObject ? original.toObject() : { ...original };
    delete doc._id;
    delete doc.id;
    delete doc.createdAt;
    delete doc.updatedAt;

    doc.title = `Copy of ${doc.title}`;
    doc.status = 'Draft';
    doc.submittedAt = null;
    doc.approvedAt = null;
    doc.approverRemarks = '';

    return await this.create(doc);
  }

  static async countForTeacher(teacherId, query = {}) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoLessonPlan.countDocuments({ teacherId, ...query });
      } catch (err) {
        console.warn('[DB Error] LessonPlan.countForTeacher fallback:', err.message);
      }
    }
    return memoryPlans.filter((p) => {
      if (String(p.teacherId) !== String(teacherId)) return false;
      if (query.status && p.status !== query.status) return false;
      return true;
    }).length;
  }

  static async findRecent(teacherId, limit = 5) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoLessonPlan.find({ teacherId }).sort({ createdAt: -1 }).limit(limit);
      } catch (err) {
        console.warn('[DB Error] LessonPlan.findRecent fallback:', err.message);
      }
    }
    return memoryPlans
      .filter((p) => String(p.teacherId) === String(teacherId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

export default MongoLessonPlan;
