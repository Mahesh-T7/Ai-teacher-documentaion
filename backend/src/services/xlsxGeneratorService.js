import ExcelJS from 'exceljs';

/**
 * Strips HTML tags for clean spreadsheet cells
 */
const cleanHtmlToPlainText = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

export const generateXlsxReport = async (reportData) => {
  const {
    teacher,
    meta,
    diaryEntries = [],
    attendanceRecords = [],
    practicals = [],
    assessments = [],
    photos = [],
  } = reportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Teacher Documentation Management Portal';
  workbook.created = new Date();

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
  };

  const headerFont = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const styleHeaderRow = (row) => {
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  // 1. WORKSHEET: Daily Teaching Records
  const wsDiary = workbook.addWorksheet('Daily Teaching Records');
  wsDiary.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Day', key: 'day', width: 12 },
    { header: 'Class', key: 'className', width: 10 },
    { header: 'Sec', key: 'section', width: 8 },
    { header: 'Period', key: 'period', width: 8 },
    { header: 'Subject', key: 'subject', width: 18 },
    { header: 'Unit', key: 'unit', width: 16 },
    { header: 'Topic', key: 'topic', width: 24 },
    { header: 'Detailed Teaching Content', key: 'content', width: 45 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Homework', key: 'homework', width: 20 },
  ];
  styleHeaderRow(wsDiary.getRow(1));

  diaryEntries.forEach((d) => {
    wsDiary.addRow({
      date: new Date(d.date).toLocaleDateString('en-GB'),
      day: d.day || '',
      className: d.className || '',
      section: d.section || 'A',
      period: d.periodNumber || 1,
      subject: d.subject || '',
      unit: d.unit || '',
      topic: d.topic || '',
      content: cleanHtmlToPlainText(d.detailedExplanation),
      status: d.status || 'Completed',
      homework: d.completion?.homeworkAssigned || '',
    });
  });

  // 2. WORKSHEET: Weekly Summary
  const wsWeekly = workbook.addWorksheet('Weekly Summary');
  wsWeekly.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  styleHeaderRow(wsWeekly.getRow(1));
  wsWeekly.addRows([
    { metric: 'Teacher Name', value: teacher.fullName },
    { metric: 'School Name', value: teacher.schoolName },
    { metric: 'Reporting Window', value: `${new Date(meta.startDate).toLocaleDateString('en-GB')} to ${new Date(meta.endDate).toLocaleDateString('en-GB')}` },
    { metric: 'Configured Working Days', value: meta.configuredWorkingDays },
    { metric: 'Actual Recorded Teaching Days', value: meta.actualTeachingDays },
    { metric: 'Total Classes Conducted', value: meta.totalClassesConducted },
    { metric: 'Completed Lessons', value: meta.completedClassesCount },
    { metric: 'Partially Completed Lessons', value: meta.partiallyCompletedCount },
    { metric: 'Photographs Documented', value: meta.photosCount },
    { metric: 'Average Class Attendance', value: `${meta.overallAttendancePercentage}%` },
    { metric: 'Average Assessment Score', value: `${meta.overallAssessmentAverage}%` },
  ]);

  // 3. WORKSHEET: Monthly Summary
  const wsMonthly = workbook.addWorksheet('Monthly Summary');
  wsMonthly.columns = [
    { header: 'Academic Month', key: 'month', width: 16 },
    { header: 'Academic Year', key: 'year', width: 14 },
    { header: 'Class Handled', key: 'classHandled', width: 16 },
    { header: 'Classes Conducted', key: 'classes', width: 18 },
    { header: 'Practicals Conducted', key: 'practicals', width: 20 },
    { header: 'Assessments Conducted', key: 'assessments', width: 22 },
    { header: 'Audit Status', key: 'status', width: 16 },
  ];
  styleHeaderRow(wsMonthly.getRow(1));
  wsMonthly.addRow({
    month: new Date(meta.startDate).toLocaleDateString('en-US', { month: 'long' }),
    year: meta.academicYear,
    classHandled: meta.className,
    classes: meta.totalClassesConducted,
    practicals: practicals.length,
    assessments: assessments.length,
    status: meta.totalClassesConducted > 0 ? 'Verified' : 'Pending',
  });

  // 4. WORKSHEET: Attendance
  const wsAttendance = workbook.addWorksheet('Attendance');
  wsAttendance.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Section', key: 'section', width: 8 },
    { header: 'Total Students', key: 'total', width: 14 },
    { header: 'Present', key: 'present', width: 12 },
    { header: 'Absent', key: 'absent', width: 12 },
    { header: 'Leave', key: 'leave', width: 12 },
    { header: 'Attendance %', key: 'pct', width: 14 },
  ];
  styleHeaderRow(wsAttendance.getRow(1));

  attendanceRecords.forEach((att) => {
    wsAttendance.addRow({
      date: new Date(att.date).toLocaleDateString('en-GB'),
      class: att.className,
      section: att.section || 'A',
      total: att.totalStudents,
      present: att.presentCount,
      absent: att.absentCount,
      leave: att.leaveCount,
      pct: `${att.attendancePercentage}%`,
    });
  });

  // 5. WORKSHEET: Practical Activities
  const wsPracticals = workbook.addWorksheet('Practical Activities');
  wsPracticals.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Subject', key: 'subject', width: 16 },
    { header: 'Experiment Title', key: 'title', width: 26 },
    { header: 'Tools & Software Used', key: 'tools', width: 26 },
    { header: 'Learning Outcomes', key: 'outcomes', width: 35 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  styleHeaderRow(wsPracticals.getRow(1));

  practicals.forEach((p) => {
    wsPracticals.addRow({
      date: new Date(p.date).toLocaleDateString('en-GB'),
      class: p.className,
      subject: p.subject,
      title: p.activityTitle,
      tools: p.toolsAndSoftwareUsed || 'Standard Lab',
      outcomes: p.learningOutcomes || 'Experiment completed',
      status: p.status,
    });
  });

  // 6. WORKSHEET: Assessments
  const wsAssessments = workbook.addWorksheet('Assessments');
  wsAssessments.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Assessment Title', key: 'title', width: 24 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Max Marks', key: 'max', width: 12 },
    { header: 'Appeared', key: 'appeared', width: 12 },
    { header: 'Class Average %', key: 'avg', width: 16 },
    { header: 'Highest Marks', key: 'high', width: 14 },
    { header: 'Lowest Marks', key: 'low', width: 14 },
    { header: 'Gaps Identified', key: 'gaps', width: 30 },
  ];
  styleHeaderRow(wsAssessments.getRow(1));

  assessments.forEach((a) => {
    wsAssessments.addRow({
      date: new Date(a.date).toLocaleDateString('en-GB'),
      class: a.className,
      title: a.assessmentTitle,
      type: a.assessmentType,
      max: a.maximumMarks,
      appeared: a.totalStudentsAppeared,
      avg: `${a.classAverage}%`,
      high: a.highestMarks,
      low: a.lowestMarks,
      gaps: a.learningGapsIdentified || 'None',
    });
  });

  // 7. WORKSHEET: Syllabus Progress
  const wsSyllabus = workbook.addWorksheet('Syllabus Progress');
  wsSyllabus.columns = [
    { header: 'Class', key: 'class', width: 12 },
    { header: 'Subject', key: 'subject', width: 18 },
    { header: 'Total Classes Logged', key: 'total', width: 20 },
    { header: 'Units Covered', key: 'units', width: 35 },
    { header: 'Completion %', key: 'pct', width: 16 },
  ];
  styleHeaderRow(wsSyllabus.getRow(1));

  const uniqueUnits = Array.from(new Set(diaryEntries.map((d) => d.unit).filter(Boolean)));
  wsSyllabus.addRow({
    class: meta.className,
    subject: meta.subject,
    total: diaryEntries.length,
    units: uniqueUnits.join(', ') || 'Core units',
    pct: `${Math.min(100, uniqueUnits.length * 20)}%`,
  });

  // 8. WORKSHEET: Photo Evidence Index
  const wsPhotos = workbook.addWorksheet('Photo Evidence Index');
  wsPhotos.columns = [
    { header: 'Sl No', key: 'sl', width: 8 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Subject', key: 'subject', width: 16 },
    { header: 'File Name', key: 'filename', width: 28 },
    { header: 'Photo Caption', key: 'caption', width: 40 },
    { header: 'Relative Path / URL', key: 'url', width: 30 },
  ];
  styleHeaderRow(wsPhotos.getRow(1));

  photos.forEach((ph, idx) => {
    wsPhotos.addRow({
      sl: idx + 1,
      date: new Date(ph.date).toLocaleDateString('en-GB'),
      class: ph.className,
      subject: ph.subject,
      filename: ph.originalFileName,
      caption: ph.caption,
      url: ph.url,
    });
  });

  return await workbook.xlsx.writeBuffer();
};
