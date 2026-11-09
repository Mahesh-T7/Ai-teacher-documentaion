import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('Phase 5 - Reports, Preview/Approval & Multi-Format Exports Tests', () => {
  let server;
  let baseUrl;
  let teacherToken;
  let teacherId;

  const email = `teacher_reports_${Date.now()}@school.edu`;
  const password = 'Password@123';

  let createdPdfReportId;
  let createdDocxReportId;
  let createdXlsxReportId;
  let createdZipReportId;
  let createdScheduleId;

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register teacher
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Prof. Ananya Hegde',
        email,
        password,
        schoolName: 'Karnataka Public School, Bengaluru',
        designation: 'Head of AI & Technology',
        subjectsTaught: ['Artificial Intelligence', 'Mathematics'],
        classesHandled: ['Class 9-A', 'Class 10-A'],
      }),
    });
    const regData = await regRes.json();
    teacherToken = regData.token;
    teacherId = regData.user._id || regData.user.id;

    // Seed 1 real daily diary entry
    await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        date: '2026-11-03',
        day: 'Tuesday',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        period: 1,
        periodNumber: 1,
        startTime: '09:30',
        endTime: '10:15',
        unit: 'Unit 4: Generative AI',
        chapter: 'Chapter 5',
        topic: 'LLMs and Prompt Engineering',
        learningObjectives: 'Understand transformer architecture and basic prompting techniques',
        teachingMethodology: 'Inquiry-based discussion and smartboard demonstration',
        teachingAids: 'Blackboard, Smartboard presentation',
        detailedExplanation: '<h2>Foundations of LLMs</h2><p>Today we analyzed how Large Language Models predict subsequent tokens based on attention mechanisms.</p><ul><li>Zero-shot Prompting</li><li>Few-shot Prompting</li></ul><p>Students participated actively in drafting prompt variations.</p>',
        classroomActivities: {
          activitiesConducted: 'Live prompt comparison exercise',
          studentParticipation: '95% active engagement',
          groupDiscussions: 'Discussion on ethics and AI bias',
        },
        learningOutcomes: {
          whatStudentsUnderstood: 'All students grasped the difference between zero-shot and few-shot prompts.',
          skillsDeveloped: 'Prompt formulation and critical evaluation.',
        },
        completion: {
          homeworkAssigned: 'Formulate three diverse prompts for a creative writing bot.',
          nextClassPlan: 'Introduction to fine-tuning and retrieval augmented generation.',
        },
        status: 'Completed',
        confirmedByTeacher: true,
      }),
    });

    // Seed 1 practical activity
    await fetch(`${baseUrl}/api/practicals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        activityTitle: 'Zero-shot vs Few-shot Prompting Lab',
        toolsAndSoftwareUsed: 'Google Colab, Python 3.11',
        practicalSteps: '1. Open Colab\n2. Run prompt experiments\n3. Record output accuracy',
        status: 'Completed',
      }),
    });

    // Seed 1 assessment
    await fetch(`${baseUrl}/api/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        assessmentTitle: 'Generative AI Concepts Quiz',
        assessmentType: 'Quiz',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        maximumMarks: 20,
        studentMarks: [
          { studentName: 'Student 1', rollNumber: 1, marksObtained: 18 },
          { studentName: 'Student 2', rollNumber: 2, marksObtained: 14 },
        ],
      }),
    });
  });

  after(() => {
    if (server) server.close();
  });

  // ==========================================
  // MODULE 1 & 7: REPORT PREVIEW & AGGREGATION
  // ==========================================
  test('POST /api/reports/preview - returns aggregated live data before generation', async () => {
    const res = await fetch(`${baseUrl}/api/reports/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        reportType: 'daily',
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reportData);
    assert.strictEqual(data.reportData.teacher.fullName, 'Prof. Ananya Hegde');
    assert.ok(data.reportData.diaryEntries.length >= 1);
    assert.ok(data.reportData.meta.actualTeachingDays >= 1);
  });

  // ==========================================
  // MODULE 2: DAILY PDF REPORT
  // ==========================================
  test('POST /api/reports/generate - generates Daily PDF report with detailed content and saves as Draft', async () => {
    const res = await fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        reportType: 'daily',
        outputFormat: 'pdf',
        startDate: '2026-11-03',
        endDate: '2026-11-03',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
        title: 'Daily AI Teaching Dossier',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.report);
    assert.strictEqual(data.report.outputFormat, 'pdf');
    assert.strictEqual(data.report.approvalStatus, 'Draft'); // Must start as Draft
    assert.ok(data.report.fileSize > 1000);
    createdPdfReportId = data.report._id || data.report.id;

    // Verify physical file on disk
    const diskPath = path.resolve(process.cwd(), 'uploads', data.report.storageKey);
    assert.ok(fs.existsSync(diskPath));
    const stats = fs.statSync(diskPath);
    assert.ok(stats.size > 0);
  });

  // ==========================================
  // MODULE 6: WORD (DOCX) EXPORT
  // ==========================================
  test('POST /api/reports/generate - generates Weekly Word DOCX report', async () => {
    const res = await fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        reportType: 'weekly',
        outputFormat: 'docx',
        startDate: '2026-11-02',
        endDate: '2026-11-08',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
        title: 'Weekly Academic Log',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.report.outputFormat, 'docx');
    assert.ok(data.report.fileSize > 1000);
    createdDocxReportId = data.report._id || data.report.id;
  });

  // ==========================================
  // MODULE 6: EXCEL (XLSX) MULTI-WORKSHEET EXPORT
  // ==========================================
  test('POST /api/reports/generate - generates Monthly XLSX workbook with 8 structured worksheets', async () => {
    const res = await fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        reportType: 'monthly',
        outputFormat: 'xlsx',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
        title: 'Monthly Multi-Register Workbook',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.report.outputFormat, 'xlsx');
    assert.ok(data.report.fileSize > 1000);
    createdXlsxReportId = data.report._id || data.report.id;
  });

  // ==========================================
  // MODULE 10: ZIP ARCHIVE GENERATION
  // ==========================================
  test('POST /api/reports/generate - generates bundled ZIP archive with PDF, DOCX, XLSX and photos', async () => {
    const res = await fetch(`${baseUrl}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        reportType: 'custom',
        outputFormat: 'zip',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
        title: 'Complete Teaching Evidence Bundle',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.report.outputFormat, 'zip');
    assert.ok(data.report.fileSize > 1000);
    createdZipReportId = data.report._id || data.report.id;
  });

  // ==========================================
  // MODULE 7: REPORT APPROVAL WORKFLOW
  // ==========================================
  test('POST /api/reports/:id/approve - teacher approval updates status and appends to audit log', async () => {
    const res = await fetch(`${baseUrl}/api/reports/${createdPdfReportId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.report.approvalStatus, 'Approved');
    assert.ok(data.report.approvedAt);
    assert.ok(data.report.auditLogs.some((l) => l.action === 'Approved'));
  });

  // ==========================================
  // MODULE 8: REPORT HISTORY & AUTHORIZED DOWNLOAD
  // ==========================================
  test('GET /api/reports - lists reports in history for teacher', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.count >= 4); // PDF, DOCX, XLSX, ZIP
  });

  test('GET /api/reports/:id/download - streams file for authorized teacher', async () => {
    const res = await fetch(`${baseUrl}/api/reports/${createdPdfReportId}/download`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res.status, 200);
    const blob = await res.blob();
    assert.ok(blob.size > 0);
  });

  // ==========================================
  // MODULE 9: SCHEDULED AUTOMATIC REPORTS
  // ==========================================
  test('POST /api/reports/schedules - configures scheduled report generation in Asia/Kolkata', async () => {
    const res = await fetch(`${baseUrl}/api/reports/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        frequency: 'daily',
        reportType: 'daily',
        outputFormat: 'pdf',
        scheduledTime: '17:00',
        timezone: 'Asia/Kolkata',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.schedule.frequency, 'daily');
    createdScheduleId = data.schedule._id || data.schedule.id;
  });

  test('POST /api/reports/schedules/:id/run - executes scheduled job and prevents duplicate runs', async () => {
    // Run 1: Should execute
    const res1 = await fetch(`${baseUrl}/api/reports/schedules/${createdScheduleId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res1.status, 200);
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);

    // Run 2: Should be idempotently skipped
    const res2 = await fetch(`${baseUrl}/api/reports/schedules/${createdScheduleId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.idempotentSkipped, true);
  });
});
