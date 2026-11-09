import fs from 'fs';
import path from 'path';
import { Report } from '../models/Report.js';
import { ReportSchedule } from '../models/ReportSchedule.js';
import { aggregateReportData } from '../services/reportDataService.js';
import { generatePdfReport } from '../services/pdfGeneratorService.js';
import { generateDocxReport } from '../services/docxGeneratorService.js';
import { generateXlsxReport } from '../services/xlsxGeneratorService.js';
import { generateZipPackage } from '../services/zipGeneratorService.js';
import { executeScheduledReport } from '../services/schedulerService.js';

const reportsDir = path.resolve(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * @desc Generate interactive preview of report data before approval & download
 * @route POST /api/reports/preview
 * @access Private
 */
export const previewReport = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const reportData = await aggregateReportData(teacherId, req.body);

    res.status(200).json({
      success: true,
      message: 'Report preview assembled successfully.',
      reportData,
    });
  } catch (error) {
    console.error('[Preview Report Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to assemble report preview.' });
  }
};

/**
 * @desc Generate actual report file (PDF, DOCX, XLSX, or ZIP) and save as Draft
 * @route POST /api/reports/generate
 * @access Private
 */
export const generateReport = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const {
      reportType = 'daily',
      outputFormat = 'pdf',
      startDate,
      endDate,
      className = '',
      section = '',
      subject = '',
      selectedPhotoIds = [],
      sectionsIncluded = [],
      title,
    } = req.body;

    const reportData = await aggregateReportData(teacherId, req.body);

    let fileBuffer;
    let ext = '.pdf';

    if (outputFormat === 'docx') {
      fileBuffer = await generateDocxReport(reportData);
      ext = '.docx';
    } else if (outputFormat === 'xlsx') {
      fileBuffer = await generateXlsxReport(reportData);
      ext = '.xlsx';
    } else if (outputFormat === 'zip') {
      fileBuffer = await generateZipPackage(reportData);
      ext = '.zip';
    } else {
      fileBuffer = await generatePdfReport(reportData);
      ext = '.pdf';
    }

    const startStr = new Date(reportData.meta.startDate).toISOString().split('T')[0];
    const safeTitle = (title || `${reportType}_report`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}_${startStr}_${Date.now()}${ext}`;
    const storageKey = `reports/${fileName}`;
    const filePath = path.resolve(reportsDir, fileName);

    fs.writeFileSync(filePath, fileBuffer);

    const report = await Report.create({
      teacherId,
      schoolId: reportData.teacher.schoolName || '',
      title: title || `${reportType.toUpperCase()} Report - ${startStr}`,
      reportType,
      academicYear: reportData.meta.academicYear,
      startDate: reportData.meta.startDate,
      endDate: reportData.meta.endDate,
      className,
      section,
      subject,
      outputFormat,
      fileName,
      storageKey,
      fileUrl: `/uploads/${storageKey}`,
      fileSize: fileBuffer.length,
      sectionsIncluded: reportData.meta.sectionsIncluded,
      selectedPhotoIds,
      generationStatus: 'Completed',
      approvalStatus: 'Draft', // Module 7: Never automatically approve a report
      previewData: {
        totalClassesConducted: reportData.meta.totalClassesConducted,
        actualTeachingDays: reportData.meta.actualTeachingDays,
        photosCount: reportData.meta.photosCount,
      },
      auditLogs: [
        {
          action: 'Generated',
          timestamp: new Date(),
          details: `Report generated in ${outputFormat.toUpperCase()} format by teacher`,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: `Report generated successfully as Draft. Please review and approve before final distribution.`,
      report,
    });
  } catch (error) {
    console.error('[Generate Report Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate report.' });
  }
};

/**
 * @desc Approve report draft
 * @route POST /api/reports/:id/approve
 * @access Private
 */
export const approveReport = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const report = await Report.findById(req.params.id);

    if (!report || String(report.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized.' });
    }

    const updated = await Report.updateById(req.params.id, teacherId, {
      approvalStatus: 'Approved',
      approvedAt: new Date(),
      approvedBy: req.user.fullName || 'Teacher',
      $push: {
        auditLogs: {
          action: 'Approved',
          timestamp: new Date(),
          details: `Approved by teacher (${req.user.fullName || 'Educator'})`,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Report approved successfully! Final distribution enabled.',
      report: updated,
    });
  } catch (error) {
    console.error('[Approve Report Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to approve report.' });
  }
};

/**
 * @desc Get report history for teacher with filters
 * @route GET /api/reports
 * @access Private
 */
export const getReportHistory = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { reportType, outputFormat, approvalStatus } = req.query;

    const reports = await Report.findForTeacher(teacherId, {
      reportType,
      outputFormat,
      approvalStatus,
    });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('[Get Report History Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch report history.' });
  }
};

/**
 * @desc Get single report by ID
 * @route GET /api/reports/:id
 * @access Private
 */
export const getReportById = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const report = await Report.findById(req.params.id);

    if (!report || String(report.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized.' });
    }

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('[Get Report By ID Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch report.' });
  }
};

/**
 * @desc Authorized file download endpoint
 * @route GET /api/reports/:id/download
 * @access Private
 */
export const downloadReportFile = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const report = await Report.findById(req.params.id);

    if (!report || String(report.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized.' });
    }

    const candidatePaths = [
      path.resolve(process.cwd(), 'uploads', report.storageKey),
      path.resolve(process.cwd(), 'backend', 'uploads', report.storageKey),
      path.resolve(process.cwd(), '..', 'uploads', report.storageKey),
      path.resolve(reportsDir, report.fileName),
      path.resolve(process.cwd(), 'backend', 'uploads', 'reports', report.fileName),
      path.resolve(process.cwd(), 'uploads', 'reports', report.fileName),
    ];

    let filePath = candidatePaths.find((p) => fs.existsSync(p));

    if (!filePath) {
      console.error('[Download Report Error]: File not found in candidate paths:', candidatePaths);
      return res.status(404).json({ success: false, message: 'Report physical file not found on server.' });
    }

    const ext = path.extname(report.fileName || '').toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
    };

    const mime = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('[Download Report Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to download report file.' });
  }
};

/**
 * @desc Delete report from history and remove disk file
 * @route DELETE /api/reports/:id
 * @access Private
 */
export const deleteReport = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const report = await Report.findById(req.params.id);

    if (!report || String(report.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized.' });
    }

    if (report.storageKey) {
      const filePath = path.resolve(process.cwd(), 'uploads', report.storageKey);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fErr) {
          console.warn('[Unlink report warning]:', fErr.message);
        }
      }
    }

    await Report.deleteById(req.params.id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Report removed successfully from history.',
    });
  } catch (error) {
    console.error('[Delete Report Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete report.' });
  }
};

// ==========================================
// SCHEDULED REPORT CONTROLLERS
// ==========================================

export const createSchedule = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const schedule = await ReportSchedule.create({
      teacherId,
      ...req.body,
    });
    res.status(201).json({ success: true, message: 'Report generation schedule created.', schedule });
  } catch (error) {
    console.error('[Create Schedule Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create schedule.' });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const schedules = await ReportSchedule.findForTeacher(teacherId);
    res.status(200).json({ success: true, schedules });
  } catch (error) {
    console.error('[Get Schedules Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch schedules.' });
  }
};

export const triggerScheduleRun = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const result = await executeScheduledReport(req.params.id, teacherId);
    res.status(200).json(result);
  } catch (error) {
    console.error('[Trigger Schedule Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to execute scheduled report.' });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    await ReportSchedule.deleteById(req.params.id, teacherId);
    res.status(200).json({ success: true, message: 'Schedule removed.' });
  } catch (error) {
    console.error('[Delete Schedule Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete schedule.' });
  }
};
