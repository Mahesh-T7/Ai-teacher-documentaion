import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('Phase 3 & 4 - AI Assistant & Classroom Documentation Tests', () => {
  let server;
  let baseUrl;
  let teacherToken;
  let teacherId;

  const email = `teacher_ai_${Date.now()}@school.edu`;
  const password = 'Password@123';

  let createdDraftId;
  let createdApprovedLessonPlanId;
  let createdStudentId;
  let createdAttendanceId;
  let createdPhotoId;
  let createdPracticalId;
  let createdAssessmentId;

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
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Ramesh Sharma',
        email,
        password,
        schoolName: 'Kendriya Vidyalaya',
        designation: 'Computer Science & AI Educator',
        subjectsTaught: ['Artificial Intelligence', 'Computer Science'],
        classesHandled: ['Class 9-A', 'Class 10-A'],
      }),
    });
    const data = await res.json();
    teacherToken = data.token;
    teacherId = data.user._id || data.user.id;
  });

  after(() => {
    if (server) server.close();
  });

  // ==========================================
  // PHASE 3: AI TEACHING ASSISTANT TESTS
  // ==========================================
  describe('AI Teaching Assistant Module', () => {
    test('GET /api/ai/syllabus - retrieves preconfigured CBSE Class 9 AI units', async () => {
      const res = await fetch(`${baseUrl}/api/ai/syllabus`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.units));
      assert.ok(data.units.length >= 5);
      assert.ok(data.units.some((u) => u.title.includes('Ethics') || u.title.includes('Generative AI')));
    });

    test('POST /api/ai/generate - generates pedagogical lesson plan and saves draft', async () => {
      const res = await fetch(`${baseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          toolType: 'lesson_plan',
          className: 'Class 9',
          section: 'A',
          subject: 'Artificial Intelligence',
          unit: 'Unit 4: Introduction to Generative AI',
          chapter: 'Chapter 1: Foundational Concepts of GenAI',
          topic: 'Prompt Engineering and LLMs',
          subtopic: 'Zero-shot vs Few-shot Prompting',
          teachingDuration: '45 mins',
          language: 'English',
          studentLevel: 'Intermediate',
          explanationDepth: 'Intermediate',
          additionalInstructions: 'Include interactive classroom role-play exercise',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.draft);
      assert.ok(data.draft.content);
      assert.strictEqual(data.draft.status, 'Draft');
      createdDraftId = data.draft._id || data.draft.id;
    });

    test('POST /api/ai/generate - supports bilingual Kannada + English generation', async () => {
      const res = await fetch(`${baseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          toolType: 'notes',
          className: 'Class 9',
          subject: 'Artificial Intelligence',
          unit: 'Unit 1: AI Reflection',
          topic: 'What is AI and Machine Learning?',
          language: 'Kannada + English',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.draft.content.length > 50);
    });

    test('GET /api/ai/drafts - retrieves drafts for authenticated teacher', async () => {
      const res = await fetch(`${baseUrl}/api/ai/drafts`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.count >= 2);
    });

    test('PUT /api/ai/drafts/:id - teacher edits and refines AI draft', async () => {
      const res = await fetch(`${baseUrl}/api/ai/drafts/${createdDraftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          content: '<h3>Modified AI Lesson Plan: Prompt Engineering</h3><p>Verified by teacher.</p>',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.draft.content.includes('Modified AI Lesson Plan'));
    });

    test('POST /api/ai/drafts/:id/approve - teacher approval converts draft into formal Lesson Plan', async () => {
      const res = await fetch(`${baseUrl}/api/ai/drafts/${createdDraftId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.draft.status, 'Approved');
      assert.ok(data.lessonPlan);
      createdApprovedLessonPlanId = data.lessonPlan._id || data.lessonPlan.id;
    });
  });

  // ==========================================
  // PHASE 4: PHOTO DOCUMENTATION TESTS
  // ==========================================
  describe('Photo Documentation Module', () => {
    test('POST /api/photos/upload - uploads classroom photo with metadata', async () => {
      const formData = new FormData();
      const fakeImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
      const blob = new Blob([fakeImageBytes], { type: 'image/png' });
      formData.append('photos', blob, 'robotics_lab_demo.png');
      formData.append('className', 'Class 9');
      formData.append('section', 'A');
      formData.append('subject', 'Artificial Intelligence');
      formData.append('unit', 'Unit 1: AI Reflection');
      formData.append('topic', 'Robotics Hands-on Demo');
      formData.append('caption', 'Students demonstrating smart obstacle-avoiding bot');
      formData.append('policyConsent', 'true');

      const res = await fetch(`${baseUrl}/api/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` },
        body: formData,
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.count, 1);
      createdPhotoId = data.photos[0]._id || data.photos[0].id;
      assert.ok(data.photos[0].url.startsWith('/uploads/'));
    });

    test('GET /api/photos - fetches photos with class and subject filters', async () => {
      const res = await fetch(`${baseUrl}/api/photos?className=Class+9&subject=Artificial+Intelligence`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.count >= 1);
      assert.strictEqual(data.photos[0].className, 'Class 9');
    });

    test('PUT /api/photos/:id - updates photo caption and metadata', async () => {
      const res = await fetch(`${baseUrl}/api/photos/${createdPhotoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          caption: 'Updated: Outstanding student robotics demonstration',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.photo.caption, 'Updated: Outstanding student robotics demonstration');
    });
  });

  // ==========================================
  // PHASE 4: ATTENDANCE & STUDENT ROSTER TESTS
  // ==========================================
  describe('Attendance & Student Roster Module', () => {
    test('POST /api/attendance/students - adds student to roster', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          studentName: 'Aarav Patel',
          admissionNumber: 'ADM-2026-9A-01',
          className: 'Class 9',
          section: 'A',
          rollNumber: 1,
          contactNumber: '9876543210',
          parentName: 'Mr. Patel',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.student.studentName, 'Aarav Patel');
      createdStudentId = data.student._id || data.student.id;
    });

    test('POST /api/attendance/students - prevents duplicate roll number in same class/section', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          studentName: 'Duplicate Roll Student',
          admissionNumber: 'ADM-2026-9A-99',
          className: 'Class 9',
          section: 'A',
          rollNumber: 1, // Same roll number
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('already exists'));
    });

    test('POST /api/attendance/students/import - bulk imports roster', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/students/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          className: 'Class 9',
          section: 'A',
          students: [
            { studentName: 'Bhavya Rao', rollNumber: 2, admissionNumber: 'ADM-9A-02' },
            { studentName: 'Chetan Kumar', rollNumber: 3, admissionNumber: 'ADM-9A-03' },
            { studentName: 'Divya N', rollNumber: 4, admissionNumber: 'ADM-9A-04' },
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.addedCount, 3);
    });

    test('POST /api/attendance - records daily roll call and calculates counts & percentage', async () => {
      const res = await fetch(`${baseUrl}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          date: '2026-11-03',
          className: 'Class 9',
          section: 'A',
          records: [
            { studentId: createdStudentId, studentName: 'Aarav Patel', rollNumber: 1, status: 'Present' },
            { studentId: 'stu_2', studentName: 'Bhavya Rao', rollNumber: 2, status: 'Present' },
            { studentId: 'stu_3', studentName: 'Chetan Kumar', rollNumber: 3, status: 'Absent', remarks: 'Sick leave' },
            { studentId: 'stu_4', studentName: 'Divya N', rollNumber: 4, status: 'Present' },
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.attendance.totalStudents, 4);
      assert.strictEqual(data.attendance.presentCount, 3);
      assert.strictEqual(data.attendance.absentCount, 1);
      assert.strictEqual(data.attendance.attendancePercentage, 75);
      createdAttendanceId = data.attendance._id || data.attendance.id;
    });

    test('POST /api/attendance - updating existing attendance updates audit history', async () => {
      const res = await fetch(`${baseUrl}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          date: '2026-11-03',
          className: 'Class 9',
          section: 'A',
          updateIfExisting: true,
          records: [
            { studentId: createdStudentId, studentName: 'Aarav Patel', rollNumber: 1, status: 'Present' },
            { studentId: 'stu_2', studentName: 'Bhavya Rao', rollNumber: 2, status: 'Present' },
            { studentId: 'stu_3', studentName: 'Chetan Kumar', rollNumber: 3, status: 'Leave', remarks: 'Parent note approved' },
            { studentId: 'stu_4', studentName: 'Divya N', rollNumber: 4, status: 'Present' },
          ],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.wasUpdated, true);
      assert.strictEqual(data.attendance.leaveCount, 1);
    });

    test('GET /api/attendance/summary/monthly - returns monthly attendance statistics', async () => {
      const res = await fetch(`${baseUrl}/api/attendance/summary/monthly?className=Class+9&section=A&month=11&year=2026`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.totalDaysRecorded, 1);
      assert.ok(Array.isArray(data.studentSummaries));
    });
  });

  // ==========================================
  // PHASE 4: PRACTICAL ACTIVITIES TESTS
  // ==========================================
  describe('Practical Activities Module', () => {
    test('POST /api/practicals - creates practical lab activity with tools & steps', async () => {
      const res = await fetch(`${baseUrl}/api/practicals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          className: 'Class 9',
          section: 'A',
          subject: 'Artificial Intelligence',
          unit: 'Unit 5: Introduction to Python',
          activityTitle: 'Basic Control Structures in Python IDLE',
          activityDescription: 'Writing if-else conditions and for loops to automate grade calculation.',
          toolsAndSoftwareUsed: 'Python 3.11, IDLE, Google Colab',
          practicalSteps: '1. Open IDLE\n2. Create grade_calc.py\n3. Execute loops\n4. Verify output',
          learningOutcomes: 'Students successfully wrote and debugged python programs with 100% test passing.',
          status: 'Completed',
          associatedPhotos: [createdPhotoId],
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.practical.activityTitle, 'Basic Control Structures in Python IDLE');
      createdPracticalId = data.practical._id || data.practical.id;
    });

    test('GET /api/practicals - searches and filters practical activities', async () => {
      const res = await fetch(`${baseUrl}/api/practicals?search=Python`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.practicals.length >= 1);
      assert.ok(data.practicals[0].activityTitle.includes('Python'));
    });
  });

  // ==========================================
  // PHASE 4: ASSESSMENT MANAGEMENT TESTS
  // ==========================================
  describe('Assessment Management Module', () => {
    test('POST /api/assessments - records assessment with student marks and auto-calculates statistics', async () => {
      const res = await fetch(`${baseUrl}/api/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          assessmentTitle: 'AI Ethics and Project Cycle Quiz',
          assessmentType: 'Quiz',
          date: '2026-11-03',
          className: 'Class 9',
          section: 'A',
          subject: 'Artificial Intelligence',
          maximumMarks: 20,
          associatedUnit: 'Unit 1: AI Ethics',
          studentMarks: [
            { studentName: 'Aarav Patel', rollNumber: 1, marksObtained: 18 }, // 90%
            { studentName: 'Bhavya Rao', rollNumber: 2, marksObtained: 15 },  // 75%
            { studentName: 'Chetan Kumar', rollNumber: 3, marksObtained: 6 },  // 30% -> Learning gap!
            { studentName: 'Divya N', rollNumber: 4, marksObtained: 19 },      // 95%
          ],
          learningGapsIdentified: 'Chetan needs help understanding Bias in Training Data.',
          remedialActionPlan: 'Conduct 1-on-1 review session on algorithmic fairness.',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.assessment.totalStudentsAppeared, 4);
      assert.strictEqual(data.assessment.highestMarks, 19);
      assert.strictEqual(data.assessment.lowestMarks, 6);
      assert.ok(data.assessment.classAverage > 0);
      createdAssessmentId = data.assessment._id || data.assessment.id;
    });

    test('GET /api/assessments/summary/overview - detects students needing remedial support', async () => {
      const res = await fetch(`${baseUrl}/api/assessments/summary/overview?className=Class+9`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.totalAssessments >= 1);
      assert.ok(data.studentsNeedingSupportCount >= 1);
      assert.ok(data.studentsNeedingSupport.some((s) => s.studentName === 'Chetan Kumar'));
    });
  });
});
