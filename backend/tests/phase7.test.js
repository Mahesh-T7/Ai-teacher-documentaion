import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.js';
import { storage } from '../src/config/storage.js';

describe('Phase 7 - Production Hardening, Cloud Storage, Backup & Restore Tests', () => {
  let server;
  let baseUrl;
  let teacherToken;
  let teacherId;
  const email = `phase7_teacher_${Date.now()}@kvbangalore.edu.in`;
  const password = 'SecurePassword@2026';

  before(async () => {
    // Start test server on dynamic port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
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
        fullName: 'Prof. Rajesh Kulkarni',
        email,
        password,
        schoolName: 'Delhi Public School, Whitefield',
        designation: 'HOD Computer Science & AI',
        subjectsTaught: ['Artificial Intelligence', 'Informatics Practices'],
        classesHandled: ['Class 9-A', 'Class 10-A'],
      }),
    });
    const regData = await regRes.json();
    teacherToken = regData.token;
    teacherId = regData.user._id || regData.user.id;

    // Seed 1 timetable entry
    await fetch(`${baseUrl}/api/timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        dayOfWeek: 'Monday',
        period: 1,
        startTime: '08:30 AM',
        endTime: '09:15 AM',
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        room: 'Lab-3',
      }),
    });

    // Seed 1 diary entry
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
        topic: 'Neural Networks Basics',
        detailedExplanation: 'Covered perceptrons, activation functions, and weights.',
        status: 'Completed',
        teacherConfirmed: true,
      }),
    });
  });

  after(() => {
    if (server) server.close();
  });

  // ==========================================
  // MODULE 17: PRODUCTION HARDENING & HEALTH
  // ==========================================
  test('GET /api/health - returns production status, storage provider and security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    // Verify security headers
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');

    const data = await res.json();
    assert.strictEqual(data.status, 'online');
    assert.strictEqual(data.version, '7.0.0');
    assert.ok(data.storage);
    assert.strictEqual(data.storage.provider, 'local');
  });

  // ==========================================
  // MODULE 18: PLUGGABLE STORAGE ADAPTER
  // ==========================================
  test('Storage adapter uploads and verifies file storage', async () => {
    const buffer = Buffer.from('Test teacher documentation document buffer');
    const result = await storage.uploadFile({
      buffer,
      filename: 'sample_test.txt',
      mimetype: 'text/plain',
      folder: 'tests',
    });

    assert.ok(result.storageKey);
    assert.ok(result.fileUrl);
    assert.strictEqual(result.fileSize, buffer.length);

    const readBuf = await storage.getFileBuffer(result.storageKey);
    assert.strictEqual(readBuf.toString(), buffer.toString());

    const deleted = await storage.deleteFile(result.storageKey);
    assert.strictEqual(deleted, true);
  });

  // ==========================================
  // MODULE 21: BACKUP & RESTORE MODULE
  // ==========================================
  let exportedBackupData = null;

  test('POST /api/backup/export - exports full teacher data JSON with checksum and manifest', async () => {
    const res = await fetch(`${baseUrl}/api/backup/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.backup);
    assert.ok(data.backup.checksum);
    assert.ok(data.backup.manifest.totalRecords >= 2);
    assert.strictEqual(data.backup.manifest.timetables, 1);
    assert.strictEqual(data.backup.manifest.diaryEntries, 1);

    exportedBackupData = JSON.parse(data.backup.jsonString);
    assert.strictEqual(exportedBackupData.teacher.email, email);
    assert.strictEqual(exportedBackupData.collections.timetables.length, 1);
  });

  test('POST /api/backup/preview - performs dry-run analysis and conflict detection', async () => {
    const res = await fetch(`${baseUrl}/api/backup/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        backupData: exportedBackupData,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.preview);
    assert.strictEqual(data.preview.valid, true);
    assert.strictEqual(data.preview.targetTeacherMatch, true);
    assert.strictEqual(data.preview.incomingCounts.timetables, 1);
    assert.strictEqual(data.preview.conflictsSummary.timetableConflicts, 1);
  });

  test('POST /api/backup/restore - rejects restore when confirmation is missing', async () => {
    const res = await fetch(`${baseUrl}/api/backup/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        backupData: exportedBackupData,
        strategy: 'merge',
        confirmed: false,
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('requires explicit teacher confirmation'));
  });

  test('POST /api/backup/restore - executes merge restore when teacher confirms', async () => {
    // Add an extra lesson plan to incoming data
    const modifiedBackup = {
      ...exportedBackupData,
      collections: {
        ...exportedBackupData.collections,
        lessonPlans: [
          {
            title: 'Computer Vision 5E Lesson Plan',
            className: 'Class 9',
            section: 'A',
            subject: 'Artificial Intelligence',
            topic: 'Object Detection',
            status: 'Approved',
          },
        ],
      },
    };

    const res = await fetch(`${baseUrl}/api/backup/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        backupData: modifiedBackup,
        strategy: 'merge',
        confirmed: true,
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.result.recordsRestored >= 1);
  });

  test('GET /api/backup/logs - lists chronological backup audit logs', async () => {
    const res = await fetch(`${baseUrl}/api/backup/logs`, {
      headers: {
        Authorization: `Bearer ${teacherToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.logs));
    assert.ok(data.logs.some((l) => l.action === 'export'));
    assert.ok(data.logs.some((l) => l.action === 'preview_restore'));
    assert.ok(data.logs.some((l) => l.action === 'restore'));
  });
});
