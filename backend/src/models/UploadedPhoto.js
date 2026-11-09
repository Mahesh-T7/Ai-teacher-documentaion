import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryPhotos = [];

const uploadedPhotoSchema = new mongoose.Schema(
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
    teachingEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyTeachingEntry',
      default: null,
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
      default: '',
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
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    topic: {
      type: String,
      default: '',
      trim: true,
    },
    caption: {
      type: String,
      required: [true, 'Photo caption is required'],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    policyConsent: {
      type: Boolean,
      default: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

uploadedPhotoSchema.index({ teacherId: 1, date: -1 });

const MongoUploadedPhoto = mongoose.model('UploadedPhoto', uploadedPhotoSchema);

export class UploadedPhoto {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const payload = {
      ...data,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
    };

    if (isConnected) {
      try {
        return await MongoUploadedPhoto.create(payload);
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'ph_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryPhotos.push(item);
    return item;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };

    if (filters.className) query.className = filters.className;
    if (filters.classHandled) query.classHandled = filters.classHandled;
    if (filters.subject) query.subject = new RegExp(filters.subject, 'i');
    if (filters.unit) query.unit = new RegExp(filters.unit, 'i');
    if (filters.topic) query.topic = new RegExp(filters.topic, 'i');
    if (filters.teachingEntryId) query.teachingEntryId = filters.teachingEntryId;

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
        return await MongoUploadedPhoto.find(query).sort({ date: -1, createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.findForTeacher fallback:', err.message);
      }
    }

    return memoryPhotos
      .filter((p) => {
        if (String(p.teacherId) !== String(teacherId)) return false;
        if (filters.className && p.className !== filters.className) return false;
        if (filters.classHandled && p.classHandled !== filters.classHandled) return false;
        if (filters.subject && !p.subject?.toLowerCase().includes(filters.subject.toLowerCase())) return false;
        if (filters.teachingEntryId && String(p.teachingEntryId) !== String(filters.teachingEntryId)) return false;
        if (filters.date) {
          const pDate = new Date(p.date).toISOString().split('T')[0];
          const fDate = new Date(filters.date).toISOString().split('T')[0];
          if (pDate !== fDate) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoUploadedPhoto.findById(id);
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.findById fallback:', err.message);
      }
    }
    return memoryPhotos.find((p) => String(p._id || p.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        return await MongoUploadedPhoto.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.updateById fallback:', err.message);
      }
    }
    const index = memoryPhotos.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (index === -1) return null;
    const merged = { ...memoryPhotos[index], ...updateData, updatedAt: new Date() };
    memoryPhotos[index] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const res = await MongoUploadedPhoto.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.deleteById fallback:', err.message);
      }
    }
    const index = memoryPhotos.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (index === -1) return false;
    memoryPhotos.splice(index, 1);
    return true;
  }

  static async countForTeacher(teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoUploadedPhoto.countDocuments({ teacherId });
      } catch (err) {
        console.warn('[DB Error] UploadedPhoto.countForTeacher fallback:', err.message);
      }
    }
    return memoryPhotos.filter((p) => String(p.teacherId) === String(teacherId)).length;
  }
}

export default MongoUploadedPhoto;
