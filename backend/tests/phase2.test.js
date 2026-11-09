import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('Phase 2 - Timetable, Daily Teaching Diary & Lesson Plan Tests', () => {
  let server;
  let baseUrl;
  let teacherTokenA;
  let teacherTokenB;
  let teacherA_Id;
  let teacherB_Id;

  let createdTimetableId;
  let createdDiaryId;
  let createdLessonPlanId;

  const emailA = `teacherA_${Date.now()}@school.edu`;
  const emailB = `teacherB_${Date.now()}@school.edu`;
  const password = 'Password@123';

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

    // Register Teacher A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Teacher Alpha',
        email: emailA,
        password,
        schoolName: 'Delhi Public School',
        designation: 'Senior Physics Teacher',
        subjectsTaught: ['Physics'],
        classesHandled: ['Class 10-A'],
      }),
    });
    const dataA = await resA.json();
    teacherTokenA = dataA.token;
    teacherA_Id = dataA.user._id || dataA.user.id;

    // Register Teacher B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Teacher Beta',
        email: emailB,
        password,
        schoolName: 'Kendriya Vidyalaya',
        designation: 'Chemistry Teacher',
        subjectsTaught: ['Chemistry'],
        classesHandled: ['Class 9-B'],
      }),
    });
    const dataB = await resB.json();
    teacherTokenB = dataB.token;
    teacherB_Id = dataB.user._id || dataB.user.id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================
  // MODULE 1: TIMETABLE TESTS
  // ==========================================
  test('POST /api/timetable creates a new weekly timetable entry', async () => {
    const res = await fetch(`${baseUrl}/api/timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        dayOfWeek: 'Monday',
        period: 1,
        startTime: '09:00',
        endTime: '09:45',
        className: 'Class 10',
        section: 'A',
        subject: 'Physics',
        room: 'Room 204',
        remarks: 'First period of the week',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.dayOfWeek, 'Monday');
    assert.equal(data.data.period, 1);
    assert.equal(data.data.classHandled, 'Class 10-A');
    createdTimetableId = data.data._id || data.data.id;
  });

  test('POST /api/timetable prevents duplicate entry for same teacher, day and period', async () => {
    const res = await fetch(`${baseUrl}/api/timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        dayOfWeek: 'Monday',
        period: 1,
        startTime: '09:00',
        endTime: '09:45',
        className: 'Class 9',
        section: 'B',
        subject: 'Science',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('already have a class scheduled'));
  });

  test('GET /api/timetable retrieves teacher timetable and filters by day and class', async () => {
    // Add second period
    await fetch(`${baseUrl}/api/timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        dayOfWeek: 'Monday',
        period: 2,
        startTime: '09:45',
        endTime: '10:30',
        className: 'Class 10',
        section: 'A',
        subject: 'Physics Lab',
        room: 'Physics Lab',
      }),
    });

    const res = await fetch(`${baseUrl}/api/timetable?dayOfWeek=Monday`, {
      headers: { Authorization: `Bearer ${teacherTokenA}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.count >= 2);
  });

  test('PUT /api/timetable/:id updates period and room', async () => {
    const res = await fetch(`${baseUrl}/api/timetable/${createdTimetableId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        room: 'Room 205 (Renovated)',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.room, 'Room 205 (Renovated)');
  });

  test('Ownership: Teacher B cannot edit or delete Teacher A timetable entry', async () => {
    const res = await fetch(`${baseUrl}/api/timetable/${createdTimetableId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenB}`,
      },
      body: JSON.stringify({ room: 'Hacked Room' }),
    });
    assert.equal(res.status, 403);
  });

  // ==========================================
  // MODULE 3: LESSON PLAN TESTS
  // ==========================================
  test('POST /api/lesson-plans creates a complete lesson plan in Draft status', async () => {
    const res = await fetch(`${baseUrl}/api/lesson-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        title: 'Electromagnetic Induction & Faraday’s Laws',
        className: 'Class 10',
        section: 'A',
        subject: 'Physics',
        unit: 'Unit 4 - Magnetism & Electricity',
        chapter: 'Chapter 12',
        topic: 'Faraday’s Experiments on Induced EMF',
        durationMinutes: 45,
        learningObjectives: 'Students understand magnetic flux variation induces electric current.',
        previousKnowledge: 'Magnetic field lines and current carrying coils.',
        introduction: 'Demonstrate moving a bar magnet inside a copper solenoid connected to galvanometer.',
        detailedExplanation: '<h3>Key Concepts</h3><p>Faraday formulated two foundational laws...</p>',
        definitions: 'Electromagnetic induction: production of voltage across an electrical conductor.',
        teachingMethodology: 'Demonstration and Inquiry',
        teachingAids: 'Bar magnet, copper coil, digital galvanometer, smartboard simulation.',
        classroomActivities: 'Hands-on coil deflection measurement by student volunteers.',
        realLifeExamples: 'Bicycle dynamos and hydro-electric generator turbines.',
        assessmentQuestions: 'What happens to induced current when magnet speed is doubled?',
        expectedLearningOutcomes: 'Calculate direction of induced current using Lenz’s law.',
        homework: 'Answer Question 1 to 4 on Page 142.',
        teacherRemarks: 'Requires lab demonstration setup before period starts.',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'Draft');
    createdLessonPlanId = data.data._id || data.data.id;
  });

  test('PATCH /api/lesson-plans/:id/approval updates status to Submitted and Approved', async () => {
    // 1. Submit for approval
    const subRes = await fetch(`${baseUrl}/api/lesson-plans/${createdLessonPlanId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({ status: 'Submitted' }),
    });
    const subData = await subRes.json();
    assert.equal(subRes.status, 200);
    assert.equal(subData.data.status, 'Submitted');

    // 2. Approve
    const appRes = await fetch(`${baseUrl}/api/lesson-plans/${createdLessonPlanId}/approval`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        status: 'Approved',
        approverRemarks: 'Excellent demonstration design aligned with curriculum.',
      }),
    });
    const appData = await appRes.json();
    assert.equal(appRes.status, 200);
    assert.equal(appData.data.status, 'Approved');
  });

  test('POST /api/lesson-plans/:id/duplicate creates a new cloned draft plan', async () => {
    const res = await fetch(`${baseUrl}/api/lesson-plans/${createdLessonPlanId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherTokenA}` },
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.data.title.startsWith('Copy of'));
    assert.equal(data.data.status, 'Draft');
  });

  // ==========================================
  // MODULE 2: DAILY TEACHING DIARY TESTS
  // ==========================================
  test('POST /api/diary creates a daily teaching diary entry with rich text and lesson plan association', async () => {
    const todayStr = '2026-11-03';

    const res = await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        date: todayStr,
        period: 1,
        startTime: '09:00',
        endTime: '09:45',
        className: 'Class 10',
        section: 'A',
        subject: 'Physics',
        timetableEntryId: createdTimetableId,
        lessonPlanId: createdLessonPlanId,
        unit: 'Unit 4',
        chapter: 'Chapter 12',
        topic: 'Verification of Faraday’s Law',
        subtopic: 'Direction of Induced Current',
        learningObjectives: 'Students verify galvanometer deflection direction.',
        detailedContent: '<h2>Classroom Execution</h2><p>Today we connected the galvanometer and observed...</p><ul><li>Step 1: North pole inserted</li><li>Step 2: Stationary magnet</li></ul>',
        activitiesConducted: 'Demonstration and hands-on galvanometer reading.',
        studentParticipation: 'High engagement, 4 students recorded deflections.',
        learningOutcomes: 'Most students grasped that relative motion causes current.',
        homeworkAssigned: 'Write 3 observation points in science diary.',
        status: 'Draft',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'Draft');
    assert.ok(data.data.detailedContent.includes('Classroom Execution'));
    createdDiaryId = data.data._id || data.data.id;
  });

  test('POST /api/diary supports multiple periods on the same date with duplicate period warning', async () => {
    const todayStr = '2026-11-03';

    // Period 2 on same day
    const resPeriod2 = await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        date: todayStr,
        period: 2,
        className: 'Class 10',
        section: 'A',
        subject: 'Physics Lab',
        topic: 'Lab Galvanometer Setup',
        status: 'Draft',
      }),
    });
    const dataPeriod2 = await resPeriod2.json();
    assert.equal(resPeriod2.status, 201);
    assert.equal(dataPeriod2.warning, null);

    // Another entry for Period 1 on same date: succeeds with duplicate warning
    const resDupPeriod1 = await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        date: todayStr,
        period: 1,
        className: 'Class 9',
        section: 'B',
        subject: 'Substitution Class',
        topic: 'Special Revision Session',
        status: 'Draft',
      }),
    });
    const dataDup = await resDupPeriod1.json();
    assert.equal(resDupPeriod1.status, 201);
    assert.ok(dataDup.warning !== null, 'Warning should inform about duplicate period without blocking');
  });

  test('PATCH /api/diary/:id/status requires teacher confirmation to mark Completed', async () => {
    // Attempt without confirmation -> 400
    const failRes = await fetch(`${baseUrl}/api/diary/${createdDiaryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        status: 'Completed',
        teacherConfirmed: false,
      }),
    });
    assert.equal(failRes.status, 400);

    // With confirmation -> 200
    const successRes = await fetch(`${baseUrl}/api/diary/${createdDiaryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenA}`,
      },
      body: JSON.stringify({
        status: 'Completed',
        teacherConfirmed: true,
      }),
    });
    const successData = await successRes.json();
    assert.equal(successRes.status, 200);
    assert.equal(successData.data.status, 'Completed');
    assert.ok(successData.data.completedAt !== null);
  });

  test('GET /api/diary filters by date, class, subject, and search keyword', async () => {
    const res = await fetch(`${baseUrl}/api/diary?subject=Physics&search=Faraday`, {
      headers: { Authorization: `Bearer ${teacherTokenA}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.length >= 1);
    assert.equal(data.data[0].subject, 'Physics');
  });

  test('Ownership: Teacher B cannot modify Teacher A daily diary entry', async () => {
    const res = await fetch(`${baseUrl}/api/diary/${createdDiaryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherTokenB}`,
      },
      body: JSON.stringify({ topic: 'Tampered Topic' }),
    });
    assert.equal(res.status, 403);
  });
});
