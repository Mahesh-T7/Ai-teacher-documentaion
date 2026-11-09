import { TeachingRecord } from '../models/TeachingRecord.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';
import { LessonPlan } from '../models/LessonPlan.js';
import { PracticalActivity } from '../models/PracticalActivity.js';
import { Timetable } from '../models/Timetable.js';
import { SyllabusProgress } from '../models/SyllabusProgress.js';

// @desc    Get live dashboard statistics and overview for the logged-in teacher
// @route   GET /api/dashboard/stats
// @access  Private (Protected)
export const getDashboardStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;

    // Fetch live aggregations from database models
    const [
      totalTeachingDays,
      totalClassesConducted,
      totalLessonPlans,
      practicalActivities,
      syllabusPercentage,
      legacyRecentRecords,
      upcomingTimetable,
      pendingCount,
      allDiaryEntries,
    ] = await Promise.all([
      TeachingRecord.getDistinctTeachingDays(teacherId),
      TeachingRecord.countForTeacher(teacherId, { status: 'Completed' }),
      LessonPlan.countForTeacher(teacherId),
      PracticalActivity.countForTeacher(teacherId),
      SyllabusProgress.getAverageCompletion(teacherId),
      TeachingRecord.findRecent(teacherId, 5),
      Timetable.findUpcomingForTeacher(teacherId),
      TeachingRecord.countPending(teacherId),
      DailyTeachingEntry.findForTeacher(teacherId),
    ]);

    // Calculate core simplified metrics requested:
    // 1. Total Teaching Records
    const totalTeachingRecords = Math.max(allDiaryEntries.length, totalClassesConducted);

    // 2. Records This Month
    const now = new Date();
    const recordsThisMonth = allDiaryEntries.filter((d) => {
      const dt = new Date(d.date);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;

    // 3. Classes Covered
    const classSet = new Set(req.user.classesHandled || []);
    allDiaryEntries.forEach((d) => {
      if (d.classHandled) classSet.add(d.classHandled);
      else if (d.className) classSet.add(d.className);
    });
    const classesCovered = classSet.size;

    // 4. Pending Drafts
    const diaryDraftsCount = allDiaryEntries.filter((d) => d.status === 'Draft').length;
    const draftPlansCount = await LessonPlan.countForTeacher(teacherId, { status: 'Draft' });
    const pendingDrafts = diaryDraftsCount + draftPlansCount;

    // Unified recent records
    const recentTeachingRecords =
      allDiaryEntries.length > 0 ? allDiaryEntries.slice(0, 5) : legacyRecentRecords;

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalTeachingRecords,
          recordsThisMonth,
          classesCovered,
          pendingDrafts,
          // Backward compatibility metrics
          totalTeachingDays,
          totalClassesConducted,
          totalLessonPlans,
          completedSyllabusPercentage: syllabusPercentage,
          practicalActivities,
          pendingDocumentation: pendingDrafts,
        },
        recentTeachingRecords,
        upcomingTimetable,
        breakdown: {
          pendingTeachingRecords: diaryDraftsCount || pendingCount,
          draftLessonPlans: draftPlansCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed realistic initial teaching data into MongoDB for a newly registered teacher
// @route   POST /api/dashboard/seed
// @access  Private (Protected)
export const seedInitialData = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const subjects = req.user.subjectsTaught?.length > 0 ? req.user.subjectsTaught : ['Science', 'Mathematics'];
    const primarySubject = subjects[0] || 'General Science';
    const classes = req.user.classesHandled?.length > 0 ? req.user.classesHandled : ['Class 9-A', 'Class 10-B'];
    const primaryClass = classes[0] || 'Class 10-A';

    // 1. Create realistic Teaching Records
    const sampleDates = [
      new Date(Date.now() - 3 * 86400000),
      new Date(Date.now() - 2 * 86400000),
      new Date(Date.now() - 1 * 86400000),
      new Date(),
    ];

    const records = [
      {
        teacherId,
        date: sampleDates[0],
        period: 1,
        classHandled: primaryClass,
        subject: primarySubject,
        topicCovered: 'Introduction to Mechanics & Newton’s Laws',
        learningObjectives: 'Students understand inertia and action-reaction pairs.',
        homeworkAssigned: 'Solve Exercise 4.1 Questions 1 to 5.',
        status: 'Completed',
      },
      {
        teacherId,
        date: sampleDates[1],
        period: 3,
        classHandled: classes[1] || primaryClass,
        subject: primarySubject,
        topicCovered: 'Chemical Reactions and Catalysis',
        learningObjectives: 'Differentiate between exothermic and endothermic processes.',
        homeworkAssigned: 'Prepare lab chart on reaction types.',
        status: 'Completed',
      },
      {
        teacherId,
        date: sampleDates[2],
        period: 2,
        classHandled: primaryClass,
        subject: primarySubject,
        topicCovered: 'Electromagnetic Induction & Faraday’s Experiments',
        learningObjectives: 'Demonstrate induced current using coil and magnet.',
        homeworkAssigned: 'Review textbook diagrams 6.2 and 6.3.',
        status: 'Completed',
      },
      {
        teacherId,
        date: sampleDates[3],
        period: 4,
        classHandled: primaryClass,
        subject: primarySubject,
        topicCovered: 'Modern Optics: Reflection & Refraction Laws',
        learningObjectives: 'Calculate refractive indices of glass and water prisms.',
        homeworkAssigned: 'Complete laboratory observation table.',
        status: 'Pending',
      },
    ];

    for (const r of records) {
      await TeachingRecord.create(r);
    }

    // 2. Create sample Lesson Plans
    await LessonPlan.create({
      teacherId,
      title: 'Optics and Ray Diagrams in Spherical Lenses',
      subject: primarySubject,
      classHandled: primaryClass,
      unitOrChapter: 'Unit 4 - Light & Energy',
      durationMinutes: 45,
      status: 'Approved',
      pedagogyMethod: 'Interactive Demonstration',
    });

    await LessonPlan.create({
      teacherId,
      title: 'Organic Chemistry: Hydrocarbons and Polymerization',
      subject: primarySubject,
      classHandled: classes[1] || primaryClass,
      unitOrChapter: 'Unit 7 - Carbon Compounds',
      durationMinutes: 45,
      status: 'Draft',
      pedagogyMethod: 'Collaborative Group Work',
    });

    // 3. Create sample Practical Activities
    await PracticalActivity.create({
      teacherId,
      title: 'Verification of Ohm’s Law using Voltmeter & Ammeter',
      subject: primarySubject,
      classHandled: primaryClass,
      labName: 'Physics Laboratory',
      conductedDate: sampleDates[1],
      studentsPresent: 34,
      status: 'Completed',
    });

    await PracticalActivity.create({
      teacherId,
      title: 'Acid-Base Titration with Phenolphthalein Indicator',
      subject: primarySubject,
      classHandled: classes[1] || primaryClass,
      labName: 'Chemistry Laboratory',
      conductedDate: sampleDates[2],
      studentsPresent: 32,
      status: 'Completed',
    });

    // 4. Create sample Syllabus Progress
    await SyllabusProgress.create({
      teacherId,
      subject: primarySubject,
      classHandled: primaryClass,
      term: 'Term 1',
      totalTopics: 20,
      completedTopics: 14, // 70%
    });

    // 5. Create Timetable
    const timetableEntries = [
      { teacherId, dayOfWeek: 'Monday', period: 1, timeSlot: '09:00 - 09:45', classHandled: primaryClass, subject: primarySubject, room: 'Room 101' },
      { teacherId, dayOfWeek: 'Monday', period: 3, timeSlot: '10:45 - 11:30', classHandled: classes[1] || primaryClass, subject: primarySubject, room: 'Science Lab' },
      { teacherId, dayOfWeek: 'Tuesday', period: 2, timeSlot: '09:45 - 10:30', classHandled: primaryClass, subject: primarySubject, room: 'Room 101' },
      { teacherId, dayOfWeek: 'Wednesday', period: 1, timeSlot: '09:00 - 09:45', classHandled: classes[1] || primaryClass, subject: primarySubject, room: 'Room 102' },
      { teacherId, dayOfWeek: 'Thursday', period: 4, timeSlot: '11:45 - 12:30', classHandled: primaryClass, subject: primarySubject, room: 'Room 101' },
      { teacherId, dayOfWeek: 'Friday', period: 2, timeSlot: '09:45 - 10:30', classHandled: primaryClass, subject: primarySubject, room: 'Physics Lab' },
    ];

    for (const entry of timetableEntries) {
      await Timetable.create(entry);
    }

    res.status(201).json({
      success: true,
      message: 'Initial teaching documentation records seeded into database successfully.',
    });
  } catch (error) {
    next(error);
  }
};
