import multer from 'multer';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { ExamRecord } from '../models/ExamRecord.js';
import { ExamTemplate } from '../models/ExamTemplate.js';
import { Student } from '../models/Student.js';
import {
  generateReportCardPdf,
  generateClassRegisterPdf,
  generateClassRegisterExcel,
  generateBulkReportCardsPdf,
  generateAiNsqfExcelWorkbook,
} from '../services/examReportService.js';
import { calculateStudentMarksResult, calculateExamStatistics } from '../utils/marksCalculationEngine.js';

export const uploadExcelMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const sanitizeFileName = (str) => (str || 'Exam').replace(/[^a-zA-Z0-9_\-]/g, '_');

// @desc    Get all exam records for teacher
// @route   GET /api/exams/records
// @access  Private (Teacher)
export const getExamRecords = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { className, section, subject, status, academicYear } = req.query;

    const records = await ExamRecord.findForTeacher(teacherId, {
      className,
      section,
      subject,
      status,
      academicYear,
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam record by ID
// @route   GET /api/exams/records/:id
// @access  Private (Teacher)
export const getExamRecordById = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new exam record from template and populate students
// @route   POST /api/exams/records
// @access  Private (Teacher)
export const createExamRecord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      templateId,
      examTitle,
      academicYear = '2026-2027',
      className,
      section = 'A',
      subject,
      examDate = new Date(),
      initialStudents,
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Please select an examination template.' });
    }
    if (!examTitle || !examTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide an examination title.' });
    }
    if (!className || !subject) {
      return res.status(400).json({ success: false, message: 'Class name and subject are required.' });
    }

    // Retrieve template to snapshot it
    const template = await ExamTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Selected examination template not found.' });
    }

    const templateSnapshot = template.toObject ? template.toObject() : JSON.parse(JSON.stringify(template));

    // Determine students list
    let students = [];
    if (Array.isArray(initialStudents) && initialStudents.length > 0) {
      students = initialStudents;
    } else {
      // Auto-load students from class roster
      const classStudents = await Student.findForClass(teacherId, className, section);
      if (classStudents && classStudents.length > 0) {
        students = classStudents.map((s, idx) => ({
          studentId: s._id || s.id || `stu_${idx + 1}`,
          studentName: s.studentName,
          admissionNumber: s.admissionNumber || '',
          rollNumber: s.rollNumber !== undefined ? s.rollNumber : idx + 1,
          componentMarks: {},
          totalRaw: 0,
          totalFinal: 0,
          percentage: 0,
          grade: 'F',
          isPass: false,
          isDistinction: false,
          isEntirelyAbsent: false,
          remarks: '',
        }));
      }
    }

    const record = await ExamRecord.create({
      teacherId,
      templateId,
      templateSnapshot,
      examTitle: examTitle.trim(),
      academicYear,
      className,
      section,
      subject,
      examDate,
      status: 'Draft',
      studentMarks: students,
      finalizedBy: req.user.name || req.user.email || 'Teacher',
    });

    res.status(201).json({
      success: true,
      message: 'Examination record initialized successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update marks, save draft or update exam record
// @route   PUT /api/exams/records/:id
// @access  Private (Teacher)
export const updateExamRecord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const userIdentifier = req.user.name || req.user.email || 'Teacher';

    const updated = await ExamRecord.updateById(req.params.id, teacherId, req.body, userIdentifier);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Examination record not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Examination record updated successfully.',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update examination record.',
    });
  }
};

// @desc    Finalize and lock exam record
// @route   POST /api/exams/records/:id/finalize
// @access  Private (Teacher)
export const finalizeExamRecord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const userIdentifier = req.user.name || req.user.email || 'Teacher';

    const updated = await ExamRecord.updateById(
      req.params.id,
      teacherId,
      { status: 'Finalized' },
      userIdentifier
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Examination marks finalized and locked successfully.',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to finalize examination record.',
    });
  }
};

// @desc    Unlock finalized exam record (Admin / Authorized override)
// @route   POST /api/exams/records/:id/unlock
// @access  Private (Teacher / Admin)
export const unlockExamRecord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const userIdentifier = req.user.name || req.user.email || 'Teacher';

    const updated = await ExamRecord.updateById(
      req.params.id,
      teacherId,
      { status: 'Draft', forceUnlock: true },
      userIdentifier
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Examination record unlocked for editing.',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to unlock examination record.',
    });
  }
};

// @desc    Delete exam record (only if Draft)
// @route   DELETE /api/exams/records/:id
// @access  Private (Teacher)
export const deleteExamRecord = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const deleted = await ExamRecord.deleteById(req.params.id, teacherId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Examination record not found or unauthorized.' });
    }

    res.status(200).json({
      success: true,
      message: 'Examination record deleted successfully.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete examination record.',
    });
  }
};

// @desc    Export Class Marks Register as PDF
// @route   GET /api/exams/records/:id/export/pdf
// @access  Private (Teacher)
export const exportClassRegisterPdf = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    const teacherInfo = {
      name: req.user.fullName || req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Senior Faculty',
    };

    const pdfBuffer = await generateClassRegisterPdf({ examRecord: record, teacherInfo });
    const fileName = `Class_Register_${sanitizeFileName(record.examTitle)}_${record.className}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Preview or Export Class Marks Register PDF from live in-memory data
// @route   POST /api/exams/preview-register-pdf
// @access  Private (Teacher)
export const previewClassRegisterPdf = async (req, res, next) => {
  try {
    const { examRecord } = req.body;
    if (!examRecord) {
      return res.status(400).json({ success: false, message: 'No examination record provided for PDF preview.' });
    }

    console.log('[previewClassRegisterPdf] Received request, student count:', examRecord.studentMarks?.length);

    const teacherInfo = {
      name: req.user.fullName || req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Senior Faculty',
    };

    const pdfBuffer = await generateClassRegisterPdf({ examRecord, teacherInfo });
    console.log('[previewClassRegisterPdf] Generated PDF length:', pdfBuffer?.length);
    const fileName = `Class_Register_${sanitizeFileName(examRecord.examTitle || 'Marks_Register')}_${examRecord.className || 'Class'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[previewClassRegisterPdf Error]:', error);
    next(error);
  }
};

// @desc    Export Class Marks Register as Excel (.xlsx)
// @route   GET /api/exams/records/:id/export/excel
// @access  Private (Teacher)
export const exportClassRegisterExcel = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    const teacherInfo = {
      name: req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const excelBuffer = await generateClassRegisterExcel({ examRecord: record, teacherInfo });
    const fileName = `Class_Register_${sanitizeFileName(record.examTitle)}_${record.className}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Individual Student Report Card PDF
// @route   GET /api/exams/records/:id/students/:studentId/report-card
// @access  Private (Teacher)
export const exportStudentReportCardPdf = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    const teacherInfo = {
      name: req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const pdfBuffer = await generateReportCardPdf({
      examRecord: record,
      studentId: req.params.studentId,
      teacherInfo,
    });

    const fileName = `ReportCard_Roll_${req.params.studentId}_${sanitizeFileName(record.examTitle)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Bulk Student Report Cards as single combined PDF
// @route   GET /api/exams/records/:id/export/bulk-report-cards
// @access  Private (Teacher)
export const exportBulkReportCardsPdf = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    const teacherInfo = {
      name: req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const pdfBuffer = await generateBulkReportCardsPdf({ examRecord: record, teacherInfo });
    const fileName = `All_ReportCards_${sanitizeFileName(record.examTitle)}_${record.className}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Exact Replica AI / NSQF Excel Workbook (.xlsx)
// @route   GET /api/exams/records/:id/export/nsqf-excel
// @access  Private (Teacher)
export const exportNsqfExcelFormat = async (req, res, next) => {
  try {
    const record = await ExamRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Examination record not found.' });
    }

    const teacherInfo = {
      name: req.user.name || 'Subject Teacher',
      schoolName: req.user.schoolName || 'Government / Model Secondary School',
      designation: req.user.designation || 'Vocational Trainer / TGT',
    };

    const excelBuffer = await generateAiNsqfExcelWorkbook({ examRecord: record, teacherInfo });
    const fileName = `AI_NSQF_Marks_Entry_${sanitizeFileName(record.className)}_${record.section || 'A'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Download Official Excel Format Template (.xlsx)
// @route   GET /api/exams/template-excel
// @access  Private (Teacher)
export const downloadExcelFormatTemplate = async (req, res, next) => {
  try {
    const mockRecord = {
      className: req.query.className || 'Class 9',
      section: req.query.section || 'A',
      examTitle: 'AI NSQF Marks Entry Sheet',
      academicYear: '2026-2027',
      studentMarks: Array.from({ length: 40 }, (_, i) => ({
        rollNumber: i + 1,
        studentName: i === 0 ? 'Sample Student (abb / XYZ)' : `Student ${i + 1}`,
        gender: i % 2 === 0 ? 'F' : 'M',
        caste: 'GEN',
        componentMarks: {
          FA1_ACT1: { rawMarks: i === 0 ? 12 : '' },
          FA1_ACT2: { rawMarks: i === 0 ? 15 : '' },
          FA1_TEST: { rawMarks: i === 0 ? 12 : '' },
          FA2_ACT1: { rawMarks: i === 0 ? 15 : '' },
          FA2_ACT2: { rawMarks: i === 0 ? 5 : '' },
          FA2_TEST: { rawMarks: i === 0 ? 5 : '' },
          SA1_TH_RAW: { rawMarks: i === 0 ? 35 : '' },
          SA1_PR_HANDS: { rawMarks: i === 0 ? 25 : '' },
          SA1_PR_PORT: { rawMarks: i === 0 ? 10 : '' },
          SA1_PR_VIVA: { rawMarks: i === 0 ? 10 : '' },
        },
      })),
    };

    const excelBuffer = await generateAiNsqfExcelWorkbook({
      examRecord: mockRecord,
      teacherInfo: {
        name: req.user.name || 'Subject Teacher',
        schoolName: req.user.schoolName || 'Government / Model Secondary School',
      },
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="AI_NSQF_Marks_Entry_Template.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

// Helper: Extract clean string value from Excel cell (handling formulas, richText, objects)
const cleanCellValue = (cell) => {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) return String(v.result).trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.richText) return v.richText.map((t) => t.text).join('').trim();
    if (v.formula) return String(v.result || '').trim();
    return '';
  }
  return String(v).trim();
};

// Helper: Extract numeric mark or attendance string from cell
const getNumericCellValue = (cell) => {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) {
      const n = Number(v.result);
      return isNaN(n) ? '' : n;
    }
    return '';
  }
  const clean = String(v).trim().toUpperCase();
  if (clean === 'AB' || clean === 'A' || clean === 'ABSENT') return 'AB';
  if (clean === 'EX' || clean === 'EXEMPT') return 'EX';
  const num = Number(clean);
  return isNaN(num) ? '' : num;
};

// Helper: Detect Class and Section from sheet name and top title cells
const extractClassAndSection = (sheetName, sheet) => {
  const clean = (sheetName || '').trim();
  let className = '';
  let section = '';

  // 1. Detect Class from Sheet Name (e.g. 9th, Class 9, Std 10)
  const classMatch = clean.match(/(?:(?:class|standard|std)\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s*(?:standard|std|class)?)/i);
  if (classMatch) {
    className = `Class ${classMatch[1] || classMatch[2]}`;
  }

  // 2. Detect Section from Sheet Name (e.g. 9th A, Section B, Students A)
  const secMatch = clean.match(/(?:section[\s_:-]*([A-Za-z])\b|[\s_-]+([A-Za-z])\b|(?:\d+)(?:st|nd|rd|th)?([A-Za-z])\b)/i);
  if (secMatch) {
    const rawSec = (secMatch[1] || secMatch[2] || secMatch[3] || '').toUpperCase();
    if (['A', 'B', 'C', 'D', 'E', 'F'].includes(rawSec)) {
      if (!clean.match(new RegExp('\\b' + rawSec + '(?:onsolidated|etails|tudents)\\b', 'i'))) {
        section = rawSec;
      }
    }
  }

  // 3. Scan first 5 rows of sheet for explicit labels: e.g. "9th Standard – Section A"
  if (sheet) {
    for (let r = 1; r <= Math.min(sheet.rowCount, 5); r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= Math.min(sheet.columnCount, 8); c++) {
        const text = cleanCellValue(row.getCell(c));
        if (!text) continue;

        if (!className) {
          const cm = text.match(/(?:(?:class|standard|std)\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s*(?:standard|std|class)?)/i);
          if (cm) className = `Class ${cm[1] || cm[2]}`;
        }
        if (!section) {
          const sm = text.match(/section[\s_:-]*([A-Za-z])\b/i);
          if (sm && ['A', 'B', 'C', 'D', 'E', 'F'].includes(sm[1].toUpperCase())) {
            section = sm[1].toUpperCase();
          }
        }
      }
    }
  }

  return {
    className: className || 'Class 9',
    section: section || 'A',
  };
};

// @desc    Import Marks & Students from uploaded Excel (.xlsx) file
// @route   POST /api/exams/import-excel
// @access  Private (Teacher)
export const importExcelMarks = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx).' });
    }

    if (req.file.buffer.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded Excel file is empty or corrupted (file size is too small). Please upload a valid .xlsx workbook.',
      });
    }

    const isZip =
      req.file.buffer.length >= 4 &&
      req.file.buffer[0] === 0x50 &&
      req.file.buffer[1] === 0x4b;

    if (!isZip) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is not a valid Microsoft Excel (.xlsx) workbook. If this is an older .xls, CSV, or HTML table, please open and re-save it as .xlsx before uploading.',
      });
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: `Unable to parse Excel workbook: ${parseErr.message || 'File archive corrupted'}. Please ensure it is a valid .xlsx file.`,
      });
    }

    // Filter out non-data sheets (readme, grade ref, instructions, consolidated summaries)
    const nonDataKeywords = ['read me', 'readme', 'grade ref', 'instructions', 'about', 'summary'];
    const eligibleSheets = workbook.worksheets.filter((sheet) => {
      const lower = sheet.name.toLowerCase();
      return !nonDataKeywords.some((kw) => lower.includes(kw)) && !lower.includes('consolidated');
    });

    if (eligibleSheets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data worksheet found in the uploaded workbook.' });
    }

    const sectionsData = {};

    for (const sheet of eligibleSheets) {
      const sheetName = sheet.name.trim();
      const { className, section } = extractClassAndSection(sheetName, sheet);
      const key = section;

      if (!sectionsData[key]) {
        sectionsData[key] = {
          className,
          section,
          sheetNames: [],
          students: [],
          hasMarks: false,
        };
      }
      sectionsData[key].sheetNames.push(sheetName);

      // Find Header Row in rows 1 to 10
      let headerRowIndex = -1;
      let colMap = {
        roll: -1,
        name: -1,
        fatherName: -1,
        combinedName: -1,
        gender: -1,
        caste: -1,
        admission: -1,
        fa1_act1: -1,
        fa1_act2: -1,
        fa1_test: -1,
        fa2_act1: -1,
        fa2_act2: -1,
        fa2_test: -1,
        sa1_th_raw: -1,
        sa1_pr_hands: -1,
        sa1_pr_port: -1,
        sa1_pr_viva: -1,
      };

      // Check if standard NSQF layout across rows 1 to 6
      let isStandardNsqf = false;
      for (let r = 1; r <= Math.min(sheet.rowCount, 6); r++) {
        for (let c = 1; c <= Math.min(sheet.columnCount, 25); c++) {
          const val = cleanCellValue(sheet.getRow(r).getCell(c));
          if (val.includes('FA 1') || val.includes('ಕ್ರ.ಸಂ') || val.includes('Activity 1') || val.includes('Theory')) {
            isStandardNsqf = true;
            break;
          }
        }
        if (isStandardNsqf) break;
      }

      if (isStandardNsqf) {
        colMap.roll = 1;
        colMap.combinedName = 2;
        colMap.gender = 3;
        colMap.caste = 4;
        colMap.fa1_act1 = 5;
        colMap.fa1_act2 = 6;
        colMap.fa1_test = 7;
        colMap.fa2_act1 = 10;
        colMap.fa2_act2 = 11;
        colMap.fa2_test = 12;
        colMap.sa1_th_raw = 17;
        colMap.sa1_pr_hands = 19;
        colMap.sa1_pr_port = 20;
        colMap.sa1_pr_viva = 21;

        // Find first roll 1
        for (let r = 4; r <= Math.min(sheet.rowCount, 10); r++) {
          const val = cleanCellValue(sheet.getRow(r).getCell(1));
          if (val === '1' || val === 1) {
            headerRowIndex = r - 1;
            break;
          }
        }
        if (headerRowIndex === -1) headerRowIndex = 4;
      } else {
        // Dynamic Column Detection (supporting English & Kannada column titles)
        for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
          const row = sheet.getRow(r);
          let found = false;

          for (let c = 1; c <= Math.min(sheet.columnCount, 30); c++) {
            const val = cleanCellValue(row.getCell(c)).toLowerCase();
            if (!val) continue;

            if (val.includes('sl. no') || val.includes('sl no') || val.includes('sl.no') || val.includes('ಕ್ರ.ಸಂ') || val.includes('roll no')) {
              if (colMap.roll === -1) colMap.roll = c;
              found = true;
            }
            if (val.includes('student / father') || val.includes('ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು / ತಂದೆಯ ಹೆಸರು') || val.includes('student name / father name')) {
              colMap.combinedName = c;
              found = true;
            } else if (val.includes('student name') || val.includes('ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು') || val.includes('candidate name')) {
              colMap.name = c;
              found = true;
            } else if (val.includes('father name') || val.includes('ತಂದೆಯ ಹೆಸರು')) {
              colMap.fatherName = c;
              found = true;
            }
            if (val.includes('gender') || val.includes('sex') || val.includes('ಲಿಂಗ')) {
              if (colMap.gender === -1) colMap.gender = c;
              found = true;
            }
            if (val.includes('caste') || val.includes('cat') || val.includes('ಜಾತಿ')) {
              if (colMap.caste === -1) colMap.caste = c;
              found = true;
            }
            if (val.includes('sts') || val.includes('admission')) {
              if (colMap.admission === -1) colMap.admission = c;
              found = true;
            }
          }

          if (found && (colMap.name !== -1 || colMap.combinedName !== -1 || colMap.roll !== -1)) {
            headerRowIndex = r;
            const nextVal = cleanCellValue(sheet.getRow(r + 1).getCell(1)).toLowerCase();
            if (nextVal.includes('ಕ್ರ.ಸಂ') || nextVal.includes('sl')) {
              headerRowIndex = r + 1;
            }
          }
        }
      }

      if (headerRowIndex === -1) headerRowIndex = 4;
      if (colMap.roll === -1) colMap.roll = 1;
      if (colMap.name === -1 && colMap.combinedName === -1) colMap.combinedName = 2;

      const dataStartRow = headerRowIndex + 1;
      const extractedStudents = [];

      for (let r = dataStartRow; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);

        const rollRaw = cleanCellValue(row.getCell(colMap.roll));
        const combinedRaw = colMap.combinedName > 0 ? cleanCellValue(row.getCell(colMap.combinedName)) : '';
        const nameRaw = colMap.name > 0 ? cleanCellValue(row.getCell(colMap.name)) : '';
        const fatherRaw = colMap.fatherName > 0 ? cleanCellValue(row.getCell(colMap.fatherName)) : '';
        const genderRaw = colMap.gender > 0 ? cleanCellValue(row.getCell(colMap.gender)) : '';
        const casteRaw = colMap.caste > 0 ? cleanCellValue(row.getCell(colMap.caste)) : '';
        const admRaw = colMap.admission > 0 ? cleanCellValue(row.getCell(colMap.admission)) : '';

        // Clean out dummy empty concatenation formulas like " /", "/", "  /  ", "-", ""
        const isCombinedDummy = !combinedRaw || /^[\s/\\-_,.]*$/.test(combinedRaw);
        const isNameDummy = !nameRaw || /^[\s/\\-_,.]*$/.test(nameRaw);

        if (isCombinedDummy && isNameDummy) {
          // Empty dummy placeholder row, skip it
          continue;
        }

        // Determine student and father names
        let studentName = '';
        let fatherName = fatherRaw;

        if (!isNameDummy) {
          studentName = nameRaw;
        } else if (!isCombinedDummy) {
          if (combinedRaw.includes('/')) {
            const parts = combinedRaw.split('/');
            studentName = parts[0].trim();
            if (!fatherName && parts[1]) fatherName = parts[1].trim();
          } else {
            studentName = combinedRaw;
          }
        }

        if (!studentName || /^[\s/\\-_,.]*$/.test(studentName)) continue;

        const rollNum = parseInt(rollRaw, 10) || extractedStudents.length + 1;

        // Gender normalization
        let gender = 'M';
        const gUpper = genderRaw.toUpperCase();
        if (gUpper.startsWith('F') || gUpper.includes('ಹೆಣ್ಣು')) gender = 'F';
        else if (gUpper.startsWith('M') || gUpper.includes('ಗಂಡು')) gender = 'M';
        else gender = rollNum % 2 === 0 ? 'F' : 'M';

        // Caste normalization
        let caste = casteRaw.toUpperCase().trim();
        if (!caste || caste === 'NULL' || caste === '/') caste = 'GEN';

        // Extract component marks safely
        const marks = {};
        const addMark = (code, col) => {
          if (col > 0) {
            const val = getNumericCellValue(row.getCell(col));
            if (val !== '') {
              marks[code] = { rawMarks: val };
            }
          }
        };

        addMark('FA1_ACT1', colMap.fa1_act1);
        addMark('FA1_ACT2', colMap.fa1_act2);
        addMark('FA1_TEST', colMap.fa1_test);
        addMark('FA2_ACT1', colMap.fa2_act1);
        addMark('FA2_ACT2', colMap.fa2_act2);
        addMark('FA2_TEST', colMap.fa2_test);
        addMark('SA1_TH_RAW', colMap.sa1_th_raw);
        addMark('SA1_PR_HANDS', colMap.sa1_pr_hands);
        addMark('SA1_PR_PORT', colMap.sa1_pr_port);
        addMark('SA1_PR_VIVA', colMap.sa1_pr_viva);

        const displayName = fatherName ? `${studentName} / ${fatherName}` : studentName;

        extractedStudents.push({
          studentId: `stu_import_${section}_${rollNum}_${Date.now()}`,
          rollNumber: rollNum,
          studentName: displayName,
          fatherName,
          displayName,
          gender,
          caste,
          admissionNumber: admRaw || `ADM-${rollNum}`,
          componentMarks: marks,
        });
      }

      // Merge into section record
      const currentSec = sectionsData[key];
      if (extractedStudents.length > 0) {
        if (currentSec.students.length === 0) {
          currentSec.students = extractedStudents;
          currentSec.hasMarks = isStandardNsqf;
        } else {
          // Merge with existing students from paired details or marks sheet
          extractedStudents.forEach((newS) => {
            const match = currentSec.students.find((s) => s.rollNumber === newS.rollNumber);
            if (match) {
              if (newS.fatherName && !match.fatherName) {
                match.fatherName = newS.fatherName;
                match.studentName = newS.studentName;
                match.displayName = newS.displayName;
              }
              if (Object.keys(newS.componentMarks).length > 0) {
                match.componentMarks = { ...match.componentMarks, ...newS.componentMarks };
                currentSec.hasMarks = true;
              }
            } else {
              currentSec.students.push(newS);
            }
          });
        }
      }
    }

    // Determine Primary Section and Class
    const availableSections = Object.keys(sectionsData).sort();
    let primarySection = availableSections[0] || 'A';
    // Prioritize section with students or marks
    for (const s of availableSections) {
      if (sectionsData[s].students.length > 0) {
        primarySection = s;
        break;
      }
    }

    const primaryClass = sectionsData[primarySection]?.className || 'Class 9';
    const primaryStudents = sectionsData[primarySection]?.students || [];

    res.status(200).json({
      success: true,
      message: `Successfully extracted ${primaryStudents.length} student(s). Detected Class: ${primaryClass}, Section: ${primarySection}.`,
      detectedClass: primaryClass,
      detectedSection: primarySection,
      availableSections,
      sections: sectionsData,
      sheetName: sectionsData[primarySection]?.sheetNames.join(', ') || 'Sheet1',
      count: primaryStudents.length,
      students: primaryStudents,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to parse uploaded Excel file.',
    });
  }
};

/**
 * Import Student Roster from Excel (.xlsx, .xls) or CSV
 * Automatically identifies worksheets, detects columns, cleans names, extracts valid students,
 * reports duplicates/missing data, and supports custom user column mapping.
 */
export const importStudentsFromExcel = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a valid student roster file (.xlsx, .xls, or .csv).',
      });
    }

    if (req.file.buffer.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty or corrupted (0 bytes or too small). Please upload a valid Excel or CSV file.',
      });
    }

    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true, raw: false });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: `Failed to read spreadsheet: ${err.message || 'File corrupted or format unrecognized'}. Please upload a valid .xlsx, .xls, or .csv file.`,
      });
    }

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded workbook does not contain any readable worksheets.',
      });
    }

    // Determine target sheet
    let targetSheetName = req.body.sheetName;
    if (!targetSheetName || !sheetNames.includes(targetSheetName)) {
      // Pick best candidate: look for sheet with 'student', 'roster', 'list', or first non-guide sheet
      const studentKeywordSheet = sheetNames.find((s) => {
        const lower = s.toLowerCase();
        return (
          (lower.includes('student') || lower.includes('roster') || lower.includes('name') || lower.includes('class')) &&
          !lower.includes('read') &&
          !lower.includes('guide') &&
          !lower.includes('grade')
        );
      });
      targetSheetName = studentKeywordSheet || sheetNames[0];
    }

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: `Worksheet "${targetSheetName}" could not be opened.`,
      });
    }

    // Convert to 2D array of rows
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Worksheet "${targetSheetName}" is empty. Please ensure it contains student rows.`,
      });
    }

    // Helper: clean text
    const cleanCell = (v) => String(v !== undefined && v !== null ? v : '').trim();

    // 1. Locate the Header Row (scanning rows 0 to 15)
    let headerRowIdx = -1;
    let detectedMapping = {
      rollIndex: -1,
      nameIndex: -1,
      admIndex: -1,
      genderIndex: -1,
      casteIndex: -1,
      fatherNameIndex: -1,
    };

    const rollKeywords = ['roll', 'r.no', 'rno', 'sl', 'sl.', 's.no', 'sr.no', 'serial', 'reg', 'reg.no', 'register', 'ಕ್ರ.ಸಂ'];
    const nameKeywords = ['student name', 'name of student', 'candidate name', "student's name", 'pupil name', 'student', 'name', 'ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು', 'ಹೆಸರು'];
    const admKeywords = ['adm', 'adm.', 'adm no', 'adm.no', 'admission', 'admission no', 'admission number', 'sts', 'sts no', 'sats', 'sats no', 'enrollment', 'enrolment', 'dakhala', 'ದಾಖಲಾತಿ ಸಂಖ್ಯೆ'];
    const fatherKeywords = ['father', 'father name', "father's name", 'parent', 'parent name', 'ತಂದೆಯ ಹೆಸರು'];
    const genderKeywords = ['gender', 'sex', 'm/f', 'ಲಿಂಗ'];
    const casteKeywords = ['caste', 'category', 'cat', 'ವರ್ಗ'];

    let bestScore = 0;

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let score = 0;
      let tempRoll = -1;
      let tempName = -1;
      let tempAdm = -1;
      let tempFather = -1;
      let tempGender = -1;
      let tempCaste = -1;

      row.forEach((cell, cIdx) => {
        const val = cleanCell(cell).toLowerCase();
        if (!val) return;

        if (tempName === -1 && nameKeywords.some((kw) => val === kw || (val.includes(kw) && !val.includes('father')))) {
          tempName = cIdx;
          score += 5;
        } else if (tempFather === -1 && fatherKeywords.some((kw) => val === kw || val.includes(kw))) {
          tempFather = cIdx;
          score += 2;
        } else if (tempRoll === -1 && rollKeywords.some((kw) => val === kw || val.includes(kw))) {
          tempRoll = cIdx;
          score += 3;
        } else if (tempAdm === -1 && admKeywords.some((kw) => val === kw || val.includes(kw))) {
          tempAdm = cIdx;
          score += 4;
        } else if (tempGender === -1 && genderKeywords.some((kw) => val === kw || val.includes(kw))) {
          tempGender = cIdx;
          score += 1;
        } else if (tempCaste === -1 && casteKeywords.some((kw) => val === kw || val.includes(kw))) {
          tempCaste = cIdx;
          score += 1;
        }
      });

      if (tempName !== -1 && score > bestScore) {
        bestScore = score;
        headerRowIdx = r;
        detectedMapping = {
          rollIndex: tempRoll,
          nameIndex: tempName,
          admIndex: tempAdm,
          genderIndex: tempGender,
          casteIndex: tempCaste,
          fatherNameIndex: tempFather,
        };
      }
    }

    // Fallback header detection if not found by keywords
    if (headerRowIdx === -1) {
      for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
        const row = rawRows[r];
        if (row && row.filter(Boolean).length >= 2) {
          headerRowIdx = r;
          detectedMapping = {
            rollIndex: 0,
            nameIndex: 1,
            admIndex: row.length > 2 ? 2 : -1,
            genderIndex: -1,
            casteIndex: -1,
            fatherNameIndex: -1,
          };
          break;
        }
      }
    }

    if (headerRowIdx === -1) {
      return res.status(400).json({
        success: false,
        message: 'Could not detect table header in the uploaded sheet. Please check the column headings.',
      });
    }

    const headerRow = rawRows[headerRowIdx] || [];
    const availableColumns = headerRow.map((cell, idx) => {
      let sample = '';
      for (let sr = headerRowIdx + 1; sr < Math.min(rawRows.length, headerRowIdx + 6); sr++) {
        const sVal = cleanCell(rawRows[sr]?.[idx]);
        if (sVal) {
          sample = sVal;
          break;
        }
      }
      return {
        index: idx,
        name: cleanCell(cell) || `Column ${idx + 1}`,
        sample,
      };
    }).filter((c) => c.name);

    // Apply manual user overrides if provided
    if (req.body.mapping) {
      try {
        const userMapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
        if (userMapping.nameIndex !== undefined && userMapping.nameIndex !== -1) {
          detectedMapping.nameIndex = Number(userMapping.nameIndex);
        }
        if (userMapping.rollIndex !== undefined) {
          detectedMapping.rollIndex = Number(userMapping.rollIndex);
        }
        if (userMapping.admIndex !== undefined) {
          detectedMapping.admIndex = Number(userMapping.admIndex);
        }
      } catch (_) {}
    }

    if (detectedMapping.nameIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Missing Student Name column in the uploaded Excel sheet. Please select a valid column for student names.',
        sheetNames,
        selectedSheet: targetSheetName,
        availableColumns,
        detectedMapping,
      });
    }

    // 2. Extract Valid Students
    const rawStudents = [];
    let missingNamesCount = 0;
    const seenRolls = new Set();
    const seenAdmissions = new Set();
    let duplicateRollCount = 0;
    let duplicateAdmCount = 0;

    const summaryKeywords = ['total', 'grand total', 'boys', 'girls', 'passed', 'failed', 'teacher', 'principal', 'headmaster', 'signature', 'date', 'average'];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.every((c) => !cleanCell(c))) continue;

      let rawName = cleanCell(row[detectedMapping.nameIndex]);
      const rawRoll = detectedMapping.rollIndex !== -1 ? cleanCell(row[detectedMapping.rollIndex]) : '';
      const rawAdm = detectedMapping.admIndex !== -1 ? cleanCell(row[detectedMapping.admIndex]) : '';
      const rawGender = detectedMapping.genderIndex !== -1 ? cleanCell(row[detectedMapping.genderIndex]) : '';
      const rawCaste = detectedMapping.casteIndex !== -1 ? cleanCell(row[detectedMapping.casteIndex]) : '';

      // Skip summary / signature rows
      const rowStr = row.map(cleanCell).join(' ').toLowerCase();
      if (summaryKeywords.some((kw) => rawName.toLowerCase() === kw || (rowStr.includes(kw) && !rawRoll))) {
        continue;
      }

      // If student / father name is in format "Ravi / Kumar", clean up
      if (rawName.includes('/')) {
        const parts = rawName.split('/').map((p) => p.trim()).filter(Boolean);
        if (parts.length > 0 && parts[0].length >= 2) {
          rawName = parts[0];
        }
      }

      // Check if name is valid (at least 2 characters, not purely numbers or special characters)
      const isNameValid = rawName.length >= 2 && /[a-zA-Z\u0C80-\u0CFF]/.test(rawName);

      if (!isNameValid) {
        if (rawRoll || rawAdm) {
          missingNamesCount++;
        }
        continue;
      }

      // Parse roll number
      let rollNo = parseInt(rawRoll, 10);
      if (isNaN(rollNo) || rollNo <= 0) {
        rollNo = rawStudents.length + 1;
      }

      if (seenRolls.has(rollNo)) {
        duplicateRollCount++;
      } else {
        seenRolls.add(rollNo);
      }

      // Sanitize admission number (leave blank if not provided, never fake!)
      const cleanAdm = rawAdm && rawAdm !== '0' && rawAdm.toLowerCase() !== 'na' ? rawAdm : '';
      if (cleanAdm) {
        if (seenAdmissions.has(cleanAdm)) {
          duplicateAdmCount++;
        } else {
          seenAdmissions.add(cleanAdm);
        }
      }

      // Parse Gender
      let gender = 'M';
      const gLower = rawGender.toLowerCase();
      if (gLower.startsWith('f') || gLower.includes('girl') || gLower.includes('ಹೆಣ್ಣು')) {
        gender = 'F';
      }

      rawStudents.push({
        rollNumber: rollNo,
        studentName: rawName,
        admissionNumber: cleanAdm,
        gender,
        caste: rawCaste || 'GEN',
        isValid: true,
      });
    }

    const finalStudents = rawStudents.map((s, idx) => ({
      ...s,
      rollNumber: s.rollNumber || idx + 1,
    }));

    if (finalStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student records found in the selected sheet. Please check that student names are populated.',
        sheetNames,
        selectedSheet: targetSheetName,
        availableColumns,
        detectedMapping,
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully extracted ${finalStudents.length} student(s) from sheet "${targetSheetName}".`,
      sheetNames,
      selectedSheet: targetSheetName,
      availableColumns,
      detectedMapping,
      stats: {
        totalDetected: finalStudents.length,
        validStudents: finalStudents.length,
        missingNames: missingNamesCount,
        duplicateRolls: duplicateRollCount,
        duplicateAdmissions: duplicateAdmCount,
      },
      students: finalStudents,
    });
  } catch (error) {
    next(error);
  }
};
