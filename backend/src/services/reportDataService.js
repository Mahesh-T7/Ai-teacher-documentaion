import { User } from '../models/User.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { UploadedPhoto } from '../models/UploadedPhoto.js';
import { Attendance } from '../models/Attendance.js';
import { PracticalActivity } from '../models/PracticalActivity.js';
import { Assessment } from '../models/Assessment.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { Timetable } from '../models/Timetable.js';

/**
 * Calculates working days between two dates (excluding Sundays) in Asia/Kolkata
 */
export const countSchoolWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 is Sunday
    if (dayOfWeek !== 0) {
      workingDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return workingDays;
};

/**
 * Aggregates complete authentic records for a teacher and given scope
 */
export const aggregateReportData = async (teacherId, params = {}) => {
  const {
    reportType = 'daily',
    startDate,
    endDate,
    className,
    section,
    subject,
    selectedPhotoIds = [],
    sectionsIncluded = [],
  } = params;

  // 1. Fetch Teacher Info
  const teacher = await User.findById(teacherId);

  // 2. Normalize Dates
  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date(start);
  end.setHours(23, 59, 59, 999);

  // 3. Fetch Diary Entries
  let diaryEntries = [];
  if (params.entryId) {
    const single = await DailyTeachingEntry.findById(params.entryId);
    if (single && String(single.teacherId) === String(teacherId)) {
      diaryEntries = [single];
    }
  } else {
    const diaryFilter = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
    if (className) diaryFilter.className = className;
    if (subject) diaryFilter.subject = subject;
    diaryEntries = await DailyTeachingEntry.findForTeacher(teacherId, diaryFilter);
  }

  // 4. Fetch Photos
  const allPhotos = await UploadedPhoto.findForTeacher(teacherId, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    className: className || undefined,
    subject: subject || undefined,
  });

  // Filter selected photos if IDs provided, else include photos matching range
  const photos =
    selectedPhotoIds && selectedPhotoIds.length > 0
      ? allPhotos.filter((p) => selectedPhotoIds.map(String).includes(String(p._id || p.id)))
      : allPhotos;

  // 5. Fetch Attendance
  const attendanceRecords = await Attendance.findForTeacher(teacherId, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    className: className || undefined,
    section: section || undefined,
  });

  // 6. Fetch Practical Activities
  const practicals = await PracticalActivity.findForTeacher(teacherId, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    className: className || undefined,
    subject: subject || undefined,
  });

  // 7. Fetch Assessments
  const assessments = await Assessment.findForTeacher(teacherId, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    className: className || undefined,
    subject: subject || undefined,
  });

  // 8. Timetable Schedule
  const timetable = await Timetable.findForTeacher(teacherId);

  // Calculations & Analytics
  const distinctTeachingDates = new Set(
    diaryEntries.map((d) => new Date(d.date).toISOString().split('T')[0])
  );
  const actualTeachingDays = distinctTeachingDates.size;
  const configuredWorkingDays = countSchoolWorkingDays(start, end);

  const completedClassesCount = diaryEntries.filter((d) => d.status === 'Completed').length;
  const partiallyCompletedCount = diaryEntries.filter((d) => d.status === 'Partially Completed').length;
  const draftCount = diaryEntries.filter((d) => d.status === 'Draft').length;

  // Overall attendance stats
  let totalAttPresents = 0;
  let totalAttStudents = 0;
  attendanceRecords.forEach((att) => {
    totalAttStudents += att.totalStudents || 0;
    totalAttPresents += att.presentCount || 0;
  });
  const overallAttendancePercentage =
    totalAttStudents > 0 ? Math.round((totalAttPresents / totalAttStudents) * 100) : 0;

  // Overall assessment stats
  let totalAssessmentPercentage = 0;
  assessments.forEach((ass) => {
    totalAssessmentPercentage += ass.classAverage || 0;
  });
  const overallAssessmentAverage =
    assessments.length > 0 ? Math.round(totalAssessmentPercentage / assessments.length) : 0;

  return {
    teacher: {
      id: teacher?._id || teacher?.id || teacherId,
      fullName: teacher?.fullName || 'Educator',
      schoolName: teacher?.schoolName || 'Government / Model School',
      designation: teacher?.designation || 'Teacher',
      email: teacher?.email || '',
      phone: teacher?.phoneNumber || '',
      preferredLanguage: teacher?.preferredLanguage || 'English',
    },
    meta: {
      reportType,
      academicYear: params.academicYear || '2026-2027',
      startDate: start,
      endDate: end,
      className: className || 'All Classes',
      section: section || 'All Sections',
      subject: subject || 'All Subjects',
      generatedAt: new Date(),
      timezone: 'Asia/Kolkata',
      configuredWorkingDays,
      actualTeachingDays,
      totalClassesConducted: diaryEntries.length,
      completedClassesCount,
      partiallyCompletedCount,
      draftCount,
      overallAttendancePercentage,
      overallAssessmentAverage,
      photosCount: photos.length,
      sectionsIncluded:
        sectionsIncluded.length > 0
          ? sectionsIncluded
          : ['basicInfo', 'lessonInfo', 'detailedContent', 'activities', 'outcomes', 'photos', 'signatures'],
    },
    diaryEntries,
    photos,
    attendanceRecords,
    practicals,
    assessments,
    timetable,
  };
};
