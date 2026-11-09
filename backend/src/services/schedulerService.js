import fs from 'fs';
import path from 'path';
import { ReportSchedule } from '../models/ReportSchedule.js';
import { Report } from '../models/Report.js';
import { aggregateReportData } from './reportDataService.js';
import { generatePdfReport } from './pdfGeneratorService.js';
import { generateDocxReport } from './docxGeneratorService.js';
import { generateXlsxReport } from './xlsxGeneratorService.js';
import { generateZipPackage } from './zipGeneratorService.js';

const reportsDir = path.resolve(process.cwd(), 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Executes a single scheduled report generation job with idempotency
 */
export const executeScheduledReport = async (scheduleId, teacherId) => {
  const schedule = await ReportSchedule.findById(scheduleId);
  if (!schedule || !schedule.isActive) {
    return { success: false, message: 'Schedule not found or inactive.' };
  }

  // Calculate Date Window in Asia/Kolkata
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);

  if (schedule.frequency === 'daily') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (schedule.frequency === 'weekly') {
    // Current week: Monday to Sunday
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (schedule.frequency === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Idempotency check: did we already generate an automated report for this date window today?
  const existingReports = await Report.findForTeacher(teacherId, {
    reportType: schedule.reportType,
    outputFormat: schedule.outputFormat,
  });

  const startStr = startDate.toISOString().split('T')[0];
  const duplicate = existingReports.find((r) => {
    const rStart = new Date(r.startDate).toISOString().split('T')[0];
    return rStart === startStr && r.auditLogs?.some((l) => l.action === 'Scheduled Run');
  });

  if (duplicate) {
    return {
      success: true,
      idempotentSkipped: true,
      message: 'Report already generated for this cycle today.',
      report: duplicate,
    };
  }

  try {
    const reportData = await aggregateReportData(teacherId, {
      reportType: schedule.reportType,
      startDate,
      endDate,
      className: schedule.className,
      subject: schedule.subject,
      sectionsIncluded: schedule.sectionsIncluded,
    });

    const format = schedule.outputFormat || 'pdf';
    let fileBuffer;
    let ext = '.pdf';

    if (format === 'docx') {
      fileBuffer = await generateDocxReport(reportData);
      ext = '.docx';
    } else if (format === 'xlsx') {
      fileBuffer = await generateXlsxReport(reportData);
      ext = '.xlsx';
    } else if (format === 'zip') {
      fileBuffer = await generateZipPackage(reportData);
      ext = '.zip';
    } else {
      fileBuffer = await generatePdfReport(reportData);
      ext = '.pdf';
    }

    const fileName = `Auto_${schedule.frequency}_${startStr}_${Date.now()}${ext}`;
    const storageKey = `reports/${fileName}`;
    const filePath = path.resolve(reportsDir, fileName);

    fs.writeFileSync(filePath, fileBuffer);

    const report = await Report.create({
      teacherId,
      schoolId: reportData.teacher.schoolName || '',
      title: `Scheduled ${schedule.frequency.toUpperCase()} Report - ${startStr}`,
      reportType: schedule.reportType,
      startDate,
      endDate,
      className: schedule.className || '',
      subject: schedule.subject || '',
      outputFormat: format,
      fileName,
      storageKey,
      fileUrl: `/uploads/${storageKey}`,
      fileSize: fileBuffer.length,
      sectionsIncluded: schedule.sectionsIncluded,
      generationStatus: 'Completed',
      approvalStatus: 'Draft', // Stays draft until teacher confirms
      auditLogs: [
        {
          action: 'Scheduled Run',
          timestamp: new Date(),
          details: `Generated automatically via background schedule at ${schedule.scheduledTime} IST`,
        },
      ],
    });

    // Update schedule last run status
    await ReportSchedule.updateById(scheduleId, teacherId, {
      lastRunAt: new Date(),
      lastRunStatus: 'Success',
      $push: {
        runLogs: {
          runAt: new Date(),
          status: 'Success',
          message: `Created report ${fileName} (${fileBuffer.length} bytes)`,
          reportId: report._id || report.id,
        },
      },
    });

    return { success: true, report, message: 'Scheduled report generated successfully.' };
  } catch (error) {
    console.error('[Scheduled Report Error]:', error);
    await ReportSchedule.updateById(scheduleId, teacherId, {
      lastRunAt: new Date(),
      lastRunStatus: 'Failed',
      $push: {
        runLogs: {
          runAt: new Date(),
          status: 'Failed',
          message: error.message,
        },
      },
    });
    return { success: false, message: error.message };
  }
};
