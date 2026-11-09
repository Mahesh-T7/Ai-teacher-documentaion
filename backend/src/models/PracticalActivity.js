import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryPracticals = [];

const practicalActivitySchema = new mongoose.Schema(
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
    unit: {
      type: String,
      default: '',
    },
    activityTitle: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    activityDescription: {
      type: String,
      default: '',
    },
    learningObjectives: {
      type: String,
      default: '',
    },
    toolsAndSoftwareUsed: {
      type: String,
      default: '',
    },
    practicalSteps: {
      type: String,
      default: '',
    },
    studentParticipation: {
      type: String,
      default: '',
    },
    learningOutcomes: {
      type: String,
      default: '',
    },
    teacherRemarks: {
      type: String,
      default: '',
    },
    associatedPhotos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedPhoto',
      },
    ],
    teachingEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTeachingEntry',
      default: null,
    },
    status: {
      type: String,
      enum: ['Completed', 'Scheduled', 'Evaluated'],
      default: 'Completed',
    },
  },
  { timestamps: true }
);

practicalActivitySchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  next();
});

const MongoPractical = mongoose.model('PracticalActivity', practicalActivitySchema);

export class PracticalActivity {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const payload = {
      ...data,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
    };

    if (isConnected) {
      try {
        return await MongoPractical.create(payload);
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'pa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryPracticals.push(item);
    return item;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.className) query.className = filters.className;
    if (filters.classHandled) query.classHandled = filters.classHandled;
    if (filters.subject) query.subject = new RegExp(filters.subject, 'i');
    if (filters.unit) query.unit = new RegExp(filters.unit, 'i');

    if (filters.date) {
      const d = new Date(filters.date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ activityTitle: regex }, { activityDescription: regex }, { unit: regex }];
    }

    if (isConnected) {
      try {
        return await MongoPractical.find(query).populate('associatedPhotos').sort({ date: -1 });
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.findForTeacher fallback:', err.message);
      }
    }

    return memoryPracticals
      .filter((p) => {
        if (String(p.teacherId) !== String(teacherId)) return false;
        if (filters.className && p.className !== filters.className) return false;
        if (filters.classHandled && p.classHandled !== filters.classHandled) return false;
        if (filters.subject && !p.subject?.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const match =
            p.activityTitle?.toLowerCase().includes(q) ||
            p.activityDescription?.toLowerCase().includes(q) ||
            p.unit?.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoPractical.findById(id).populate('associatedPhotos');
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.findById fallback:', err.message);
      }
    }
    return memoryPracticals.find((p) => String(p._id || p.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoPractical.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.updateById fallback:', err.message);
      }
    }
    const idx = memoryPracticals.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;
    const merged = { ...memoryPracticals[idx], ...updateData, updatedAt: new Date() };
    memoryPracticals[idx] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoPractical.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.deleteById fallback:', err.message);
      }
    }
    const idx = memoryPracticals.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryPracticals.splice(idx, 1);
    return true;
  }

  static async countForTeacher(teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoPractical.countDocuments({ teacherId });
      } catch (err) {
        console.warn('[DB Error] PracticalActivity.countForTeacher fallback:', err.message);
      }
    }
    return memoryPracticals.filter((p) => String(p.teacherId) === String(teacherId)).length;
  }
}

export default MongoPractical;
