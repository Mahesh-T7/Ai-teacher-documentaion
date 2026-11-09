import crypto from 'crypto';
import { User } from '../models/User.js';
import { Timetable } from '../models/Timetable.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { Attendance } from '../models/Attendance.js';
import { PracticalActivity } from '../models/PracticalActivity.js';
import { Assessment } from '../models/Assessment.js';
import { SyllabusProgress } from '../models/SyllabusProgress.js';
import { UploadedPhoto } from '../models/UploadedPhoto.js';
import { Report } from '../models/Report.js';
import { BackupLog } from '../models/BackupLog.js';

export const exportTeacherBackup = async (teacherId, reqMeta = {}) => {
  const user = await User.findById(teacherId);
  if (!user) {
    throw new Error('Teacher record not found');
  }

  // Fetch all teacher documentation collections
  const [
    timetables,
    lessonPlans,
    diaryEntries,
    attendance,
    practicals,
    assessments,
    syllabus,
    photos,
    reports,
  ] = await Promise.all([
    Timetable.findForTeacher(teacherId),
    LessonPlan.findForTeacher(teacherId),
    DailyTeachingEntry.findForTeacher(teacherId),
    Attendance.findForTeacher(teacherId),
    PracticalActivity.findForTeacher(teacherId),
    Assessment.findForTeacher(teacherId),
    SyllabusProgress.findForTeacher(teacherId),
    UploadedPhoto.findForTeacher(teacherId),
    Report.findForTeacher(teacherId),
  ]);

  const manifest = {
    timetables: timetables.length,
    lessonPlans: lessonPlans.length,
    diaryEntries: diaryEntries.length,
    attendance: attendance.length,
    practicals: practicals.length,
    assessments: assessments.length,
    syllabus: syllabus.length,
    photos: photos.length,
    reports: reports.length,
    totalRecords:
      timetables.length +
      lessonPlans.length +
      diaryEntries.length +
      attendance.length +
      practicals.length +
      assessments.length +
      syllabus.length +
      photos.length +
      reports.length,
  };

  const cleanCollections = {
    timetables: timetables.map((t) => ({ ...t, _id: undefined, teacherId: undefined })),
    lessonPlans: lessonPlans.map((lp) => ({ ...lp, _id: undefined, teacherId: undefined })),
    diaryEntries: diaryEntries.map((d) => ({ ...d, _id: undefined, teacherId: undefined })),
    attendance: attendance.map((a) => ({ ...a, _id: undefined, teacherId: undefined })),
    practicals: practicals.map((p) => ({ ...p, _id: undefined, teacherId: undefined })),
    assessments: assessments.map((as) => ({ ...as, _id: undefined, teacherId: undefined })),
    syllabus: syllabus.map((s) => ({ ...s, _id: undefined, teacherId: undefined })),
    photos: photos.map((ph) => ({ ...ph, _id: undefined, teacherId: undefined })),
    reports: reports.map((r) => ({ ...r, _id: undefined, teacherId: undefined })),
  };

  const backupPayload = {
    app: 'AI Teacher Documentation Management Portal',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    teacher: {
      id: String(user._id || user.id),
      fullName: user.fullName,
      email: user.email,
      schoolName: user.schoolName || '',
      designation: user.designation || '',
      subjectsTaught: user.subjectsTaught || [],
      classesHandled: user.classesHandled || [],
    },
    manifest,
    collections: cleanCollections,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
  const filename = `teacher-backup-${(user.fullName || 'teacher').replace(/\s+/g, '_')}-${new Date()
    .toISOString()
    .split('T')[0]}.json`;

  await BackupLog.create({
    teacherId,
    action: 'export',
    status: 'success',
    filename,
    fileSize: Buffer.byteLength(jsonString, 'utf8'),
    checksum,
    manifest,
    ipAddress: reqMeta.ip || '',
    notes: `Exported ${manifest.totalRecords} records across 9 modules`,
  });

  return {
    jsonString,
    filename,
    checksum,
    manifest,
    fileSize: Buffer.byteLength(jsonString, 'utf8'),
  };
};

export const previewRestoreBackup = async (teacherId, backupRawData, reqMeta = {}) => {
  let backupData;
  if (typeof backupRawData === 'string') {
    try {
      backupData = JSON.parse(backupRawData);
    } catch (e) {
      throw new Error('Invalid JSON format: Uploaded backup file is corrupted or not a valid JSON document.');
    }
  } else {
    backupData = backupRawData;
  }

  if (!backupData || (!backupData.collections && !backupData.data)) {
    throw new Error('Invalid backup schema: Missing collections or data sections.');
  }

  const collections = backupData.collections || backupData.data || {};
  const user = await User.findById(teacherId);

  // Fetch current database counts
  const [
    timetables,
    lessonPlans,
    diaryEntries,
    attendance,
    practicals,
    assessments,
    syllabus,
  ] = await Promise.all([
    Timetable.findForTeacher(teacherId),
    LessonPlan.findForTeacher(teacherId),
    DailyTeachingEntry.findForTeacher(teacherId),
    Attendance.findForTeacher(teacherId),
    PracticalActivity.findForTeacher(teacherId),
    Assessment.findForTeacher(teacherId),
    SyllabusProgress.findForTeacher(teacherId),
  ]);

  const incomingCounts = {
    timetables: collections.timetables?.length || 0,
    lessonPlans: collections.lessonPlans?.length || 0,
    diaryEntries: collections.diaryEntries?.length || 0,
    attendance: collections.attendance?.length || 0,
    practicals: collections.practicals?.length || 0,
    assessments: collections.assessments?.length || 0,
    syllabus: collections.syllabus?.length || 0,
  };

  const existingCounts = {
    timetables: timetables.length,
    lessonPlans: lessonPlans.length,
    diaryEntries: diaryEntries.length,
    attendance: attendance.length,
    practicals: practicals.length,
    assessments: assessments.length,
    syllabus: syllabus.length,
  };

  // Conflict calculation: Timetable day+period, Diary date+period
  let timetableConflicts = 0;
  if (Array.isArray(collections.timetables)) {
    for (const inTT of collections.timetables) {
      if (
        timetables.some(
          (ex) =>
            ex.dayOfWeek === inTT.dayOfWeek &&
            Number(ex.period) === Number(inTT.period) &&
            (ex.academicYear || '2026-2027') === (inTT.academicYear || '2026-2027')
        )
      ) {
        timetableConflicts++;
      }
    }
  }

  let diaryConflicts = 0;
  if (Array.isArray(collections.diaryEntries)) {
    for (const inDiary of collections.diaryEntries) {
      const inDate = new Date(inDiary.date).toISOString().split('T')[0];
      if (
        diaryEntries.some((ex) => {
          const exDate = new Date(ex.date).toISOString().split('T')[0];
          return exDate === inDate && Number(ex.period) === Number(inDiary.period);
        })
      ) {
        diaryConflicts++;
      }
    }
  }

  const preview = {
    valid: true,
    portal: backupData.app || 'AI Teacher Documentation Management Portal',
    version: backupData.version || '1.0.0',
    exportDate: backupData.exportDate || 'Unknown',
    sourceTeacher: backupData.teacher?.fullName || 'Unknown',
    sourceEmail: backupData.teacher?.email || 'Unknown',
    targetTeacherMatch: backupData.teacher?.email === user?.email,
    incomingCounts,
    existingCounts,
    conflictsSummary: {
      timetableConflicts,
      diaryConflicts,
      hasConflicts: timetableConflicts > 0 || diaryConflicts > 0,
    },
    recommendedStrategy: timetableConflicts > 0 || diaryConflicts > 0 ? 'merge' : 'overwrite',
  };

  await BackupLog.create({
    teacherId,
    action: 'preview_restore',
    status: 'success',
    manifest: incomingCounts,
    ipAddress: reqMeta.ip || '',
    notes: `Dry run preview of ${Object.values(incomingCounts).reduce((a, b) => a + b, 0)} incoming records.`,
  });

  return preview;
};

export const executeRestoreBackup = async (
  teacherId,
  backupRawData,
  strategy = 'merge',
  reqMeta = {}
) => {
  let backupData;
  if (typeof backupRawData === 'string') {
    backupData = JSON.parse(backupRawData);
  } else {
    backupData = backupRawData;
  }

  const collections = backupData.collections || backupData.data || {};
  let recordsRestored = 0;

  // Restore Timetables
  if (Array.isArray(collections.timetables)) {
    for (const tt of collections.timetables) {
      try {
        await Timetable.create({
          ...tt,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        // If conflict and strategy is merge, skip gracefully
        if (err.code !== 11000 && !err.message.includes('already exists')) {
          console.warn('[Restore Warning] Timetable restore skipped:', err.message);
        }
      }
    }
  }

  // Restore Lesson Plans
  if (Array.isArray(collections.lessonPlans)) {
    for (const lp of collections.lessonPlans) {
      try {
        await LessonPlan.create({
          ...lp,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] LessonPlan restore skipped:', err.message);
      }
    }
  }

  // Restore Daily Teaching Diary
  if (Array.isArray(collections.diaryEntries)) {
    for (const d of collections.diaryEntries) {
      try {
        await DailyTeachingEntry.create({
          ...d,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] Diary restore skipped:', err.message);
      }
    }
  }

  // Restore Attendance
  if (Array.isArray(collections.attendance)) {
    for (const att of collections.attendance) {
      try {
        await Attendance.create({
          ...att,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] Attendance restore skipped:', err.message);
      }
    }
  }

  // Restore Practical Activities
  if (Array.isArray(collections.practicals)) {
    for (const p of collections.practicals) {
      try {
        await PracticalActivity.create({
          ...p,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] Practical restore skipped:', err.message);
      }
    }
  }

  // Restore Assessments
  if (Array.isArray(collections.assessments)) {
    for (const a of collections.assessments) {
      try {
        await Assessment.create({
          ...a,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] Assessment restore skipped:', err.message);
      }
    }
  }

  // Restore Syllabus Progress
  if (Array.isArray(collections.syllabus)) {
    for (const s of collections.syllabus) {
      try {
        await SyllabusProgress.create({
          ...s,
          teacherId,
        });
        recordsRestored++;
      } catch (err) {
        console.warn('[Restore Warning] Syllabus restore skipped:', err.message);
      }
    }
  }

  await BackupLog.create({
    teacherId,
    action: 'restore',
    status: 'success',
    restoreStrategy: strategy,
    recordsRestored,
    ipAddress: reqMeta.ip || '',
    notes: `Restored ${recordsRestored} records using ${strategy} strategy.`,
  });

  return {
    success: true,
    recordsRestored,
    strategy,
  };
};

export const getBackupLogs = async (teacherId) => {
  return await BackupLog.find({ teacherId });
};
