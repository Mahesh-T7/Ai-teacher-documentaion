import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';
import { loadCollection, saveCollection } from '../utils/localDiskStore.js';

const memoryStudents = loadCollection('students', []);
const persistStudents = () => saveCollection('students', memoryStudents);

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
      default: '',
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
    gender: {
      type: String,
      default: 'M',
      trim: true,
    },
    caste: {
      type: String,
      default: 'GEN',
      trim: true,
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
      admissionNumber: data.admissionNumber || '',
      classHandled: data.classHandled || (data.section ? `${data.className}-${data.section}` : data.className),
    };

    if (isConnected && mongoose.Types.ObjectId.isValid(payload.teacherId)) {
      try {
        return await MongoStudent.create(payload);
      } catch (err) {
        console.warn('[DB Error] Student.create fallback:', err.message);
        if (err.code === 11000) throw err;
      }
    }

    const item = {
      _id: 'stu_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStudents.push(item);
    persistStudents();
    return item;
  }

  static async findForClass(teacherId, className, section = 'A') {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(teacherId)) {
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

    if (isConnected && mongoose.Types.ObjectId.isValid(teacherId)) {
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
    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
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
    if (isConnected && mongoose.Types.ObjectId.isValid(id) && mongoose.Types.ObjectId.isValid(teacherId)) {
      try {
        return await MongoStudent.findOneAndUpdate(
          { _id: id, teacherId },
          { ...updateData, updatedAt: new Date() },
          { returnDocument: 'after' }
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
    persistStudents();
    return merged;
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected && mongoose.Types.ObjectId.isValid(id) && mongoose.Types.ObjectId.isValid(teacherId)) {
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
    persistStudents();
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

  /**
   * Sync an imported class roster cleanly for (teacherId, className, section).
   * mode='replace' replaces existing class students; mode='append' adds new ones.
   */
  static async syncClassRoster(teacherId, className, section = 'A', studentsList = [], mode = 'replace', schoolId = '') {
    const { isConnected } = getDBStatus();
    const normalizedSection = section || 'A';
    const usedRolls = new Set();

    const sanitized = (studentsList || [])
      .filter((s) => s && String(s.studentName || '').trim())
      .map((s, idx) => {
        let roll = parseInt(s.rollNumber, 10);
        if (isNaN(roll) || roll <= 0 || usedRolls.has(roll)) {
          roll = idx + 1;
          while (usedRolls.has(roll)) roll++;
        }
        usedRolls.add(roll);
        return {
          teacherId,
          schoolId,
          studentName: String(s.studentName).trim(),
          admissionNumber: String(s.admissionNumber || '').trim(),
          className,
          section: normalizedSection,
          classHandled: `${className}-${normalizedSection}`,
          rollNumber: roll,
          gender: s.gender || 'M',
          caste: s.caste || 'GEN',
          contactNumber: s.contactNumber || '',
          parentName: s.fatherName || s.parentName || '',
        };
      });

    if (isConnected && mongoose.Types.ObjectId.isValid(teacherId)) {
      try {
        if (mode === 'replace') {
          await MongoStudent.deleteMany({ teacherId, className, section: normalizedSection });
          if (sanitized.length === 0) return [];
          return await MongoStudent.insertMany(sanitized, { ordered: false });
        } else {
          const existing = await MongoStudent.find({ teacherId, className, section: normalizedSection });
          const existingRolls = new Set(existing.map((e) => Number(e.rollNumber)));
          let maxRoll = existing.reduce((m, e) => Math.max(m, Number(e.rollNumber) || 0), 0);
          const toInsert = sanitized.map((s) => {
            if (existingRolls.has(s.rollNumber)) {
              maxRoll += 1;
              return { ...s, rollNumber: maxRoll };
            }
            existingRolls.add(s.rollNumber);
            return s;
          });
          if (toInsert.length > 0) {
            await MongoStudent.insertMany(toInsert, { ordered: false });
          }
          return await MongoStudent.find({ teacherId, className, section: normalizedSection }).sort({ rollNumber: 1 });
        }
      } catch (err) {
        console.warn('[DB Error] Student.syncClassRoster fallback:', err.message);
      }
    }

    if (mode === 'replace') {
      for (let i = memoryStudents.length - 1; i >= 0; i--) {
        if (
          String(memoryStudents[i].teacherId) === String(teacherId) &&
          memoryStudents[i].className === className &&
          memoryStudents[i].section === normalizedSection
        ) {
          memoryStudents.splice(i, 1);
        }
      }
      const created = sanitized.map((item, idx) => ({
        _id: `stu_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      memoryStudents.push(...created);
      persistStudents();
      return created;
    } else {
      const existing = memoryStudents.filter(
        (s) => String(s.teacherId) === String(teacherId) && s.className === className && s.section === normalizedSection
      );
      const existingRolls = new Set(existing.map((e) => Number(e.rollNumber)));
      let maxRoll = existing.reduce((m, e) => Math.max(m, Number(e.rollNumber) || 0), 0);
      sanitized.forEach((s, idx) => {
        let roll = s.rollNumber;
        if (existingRolls.has(roll)) {
          maxRoll += 1;
          roll = maxRoll;
        }
        existingRolls.add(roll);
        memoryStudents.push({
          _id: `stu_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          ...s,
          rollNumber: roll,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      persistStudents();
      return memoryStudents
        .filter((s) => String(s.teacherId) === String(teacherId) && s.className === className && s.section === normalizedSection)
        .sort((a, b) => a.rollNumber - b.rollNumber);
    }
  }
}

export default MongoStudent;
