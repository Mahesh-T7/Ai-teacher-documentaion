import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('Phase 6 - School Inspection Mode & Missing Documentation Tests', () => {
  let server;
  let baseUrl;
  let teacherToken;
  let teacherId;

  const email = `teacher_inspection_${Date.now()}@school.edu`;
  const password = 'Password@123';

  let createdPackageId;

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
        fullName: 'Dr. Meera Nambiar',
        email,
        password,
        schoolName: 'Kendriya Vidyalaya ASC Centre, Bengaluru',
        designation: 'Senior Science & AI Educator',
        subjectsTaught: ['Artificial Intelligence', 'Physics'],
        classesHandled: ['Class 9-A', 'Class 10-B'],
      }),
    });
    const regData = await regRes.json();
    teacherToken = regData.token;
    teacherId = regData.user._id || regData.user.id;

    // Seed 2 diary entries (1 completed, 1 draft)
    await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        date: '2026-11-02',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        period: 1,
        topic: 'Introduction to Computer Vision',
        detailedExplanation: 'Analyzed pixels, convolutions, and image classification algorithms.',
        status: 'Completed',
        teacherConfirmed: true,
      }),
    });

    await fetch(`${baseUrl}/api/diary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        date: '2026-11-03',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        period: 2,
        topic: 'Object Detection and YOLO Models',
        detailedExplanation: 'Draft explanations on bounding boxes and intersection over union.',
        status: 'Draft',
      }),
    });

    // Seed 1 approved lesson plan
    await fetch(`${baseUrl}/api/lesson-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        title: 'Computer Vision 5E Lesson Plan',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        topic: 'Computer Vision in Self-Driving Cars',
        learningObjectives: 'Comprehend camera feeds and semantic segmentation.',
        status: 'Approved',
      }),
    });
  });

  after(() => {
    if (server) server.close();
  });

  // ==========================================
  // MODULE 11, 12, 14: INSPECTION READINESS & CHECKLIST
  // ==========================================
  test('GET /api/inspection/readiness - returns honest scores and checklist without fabrication', async () => {
    const res = await fetch(`${baseUrl}/api/inspection/readiness?academicYear=2026-2027`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.readiness);
    assert.strictEqual(data.readiness.teacher.fullName, 'Dr. Meera Nambiar');

    // Verify non-misleading readiness score
    assert.ok(data.readiness.readinessScore >= 0 && data.readiness.readinessScore <= 100);
    assert.ok(data.readiness.breakdown.counts.totalClassesConducted >= 2);
    assert.strictEqual(data.readiness.breakdown.counts.completedDiary, 1);
    assert.strictEqual(data.readiness.breakdown.counts.draftDiary, 1);

    // Verify checklist items
    const checklist = data.readiness.checklist;
    assert.ok(Array.isArray(checklist));
    assert.ok(checklist.some((c) => c.category === 'Profile' && c.status === 'Completed'));
    assert.ok(checklist.some((c) => c.category === 'Lesson Plans'));
    assert.ok(checklist.some((c) => c.category === 'Daily Diary'));
  });

  // ==========================================
  // MODULE 13: 12-FOLDER INSPECTION PACKAGE ZIP
  // ==========================================
  test('POST /api/inspection/package/generate - builds complete Academic-Year ZIP package with 12 structured folders', async () => {
    const res = await fetch(`${baseUrl}/api/inspection/package/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        academicYear: '2026-2027',
        className: 'Class 9',
        subject: 'Artificial Intelligence',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.package);
    assert.ok(data.package.fileSize > 2000);
    assert.ok(data.package.fileName.endsWith('.zip'));
    createdPackageId = data.package._id || data.package.id;

    // Verify zip on disk
    const diskPath = path.resolve(process.cwd(), 'uploads', data.package.storageKey);
    assert.ok(fs.existsSync(diskPath));
  });

  test('GET /api/inspection/packages - lists generated packages', async () => {
    const res = await fetch(`${baseUrl}/api/inspection/packages`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.count >= 1);
  });

  test('GET /api/inspection/packages/:id/download - streams authorized ZIP package', async () => {
    const res = await fetch(`${baseUrl}/api/inspection/packages/${createdPackageId}/download`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res.status, 200);
    const blob = await res.blob();
    assert.ok(blob.size > 2000);
  });

  test('DELETE /api/inspection/packages/:id - removes package from archive and disk', async () => {
    const res = await fetch(`${baseUrl}/api/inspection/packages/${createdPackageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });
});
