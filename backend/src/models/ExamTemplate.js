import mongoose from 'mongoose';
import { getDBStatus } from '../config/db.js';

// Pre-configured Industry & Curriculum Presets
export const DEFAULT_EXAM_PRESETS = [
  {
    _id: 'preset_ai_nsqf_standard',
    templateName: 'AI / NSQF Official Examination Format (FA1 + FA2 + SA1 Term 1)',
    academicYear: '2026-2027',
    className: 'Class 9',
    subject: 'Artificial Intelligence',
    totalFinalMarks: 100,
    description: 'Exact replicate of Department AI/NSQF marks format: FA1 (50), FA2 (50), IA 20%, SA1 Theory (60->30), Practical (50: Hands-on 30 + Portfolio 10 + Viva 10), Total 100.',
    version: 1,
    isPreset: true,
    components: [
      { code: 'FA1_ACT1', name: 'FA1 Activity 1', maxRaw: 15, finalMarks: 15, calculationMethod: 'direct', includeInTotal: false, order: 1 },
      { code: 'FA1_ACT2', name: 'FA1 Activity 2', maxRaw: 15, finalMarks: 15, calculationMethod: 'direct', includeInTotal: false, order: 2 },
      { code: 'FA1_TEST', name: 'FA1 Written Test (ಸಾ.ಪ)', maxRaw: 20, finalMarks: 20, calculationMethod: 'direct', includeInTotal: false, order: 3 },
      { code: 'FA1_TOTAL', name: 'FA1 Total (50)', maxRaw: 50, finalMarks: 50, calculationMethod: 'sum', dependencies: ['FA1_ACT1', 'FA1_ACT2', 'FA1_TEST'], includeInTotal: false, order: 4 },
      { code: 'FA2_ACT1', name: 'FA2 Activity 3', maxRaw: 15, finalMarks: 15, calculationMethod: 'direct', includeInTotal: false, order: 5 },
      { code: 'FA2_ACT2', name: 'FA2 Activity 4', maxRaw: 15, finalMarks: 15, calculationMethod: 'direct', includeInTotal: false, order: 6 },
      { code: 'FA2_TEST', name: 'FA2 Written Test (ಸಾ.ಪ)', maxRaw: 20, finalMarks: 20, calculationMethod: 'direct', includeInTotal: false, order: 7 },
      { code: 'FA2_TOTAL', name: 'FA2 Total (50)', maxRaw: 50, finalMarks: 50, calculationMethod: 'sum', dependencies: ['FA2_ACT1', 'FA2_ACT2', 'FA2_TEST'], includeInTotal: false, order: 8 },
      { code: 'FA_AGG', name: 'FA1 + FA2 (100)', maxRaw: 100, finalMarks: 100, calculationMethod: 'sum', dependencies: ['FA1_TOTAL', 'FA2_TOTAL'], includeInTotal: false, order: 9 },
      { code: 'IA_20', name: 'Internal Assessment (20%)', maxRaw: 100, finalMarks: 20, calculationMethod: 'proportional', dependencies: ['FA_AGG'], includeInTotal: true, order: 10 },
      { code: 'SA1_TH_RAW', name: 'Theory Raw (60)', maxRaw: 60, finalMarks: 60, calculationMethod: 'direct', includeInTotal: false, order: 11 },
      { code: 'SA1_TH_30', name: 'Theory (Scaled to 30)', maxRaw: 60, finalMarks: 30, calculationMethod: 'proportional', dependencies: ['SA1_TH_RAW'], includeInTotal: true, order: 12 },
      { code: 'SA1_PR_HANDS', name: 'Hands-on Skill', maxRaw: 30, finalMarks: 30, calculationMethod: 'direct', includeInTotal: false, order: 13 },
      { code: 'SA1_PR_PORT', name: 'Portfolio', maxRaw: 10, finalMarks: 10, calculationMethod: 'direct', includeInTotal: false, order: 14 },
      { code: 'SA1_PR_VIVA', name: 'Viva Voce', maxRaw: 10, finalMarks: 10, calculationMethod: 'direct', includeInTotal: false, order: 15 },
      { code: 'SA1_PR_TOTAL', name: 'Practical Total (50)', maxRaw: 50, finalMarks: 50, calculationMethod: 'sum', dependencies: ['SA1_PR_HANDS', 'SA1_PR_PORT', 'SA1_PR_VIVA'], includeInTotal: true, order: 16 },
    ],
    gradingRules: {
      minPassPercentage: 35,
      distinctionPercentage: 75,
      roundingRule: 'round',
      gradeBoundaries: [
        { grade: 'A+', minPercentage: 90 },
        { grade: 'A', minPercentage: 80 },
        { grade: 'B+', minPercentage: 70 },
        { grade: 'B', minPercentage: 60 },
        { grade: 'C+', minPercentage: 50 },
        { grade: 'C', minPercentage: 35 },
        { grade: 'NA', minPercentage: 0 },
      ],
    },
  },
  {
    _id: 'preset_nsqf_ites',
    templateName: 'NSQF ITes Skill Assessment (30 Theory + 50 Practical + 20 IA)',
    academicYear: '2026-2027',
    className: 'Class 10',
    subject: 'Information Technology (ITes)',
    totalFinalMarks: 100,
    description: 'Standard NSQF ITes assessment: Theory (scaled 60->30), Practical (50 direct), and 4 Internal components totaling 20 marks.',
    version: 1,
    isPreset: true,
    components: [
      {
        code: 'TH',
        name: 'Theory Examination',
        maxRaw: 60,
        finalMarks: 30,
        calculationMethod: 'proportional',
        dependencies: [],
        minPassMarks: 10.5, // 35% of 30
        includeInTotal: true,
        order: 1,
      },
      {
        code: 'PR',
        name: 'Practical Lab & Project',
        maxRaw: 50,
        finalMarks: 50,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 17.5, // 35% of 50
        includeInTotal: true,
        order: 2,
      },
      {
        code: 'ATT',
        name: 'Attendance & Punctuality',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 3,
      },
      {
        code: 'BEH',
        name: 'Behaviour & Classroom Conduct',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 4,
      },
      {
        code: 'ASSG',
        name: 'Assignment & Portfolio',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 5,
      },
      {
        code: 'VIVA',
        name: 'Oral Viva-Voce',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 6,
      },
    ],
    gradingRules: {
      minPassPercentage: 35,
      distinctionPercentage: 75,
      roundingRule: 'decimal_1',
      gradeBoundaries: [
        { grade: 'A+', minPercentage: 90 },
        { grade: 'A', minPercentage: 80 },
        { grade: 'B+', minPercentage: 70 },
        { grade: 'B', minPercentage: 60 },
        { grade: 'C', minPercentage: 50 },
        { grade: 'D', minPercentage: 35 },
        { grade: 'F', minPercentage: 0 },
      ],
    },
  },
  {
    _id: 'preset_cbse_80_20',
    templateName: 'CBSE Secondary Standard (80 Theory + 20 Internal Assessment)',
    academicYear: '2026-2027',
    className: 'Class 10',
    subject: 'General Science',
    totalFinalMarks: 100,
    description: 'Standard 80-mark board theory exam combined with 20-mark periodic internal assessment.',
    version: 1,
    isPreset: true,
    components: [
      {
        code: 'TH',
        name: 'Board Theory Examination',
        maxRaw: 80,
        finalMarks: 80,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 26,
        includeInTotal: true,
        order: 1,
      },
      {
        code: 'PA',
        name: 'Periodic Tests (Best of 2)',
        maxRaw: 10,
        finalMarks: 10,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 2,
      },
      {
        code: 'MA',
        name: 'Multiple Assessment & Quizzes',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 3,
      },
      {
        code: 'PORT',
        name: 'Student Portfolio & Lab Record',
        maxRaw: 5,
        finalMarks: 5,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: true,
        order: 4,
      },
    ],
    gradingRules: {
      minPassPercentage: 33,
      distinctionPercentage: 75,
      roundingRule: 'round',
      gradeBoundaries: [
        { grade: 'A1', minPercentage: 91 },
        { grade: 'A2', minPercentage: 81 },
        { grade: 'B1', minPercentage: 71 },
        { grade: 'B2', minPercentage: 61 },
        { grade: 'C1', minPercentage: 51 },
        { grade: 'C2', minPercentage: 41 },
        { grade: 'D', minPercentage: 33 },
        { grade: 'E', minPercentage: 0 },
      ],
    },
  },
  {
    _id: 'preset_unit_test_best_of',
    templateName: 'Continuous Evaluation (Best 2 of 3 Unit Tests)',
    academicYear: '2026-2027',
    className: 'Class 9',
    subject: 'Mathematics',
    totalFinalMarks: 50,
    description: '3 Unit tests of 25 marks each; final score calculates the sum of the best 2 unit tests.',
    version: 1,
    isPreset: true,
    components: [
      {
        code: 'UT1',
        name: 'Unit Test 1',
        maxRaw: 25,
        finalMarks: 25,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: false, // excluded from direct sum because BEST_2 calculates it
        order: 1,
      },
      {
        code: 'UT2',
        name: 'Unit Test 2',
        maxRaw: 25,
        finalMarks: 25,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: false,
        order: 2,
      },
      {
        code: 'UT3',
        name: 'Unit Test 3',
        maxRaw: 25,
        finalMarks: 25,
        calculationMethod: 'direct',
        dependencies: [],
        minPassMarks: 0,
        includeInTotal: false,
        order: 3,
      },
      {
        code: 'BEST_2',
        name: 'Best 2 Unit Tests Combined',
        maxRaw: 50,
        finalMarks: 50,
        calculationMethod: 'best_of',
        bestOfCount: 2,
        dependencies: ['UT1', 'UT2', 'UT3'],
        minPassMarks: 18,
        includeInTotal: true,
        order: 4,
      },
    ],
    gradingRules: {
      minPassPercentage: 35,
      distinctionPercentage: 75,
      roundingRule: 'round',
      gradeBoundaries: [
        { grade: 'A+', minPercentage: 90 },
        { grade: 'A', minPercentage: 80 },
        { grade: 'B', minPercentage: 70 },
        { grade: 'C', minPercentage: 50 },
        { grade: 'D', minPercentage: 35 },
        { grade: 'F', minPercentage: 0 },
      ],
    },
  },
];

const memoryTemplates = [...DEFAULT_EXAM_PRESETS];

const examComponentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    maxRaw: { type: Number, required: true, min: 1 },
    finalMarks: { type: Number, required: true, min: 0 },
    calculationMethod: {
      type: String,
      enum: ['direct', 'proportional', 'percentage', 'weighted_percentage', 'sum', 'best_of', 'average', 'formula'],
      default: 'direct',
    },
    dependencies: [{ type: String, trim: true, uppercase: true }],
    formula: { type: String, default: '' },
    bestOfCount: { type: Number, default: 1 },
    minPassMarks: { type: Number, default: 0 },
    includeInTotal: { type: Boolean, default: true },
    order: { type: Number, default: 1 },
  },
  { _id: false }
);

const examTemplateSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    templateName: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2026-2027',
    },
    className: {
      type: String,
      default: 'All Classes',
    },
    subject: {
      type: String,
      default: 'General',
    },
    totalFinalMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    description: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
    isPreset: {
      type: Boolean,
      default: false,
    },
    components: [examComponentSchema],
    gradingRules: {
      minPassPercentage: { type: Number, default: 35 },
      distinctionPercentage: { type: Number, default: 75 },
      roundingRule: {
        type: String,
        enum: ['round', 'floor', 'ceil', 'decimal_1', 'decimal_2', 'none'],
        default: 'decimal_1',
      },
      gradeBoundaries: [
        {
          grade: { type: String, required: true },
          minPercentage: { type: Number, required: true },
        },
      ],
    },
  },
  { timestamps: true }
);

const MongoExamTemplate = mongoose.model('ExamTemplate', examTemplateSchema);

export class ExamTemplate {
  static async create(data) {
    const { isConnected } = getDBStatus();
    const payload = {
      ...data,
      version: 1,
      totalFinalMarks: Number(data.totalFinalMarks) || 100,
    };

    if (isConnected) {
      try {
        return await MongoExamTemplate.create(payload);
      } catch (err) {
        console.warn('[DB Error] ExamTemplate.create fallback:', err.message);
      }
    }

    const item = {
      _id: 'tmpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryTemplates.push(item);
    return item;
  }

  static async findById(id) {
    // Check presets first
    const preset = DEFAULT_EXAM_PRESETS.find((p) => p._id === id || String(p._id) === String(id));
    if (preset) return preset;

    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const found = await MongoExamTemplate.findById(id);
        if (found) return found;
      } catch (err) {
        console.warn('[DB Error] ExamTemplate.findById fallback:', err.message);
      }
    }
    return memoryTemplates.find((t) => String(t._id || t.id) === String(id)) || null;
  }

  static async findForTeacher(teacherId, filters = {}) {
    const { isConnected } = getDBStatus();
    const query = {
      $or: [{ teacherId }, { isPreset: true }, { teacherId: null }],
    };

    if (filters.className) query.className = filters.className;
    if (filters.subject) query.subject = filters.subject;

    if (isConnected) {
      try {
        const dbTemplates = await MongoExamTemplate.find(query).sort({ isPreset: -1, createdAt: -1 });
        // Merge preset fallbacks if DB has none
        if (dbTemplates.length > 0) return dbTemplates;
      } catch (err) {
        console.warn('[DB Error] ExamTemplate.findForTeacher fallback:', err.message);
      }
    }

    return memoryTemplates
      .filter((t) => {
        if (t.isPreset) return true;
        if (!t.teacherId || String(t.teacherId) === String(teacherId)) return true;
        return false;
      })
      .sort((a, b) => (b.isPreset ? 1 : 0) - (a.isPreset ? 1 : 0));
  }

  static async updateById(id, teacherId, updateData) {
    const { isConnected } = getDBStatus();
    const current = await this.findById(id);
    const nextVersion = (current?.version || 1) + 1;

    const payload = {
      ...updateData,
      version: nextVersion,
      updatedAt: new Date(),
    };

    if (isConnected) {
      try {
        return await MongoExamTemplate.findOneAndUpdate(
          { _id: id, teacherId },
          payload,
          { new: true }
        );
      } catch (err) {
        console.warn('[DB Error] ExamTemplate.updateById fallback:', err.message);
      }
    }

    const idx = memoryTemplates.findIndex((t) => String(t._id || t.id) === String(id));
    if (idx === -1) return null;
    memoryTemplates[idx] = { ...memoryTemplates[idx], ...payload };
    return memoryTemplates[idx];
  }

  static async duplicate(id, teacherId, newName) {
    const original = await this.findById(id);
    if (!original) throw new Error('Template to duplicate not found');

    const copyData = {
      teacherId,
      templateName: newName || `${original.templateName} (Copy)`,
      academicYear: original.academicYear,
      className: original.className,
      subject: original.subject,
      totalFinalMarks: original.totalFinalMarks,
      description: original.description,
      components: JSON.parse(JSON.stringify(original.components || [])),
      gradingRules: JSON.parse(JSON.stringify(original.gradingRules || {})),
      isPreset: false,
    };

    return await this.create(copyData);
  }

  static async deleteById(id, teacherId) {
    const { isConnected } = getDBStatus();
    if (isConnected) {
      try {
        const res = await MongoExamTemplate.findOneAndDelete({ _id: id, teacherId });
        return !!res;
      } catch (err) {
        console.warn('[DB Error] ExamTemplate.deleteById fallback:', err.message);
      }
    }

    const idx = memoryTemplates.findIndex((t) => String(t._id || t.id) === String(id));
    if (idx !== -1 && !memoryTemplates[idx].isPreset) {
      memoryTemplates.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export default MongoExamTemplate;
