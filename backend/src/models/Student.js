import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

const memoryStudents = [];

const studentSchema = new mongoose.Schema(
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
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
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
      index: true,
    },
    classHandled: {
      type: String,
      trim: true,
    },
    rollNumber: {
      type: Number,
      required: [true, 'Roll number is required'],
    },
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    parentName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

studentSchema.index({ teacherId: 1, className: 1, section: 1, rollNumber: 1 }, { unique: true });

studentSchema.pre('save', function () {
  if (!this.classHandled) {
    this.classHandled = this.section ? `${this.className}-${this.section}` : this.className;
  }
});

const MongoStudent = mongoose.model('Student', studentSchema);

export class Student {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const payload = {
      ...data,
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
    };

    if (isConnected) {
      try {
        return await MongoStudent.create(payload);
      } catch (err) {
        console.warn('[DB Error] Student.create fallback:', err.message);
        throw err;
      }
    }

    const item = {
      _id: 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStudents.push(item);
    return item;
  }

  static async findForClass(teacherId, className, section = 'A') {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoStudent.find({ teacherId, className, section }).sort({ rollNumber: 1 });
      } catch (err) {
        console.warn('[DB Error] Student.findForClass fallback:', err.message);
      }
    }
    return memoryStudents
      .filter((s) => String(s.teacherId) === String(teacherId) && s.className === className && s.section === section)
      .sort((a, b) => a.rollNumber - b.rollNumber);
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = { teacherId };
    if (filters.className) query.className = filters.className;
    if (filters.section) query.section = filters.section;
    if (filters.classHandled) query.classHandled = filters.classHandled;

    if (isConnected) {
      try {
        return await MongoStudent.find(query).sort({ className: 1, section: 1, rollNumber: 1 });
      } catch (err) {
        console.warn('[DB Error] Student.findForTeacher fallback:', err.message);
      }
    }

    return memoryStudents
      .filter((s) => {
        if (String(s.teacherId) !== String(teacherId)) return false;
        if (filters.className && s.className !== filters.className) return false;
        if (filters.section && s.section !== filters.section) return false;
        if (filters.classHandled && s.classHandled !== filters.classHandled) return false;
        return true;
      })
      .sort((a, b) => a.rollNumber - b.rollNumber);
  }

  static async findById(id) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoStudent.findById(id);
      } catch (err) {
        console.warn('[DB Error] Student.findById fallback:', err.message);
      }
    }
    return memoryStudents.find((s) => String(s._id || s.id) === String(id)) || null;
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        return await MongoStudent.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] Student.updateById fallback:', err.message);
        throw err;
      }
    }
    const idx = memoryStudents.findIndex(
      (s) => String(s._id || s.id) === String(id) && String(s.teacherId) === String(teacherId)
    );
    if (idx === -1) return null;
    const merged = { ...memoryStudents[idx], ...updateData, updatedAt: new Date() };
    memoryStudents[idx] = merged;
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoStudent.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] Student.deleteById fallback:', err.message);
      }
    }
    const idx = memoryStudents.findIndex(
      (s) => String(s._id || s.id) === String(id) && String(s.teacherId) === String(teacherId)
    );
    if (idx === -1) return false;
    memoryStudents.splice(idx, 1);
    return true;
  }

  static async bulkInsert(studentsData) {
    const results = [];
    for (const item of studentsData) {
      const created = await this.create(item);
      results.push(created);
    }
    return results;
  }
}

export default MongoStudent;
