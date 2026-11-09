import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryInspectionPackages = [];

const inspectionPackageSchema = new mongoose.Schema(
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
      required: true,
      default: '2026-2027',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    readinessScore: {
      type: Number,
      default: 0,
    },
    breakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    missingItemsCount: {
      type: Number,
      default: 0,
    },
    checklistSummary: [
      {
        category: String,
        status: String,
        details: String,
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

inspectionPackageSchema.index({ teacherId: 1, academicYear: 1 });

const MongoInspectionPackage = mongoose.model('InspectionPackage', inspectionPackageSchema);

export class InspectionPackage {
  static async create(data) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoInspectionPackage.create(data);
      } catch (err) {
        console.warn('[DB Error] InspectionPackage.create fallback:', err.message);
      }
    }
    const item = {
      _id: 'insp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...data,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryInspectionPackages.push(item);
    return item;
  }

  static async findForTeacher(teacherId, academicYear) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };
    if (academicYear) query.academicYear = academicYear;

    if (isConnected) {
      try {
        return await MongoInspectionPackage.find(query).sort({ createdAt: -1 });
      } catch (err) {
        console.warn('[DB Error] InspectionPackage.findForTeacher fallback:', err.message);
      }
    }
    return memoryInspectionPackages
      .filter((p) => String(p.teacherId) === String(teacherId) && (!academicYear || p.academicYear === academicYear))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoInspectionPackage.findById(id);
      } catch (err) {
        console.warn('[DB Error] InspectionPackage.findById fallback:', err.message);
      }
    }
    return memoryInspectionPackages.find((p) => String(p._id || p.id) === String(id)) || null;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoInspectionPackage.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] InspectionPackage.deleteById fallback:', err.message);
      }
    }
    const idx = memoryInspectionPackages.findIndex(
      (p) => String(p._id || p.id) === String(id) && String(p.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryInspectionPackages.splice(idx, 1);
    return true;
  }
}

export default MongoInspectionPackage;
