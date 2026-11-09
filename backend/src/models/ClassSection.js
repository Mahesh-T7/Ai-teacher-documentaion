import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryClasses = [
  { _id: 'cls_1', className: 'Class 9', section: 'A', classHandled: 'Class 9-A', room: 'Room 101' },
  { _id: 'cls_2', className: 'Class 9', section: 'B', classHandled: 'Class 9-B', room: 'Room 102' },
  { _id: 'cls_3', className: 'Class 10', section: 'A', classHandled: 'Class 10-A', room: 'Room 201' },
  { _id: 'cls_4', className: 'Class 10', section: 'B', classHandled: 'Class 10-B', room: 'Room 202' },
  { _id: 'cls_5', className: 'Class 11', section: 'A', classHandled: 'Class 11-A', room: 'Science Block 1' },
  { _id: 'cls_6', className: 'Class 12', section: 'A', classHandled: 'Class 12-A', room: 'Science Block 2' },
];

const classSectionSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
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
    room: {
      type: String,
      default: 'Main Classroom',
      trim: true,
    },
    schoolId: {
      type: String,
      default: '',
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

classSectionSchema.pre('save', function (next) {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
  next();
});

const MongoClassSection = mongoose.model('ClassSection', classSectionSchema);

export class ClassSection {
  static async list() {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoClassSection.find().sort({ className: 1, section: 1 });
      } catch (err) {
        console.warn('[DB Error] ClassSection.list fallback:', err.message);
      }
    }
    return memoryClasses;
  }
}

export default MongoClassSection;
