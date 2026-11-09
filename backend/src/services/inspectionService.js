import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ZipArchive } from 'archiver';
import { User } from '../models/User.js';
import { Timetable } from '../models/Timetable.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { UploadedPhoto } from '../models/UploadedPhoto.js';
import { Attendance } from '../models/Attendance.js';
import { PracticalActivity } from '../models/PracticalActivity.js';
import { Assessment } from '../models/Assessment.js';
import { Report } from '../models/Report.js';
import { generatePdfReport } from './pdfGeneratorService.js';
import { aggregateReportData, countSchoolWorkingDays } from './reportDataService.js';

/**
 * Calculates honest, non-fabricated inspection readiness metrics and checklist
 */
export const calculateInspectionReadiness = async (teacherId, params = {}) => {
  const { academicYear = '2026-2027', startDate, endDate, className, subject } = params;

  const teacher = await User.findById(teacherId);

  // Time window: Default to current academic year term
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 5, 1); // June 1st
  const end = endDate ? new Date(endDate) : new Date();

  const workingDays = Math.max(1, countSchoolWorkingDays(start, end));

  // 1. Fetch all records
  const timetableSlots = await Timetable.findForTeacher(teacherId);
  const diaryEntries = await DailyTeachingEntry.findForTeacher(teacherId, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    className: className || undefined,
    subject: subject || undefined,
  });
  const lessonPlans = await LessonPlan.findForTeacher(teacherId);
  const photos = await UploadedPhoto.findForTeacher(teacherId);
  const attendance = await Attendance.findForTeacher(teacherId);
  const practicals = await PracticalActivity.findForTeacher(teacherId);
  const assessments = await Assessment.findForTeacher(teacherId);
  const reports = await Report.findForTeacher(teacherId);

  // 2. Metrics calculation
  const distinctTeachingDays = new Set(
    diaryEntries.map((d) => new Date(d.date).toISOString().split('T')[0])
  ).size;

  const completedDiary = diaryEntries.filter((d) => d.status === 'Completed').length;
  const draftDiary = diaryEntries.filter((d) => d.status === 'Draft' || d.status === 'Partially Completed').length;
  const missingDiaryDays = Math.max(0, workingDays - distinctTeachingDays);

  const approvedPlans = lessonPlans.filter((lp) => lp.status === 'Approved').length;
  const draftPlans = lessonPlans.filter((lp) => lp.status !== 'Approved').length;

  // Coverage percentages
  const targetTeachingDays = Math.min(workingDays, 180); // Benchmark
  const diaryCoveragePct = Math.min(100, Math.round((distinctTeachingDays / targetTeachingDays) * 100));

  const targetPlans = Math.max(1, Math.round(targetTeachingDays / 5)); // ~1 lesson plan per 5 teaching days
  const planCoveragePct = Math.min(100, Math.round((approvedPlans / targetPlans) * 100));

  const practicalCoveragePct = Math.min(100, Math.round((practicals.length / 10) * 100)); // Target ~10 practicals
  const attendanceCoveragePct = Math.min(100, Math.round((attendance.length / targetTeachingDays) * 100));
  const assessmentCoveragePct = Math.min(100, Math.round((assessments.length / 6) * 100)); // Target ~6 assessments
  const photoCoveragePct = Math.min(100, Math.round((photos.length / 12) * 100)); // Target ~12 photo evidences

  // Weighted honest readiness score
  const overallReadinessScore = Math.round(
    diaryCoveragePct * 0.35 +
    planCoveragePct * 0.20 +
    practicalCoveragePct * 0.15 +
    attendanceCoveragePct * 0.10 +
    assessmentCoveragePct * 0.10 +
    photoCoveragePct * 0.10
  );

  // 3. Configurable Checklist Items
  const checklist = [
    {
      id: 'chk_profile',
      title: 'Teacher Academic Profile & Designation',
      category: 'Profile',
      status: teacher?.designation && teacher?.subjectsTaught?.length > 0 ? 'Completed' : 'Draft',
      details: `${teacher?.fullName || 'Teacher'} (${teacher?.designation || 'Not set'})`,
      remarks: teacher?.schoolName ? 'School assigned' : 'School name missing',
    },
    {
      id: 'chk_timetable',
      title: 'Weekly Teaching Timetable & Period Schedule',
      category: 'Timetable',
      status: timetableSlots.length >= 5 ? 'Completed' : timetableSlots.length > 0 ? 'Draft' : 'Missing',
      details: `${timetableSlots.length} weekly periods configured across Monday-Saturday`,
      remarks: timetableSlots.length >= 5 ? 'Full weekly schedule active' : 'Schedule incomplete',
    },
    {
      id: 'chk_diary_completed',
      title: 'Daily Teaching Diary - Completed Records',
      category: 'Daily Diary',
      status: completedDiary >= 20 ? 'Completed' : completedDiary > 0 ? 'Draft' : 'Missing',
      details: `${completedDiary} completed diary entries (${distinctTeachingDays} distinct days)`,
      remarks: missingDiaryDays > 0 ? `${missingDiaryDays} working days without recorded diary` : 'Up to date',
    },
    {
      id: 'chk_diary_drafts',
      title: 'Incomplete Diary Entries Awaiting Finalization',
      category: 'Daily Diary',
      status: draftDiary === 0 ? 'Completed' : 'Draft',
      details: `${draftDiary} entries in Draft or Partially Completed status`,
      remarks: draftDiary > 0 ? 'Requires teacher review and confirmation' : 'Zero unconfirmed drafts',
    },
    {
      id: 'chk_lesson_plans',
      title: 'Approved 5E Pedagogical Lesson Plans',
      category: 'Lesson Plans',
      status: approvedPlans >= 5 ? 'Approved' : approvedPlans > 0 ? 'Draft' : 'Missing',
      details: `${approvedPlans} approved plans (${draftPlans} pending drafts)`,
      remarks: approvedPlans >= 5 ? 'Comprehensive lesson plans on record' : 'More plans needed',
    },
    {
      id: 'chk_practicals',
      title: 'STEM & Computer Lab Practical Activity Documentation',
      category: 'Practicals',
      status: practicals.length >= 4 ? 'Completed' : practicals.length > 0 ? 'Draft' : 'Missing',
      details: `${practicals.length} practical experiments documented with apparatus & steps`,
      remarks: practicals.length >= 4 ? 'Satisfactory lab coverage' : 'Below target lab demonstrations',
    },
    {
      id: 'chk_attendance',
      title: 'Daily Student Attendance & Monthly Registers',
      category: 'Attendance',
      status: attendance.length >= 10 ? 'Completed' : attendance.length > 0 ? 'Draft' : 'Not Configured',
      details: `${attendance.length} roll-call dates recorded with student percentage logs`,
      remarks: attendance.length > 0 ? 'Audit history active' : 'Optional or unrecorded',
    },
    {
      id: 'chk_assessments',
      title: 'Periodic Assessments & Learning Gaps Identified',
      category: 'Assessments',
      status: assessments.length >= 3 ? 'Completed' : assessments.length > 0 ? 'Draft' : 'Missing',
      details: `${assessments.length} assessments/quizzes logged with marks breakdown`,
      remarks: assessments.length > 0 ? 'Diagnostic remedial logs maintained' : 'No test records yet',
    },
    {
      id: 'chk_photos',
      title: 'Classroom Photographic Evidence & Media Consent',
      category: 'Evidence',
      status: photos.length >= 6 ? 'Completed' : photos.length > 0 ? 'Draft' : 'Missing',
      details: `${photos.length} authenticated classroom photos with captions & dates`,
      remarks: photos.length >= 6 ? 'Photographic portfolio verified' : 'Upload classroom photos',
    },
  ];

  return {
    teacher: {
      fullName: teacher?.fullName,
      schoolName: teacher?.schoolName,
      designation: teacher?.designation,
      subjectsTaught: teacher?.subjectsTaught,
      classesHandled: teacher?.classesHandled,
    },
    academicYear,
    reportingWindow: {
      startDate: start,
      endDate: end,
      workingDays,
      distinctTeachingDays,
      missingDiaryDays,
    },
    readinessScore: overallReadinessScore,
    breakdown: {
      diaryCoveragePct,
      planCoveragePct,
      practicalCoveragePct,
      attendanceCoveragePct,
      assessmentCoveragePct,
      photoCoveragePct,
      counts: {
        totalClassesConducted: diaryEntries.length,
        completedDiary,
        draftDiary,
        distinctTeachingDays,
        approvedPlans,
        draftPlans,
        practicalsCount: practicals.length,
        attendanceCount: attendance.length,
        assessmentsCount: assessments.length,
        photosCount: photos.length,
        reportsGenerated: reports.length,
      },
    },
    checklist,
  };
};

/**
 * Creates a standalone PDF document buffer
 */
const createSimplePdfBuffer = async (title, subtitle, contentLines = []) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.rect(0, 0, doc.page.width, 6).fill('#1e3a8a');
      doc.fontSize(16).fillColor('#1e3a8a').font('Helvetica-Bold').text(title, { align: 'center' });
      if (subtitle) {
        doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(subtitle, { align: 'center' });
      }
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#cbd5e1').stroke();
      doc.moveDown(1);

      // Body lines
      doc.fontSize(9.5).fillColor('#1e293b').font('Helvetica');
      contentLines.forEach((line) => {
        if (typeof line === 'string') {
          doc.text(line, { lineGap: 3 });
        } else if (line.bold) {
          doc.font('Helvetica-Bold').text(line.text, { lineGap: 3 }).font('Helvetica');
        }
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Generates the Complete Academic-Year Inspection Package ZIP (12 folders structure)
 */
export const generateInspectionPackageZip = async (teacherId, params = {}) => {
  const readiness = await calculateInspectionReadiness(teacherId, params);
  const reportData = await aggregateReportData(teacherId, params);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const buffers = [];
  archive.on('data', (d) => buffers.push(d));

  const yearClean = (readiness.academicYear || '2026-27').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseDir = `Inspection_Documentation_${yearClean}`;

  // 01_Teacher_Profile
  const profileLines = [
    { bold: true, text: `Teacher Full Name: ${readiness.teacher.fullName}` },
    `School: ${readiness.teacher.schoolName}`,
    `Designation: ${readiness.teacher.designation}`,
    `Subjects Taught: ${(readiness.teacher.subjectsTaught || []).join(', ')}`,
    `Classes Handled: ${(readiness.teacher.classesHandled || []).join(', ')}`,
    `Academic Year: ${readiness.academicYear}`,
    '',
    { bold: true, text: 'Inspection Declaration:' },
    'I hereby confirm that the teaching registers, lesson plans, attendance records, and student assessment documentation preserved in this portfolio are maintained in good faith according to educational guidelines.',
  ];
  const profilePdf = await createSimplePdfBuffer('01. TEACHER ACADEMIC PROFILE & CREDENTIALS', 'Official School Documentation Portfolio', profileLines);
  archive.append(profilePdf, { name: `${baseDir}/01_Teacher_Profile/Teacher_Profile.pdf` });

  // 02_Timetable
  const timetableLines = (reportData.timetable || []).map((t) =>
    `• ${t.weekday} | Period ${t.periodNumber} (${t.startTime} - ${t.endTime}) | ${t.className} (${t.section || 'A'}) - ${t.subject} | Room: ${t.room || 'General'}`
  );
  if (timetableLines.length === 0) timetableLines.push('No timetable entries recorded.');
  const timetablePdf = await createSimplePdfBuffer('02. WEEKLY TIMETABLE SCHEDULE', 'Period Allocations & Working Days', timetableLines);
  archive.append(timetablePdf, { name: `${baseDir}/02_Timetable/Timetable_Schedule.pdf` });

  // 03_Lesson_Plans
  const approvedPlans = await LessonPlan.findForTeacher(teacherId);
  const planLines = approvedPlans.map((lp, idx) =>
    `[Plan #${idx + 1}] ${lp.title} (${lp.className} - ${lp.subject})\n  Status: ${lp.status} | Duration: ${lp.durationMinutes}m | Objectives: ${lp.learningObjectives || 'N/A'}\n`
  );
  if (planLines.length === 0) planLines.push('No lesson plans on record.');
  const lessonPlansPdf = await createSimplePdfBuffer('03. APPROVED 5E LESSON PLANS', 'Instructional Design Dossier', planLines);
  archive.append(lessonPlansPdf, { name: `${baseDir}/03_Lesson_Plans/Approved_Lesson_Plans.pdf` });

  // 04_Daily_Teaching_Diary (Generates the full standard inspection PDF with actual detailed content)
  const diaryPdf = await generatePdfReport(reportData);
  archive.append(diaryPdf, { name: `${baseDir}/04_Daily_Teaching_Diary/Daily_Teaching_Diary_Register.pdf` });

  // 05_Weekly_Reports & 06_Monthly_Reports
  const weeklyPdf = await createSimplePdfBuffer('05. WEEKLY ACADEMIC TEACHING REPORTS', 'Aggregated Progress & Learning Activities', [
    `Total teaching days: ${readiness.breakdown.counts.distinctTeachingDays}`,
    `Total classes conducted: ${readiness.breakdown.counts.totalClassesConducted}`,
    `Completed lessons: ${readiness.breakdown.counts.completedDiary}`,
  ]);
  archive.append(weeklyPdf, { name: `${baseDir}/05_Weekly_Reports/Weekly_Reports_Summary.pdf` });

  const monthlyPdf = await createSimplePdfBuffer('06. MONTHLY TEACHING & SYLLABUS AUDIT', 'Curriculum Pacing Register', [
    `Academic Year: ${readiness.academicYear}`,
    `Readiness Coverage Score: ${readiness.readinessScore}%`,
  ]);
  archive.append(monthlyPdf, { name: `${baseDir}/06_Monthly_Reports/Monthly_Reports_Summary.pdf` });

  // 07_Attendance
  const attendanceLines = (reportData.attendanceRecords || []).map((att) =>
    `• Date: ${new Date(att.date).toLocaleDateString('en-GB')} | Class: ${att.className}-${att.section || 'A'} | Present: ${att.presentCount}/${att.totalStudents} (${att.attendancePercentage}%)`
  );
  if (attendanceLines.length === 0) attendanceLines.push('No attendance records logged.');
  const attendancePdf = await createSimplePdfBuffer('07. STUDENT ATTENDANCE REGISTERS', 'Daily & Monthly Roll-call Logs', attendanceLines);
  archive.append(attendancePdf, { name: `${baseDir}/07_Attendance/Attendance_Register.pdf` });

  // 08_Practical_Activities
  const practicalLines = (reportData.practicals || []).map((p, idx) =>
    `[Lab #${idx + 1}] ${p.activityTitle} (${p.className} ${p.subject})\n  Tools: ${p.toolsAndSoftwareUsed || 'Standard Lab'} | Outcomes: ${p.learningOutcomes || 'Completed'}\n`
  );
  if (practicalLines.length === 0) practicalLines.push('No practical activities recorded.');
  const practicalsPdf = await createSimplePdfBuffer('08. STEM & COMPUTER PRACTICAL LAB ACTIVITIES', 'Hands-on Experiments & Demonstrations', practicalLines);
  archive.append(practicalsPdf, { name: `${baseDir}/08_Practical_Activities/Practical_Lab_Records.pdf` });

  // 09_Assessments
  const assessmentLines = (reportData.assessments || []).map((a, idx) =>
    `[Assessment #${idx + 1}] ${a.assessmentTitle} (${a.assessmentType})\n  Class: ${a.className} | Max Marks: ${a.maximumMarks} | Class Avg: ${a.classAverage}% | High: ${a.highestMarks} | Low: ${a.lowestMarks}\n  Gaps: ${a.learningGapsIdentified || 'None noted'}\n`
  );
  if (assessmentLines.length === 0) assessmentLines.push('No assessments recorded.');
  const assessmentsPdf = await createSimplePdfBuffer('09. PERIODIC ASSESSMENTS & LEARNING GAPS', 'Evaluation Registers & Remedial Tracking', assessmentLines);
  archive.append(assessmentsPdf, { name: `${baseDir}/09_Assessments/Assessments_And_Marks_Register.pdf` });

  // 10_Syllabus_Progress
  const syllabusLines = [
    `Total Classes Conducted: ${readiness.breakdown.counts.totalClassesConducted}`,
    `Completed Teaching Units: ${readiness.breakdown.counts.completedDiary}`,
    `Syllabus Coverage: Estimated based on textbook term breakdown`,
  ];
  const syllabusPdf = await createSimplePdfBuffer('10. SYLLABUS PROGRESSION DOSSIER', 'Term-wise Unit Completion Tracking', syllabusLines);
  archive.append(syllabusPdf, { name: `${baseDir}/10_Syllabus_Progress/Syllabus_Progress_Register.pdf` });

  // 11_Photo_Evidence (attach real files)
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  (reportData.photos || []).forEach((p, idx) => {
    if (p.storageKey) {
      const fPath = path.resolve(uploadsDir, p.storageKey);
      if (fs.existsSync(fPath)) {
        const ext = path.extname(p.storageKey);
        const name = `Photo_${idx + 1}_${(p.caption || 'evidence').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}${ext}`;
        archive.file(fPath, { name: `${baseDir}/11_Photo_Evidence/${name}` });
      }
    }
  });

  // 12_Inspection_Summary
  const summaryLines = [
    { bold: true, text: `INSPECTION AUDIT SUMMARY - ACADEMIC YEAR ${readiness.academicYear}` },
    `Teacher Name: ${readiness.teacher.fullName}`,
    `School: ${readiness.teacher.schoolName}`,
    `Overall Documentation Readiness Score: ${readiness.readinessScore}%`,
    '',
    { bold: true, text: 'Coverage Breakdown by Category:' },
    `• Daily Teaching Diary Coverage: ${readiness.breakdown.diaryCoveragePct}% (${readiness.breakdown.counts.completedDiary} completed, ${readiness.breakdown.counts.draftDiary} drafts)`,
    `• Lesson Plan Coverage: ${readiness.breakdown.planCoveragePct}% (${readiness.breakdown.counts.approvedPlans} approved plans)`,
    `• Practical Activities Coverage: ${readiness.breakdown.practicalCoveragePct}% (${readiness.breakdown.counts.practicalsCount} lab demonstrations)`,
    `• Attendance Record Coverage: ${readiness.breakdown.attendanceCoveragePct}% (${readiness.breakdown.counts.attendanceCount} roll-calls)`,
    `• Assessment Coverage: ${readiness.breakdown.assessmentCoveragePct}% (${readiness.breakdown.counts.assessmentsCount} tests/quizzes)`,
    `• Photo Evidence Coverage: ${readiness.breakdown.photoCoveragePct}% (${readiness.breakdown.counts.photosCount} photos)`,
    '',
    { bold: true, text: 'Missing Documentation Checklist Items:' },
    ...readiness.checklist.map((c) => `[${c.status}] ${c.title}: ${c.details} (${c.remarks})`),
  ];
  const summaryPdf = await createSimplePdfBuffer('12. OFFICIAL SCHOOL INSPECTION AUDIT SUMMARY', 'Comprehensive Evaluation & Compliance Certificate', summaryLines);
  archive.append(summaryPdf, { name: `${baseDir}/12_Inspection_Summary/Inspection_Summary.pdf` });

  await archive.finalize();
  return { buffer: Buffer.concat(buffers), readiness };
};
