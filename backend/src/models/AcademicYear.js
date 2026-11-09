import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryAcademicYears = [
  {
    _id: 'ay_2026_2027',
    yearName: '2026-2027',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2027-03-31'),
    isCurrent: true,
  },
];

const academicYearSchema = new mongoose.Schema(
  {
    yearName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
    schoolId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const MongoAcademicYear = mongoose.model('AcademicYear', academicYearSchema);

export class AcademicYear {
  static async getCurrent() {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const found = await MongoAcademicYear.findOne({ isCurrent: true });
        if (found) return found;
      } catch (err) {
        console.warn('[DB Error] AcademicYear.getCurrent fallback:', err.message);
      }
    }
    return memoryAcademicYears.find((y) => y.isCurrent) || memoryAcademicYears[0];
  }

  static async list() {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoAcademicYear.find().sort({ startDate: -1 });
      } catch (err) {
        console.warn('[DB Error] AcademicYear.list fallback:', err.message);
      }
    }
    return memoryAcademicYears;
  }
}

export default MongoAcademicYear;
