import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('AI Teacher Documentation Management Portal - Backend API Tests', () => {
  let server;
  let baseUrl;
  let authToken = '';
  const testEmail = `teacher_${Date.now()}@school.edu`;
  const testPassword = 'Password@123';

  before(async () => {
    // Attempt DB connection
    await connectDB();

    // Start test server on ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`[Test Suite] Test server running at ${baseUrl}`);
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('Health check endpoint returns status online', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'online');
    assert.ok(data.database);
  });

  test('POST /api/auth/register fails with missing required fields', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bademail' }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });

  test('POST /api/auth/register succeeds with valid teacher info and returns token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dr. Sarah Mitchell',
        email: testEmail,
        password: testPassword,
        phoneNumber: '+91 98765 43210',
        schoolName: 'Delhi Public School, Sector 4',
        designation: 'Head of Physics Department',
        subjectsTaught: ['Physics', 'Applied Science'],
        classesHandled: ['Class 11-A', 'Class 12-B'],
        preferredLanguage: 'English',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.token, 'Token must be present in response');
    assert.equal(data.user.email, testEmail.toLowerCase());
    assert.equal(data.user.designation, 'Head of Physics Department');
    assert.equal(data.user.password, undefined, 'Password hash must never be returned');

    authToken = data.token;
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another Teacher',
        email: testEmail,
        password: 'AnotherPassword123',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
  });

  test('POST /api/auth/login rejects invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  test('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testEmail.toLowerCase());
  });

  test('GET /api/auth/me rejects unauthenticated request', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  test('GET /api/auth/me succeeds with valid Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.fullName, 'Dr. Sarah Mitchell');
  });

  test('PUT /api/users/profile updates teacher profile fields', async () => {
    const res = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fullName: 'Prof. Sarah Mitchell, Ph.D.',
        schoolName: 'St. Xavier International School',
        preferredLanguage: 'English / Hindi',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.fullName, 'Prof. Sarah Mitchell, Ph.D.');
    assert.equal(data.user.schoolName, 'St. Xavier International School');
    assert.equal(data.user.preferredLanguage, 'English / Hindi');
  });

  test('GET /api/dashboard/stats returns real user metrics from DB', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.metrics);
    assert.equal(typeof data.data.metrics.totalTeachingDays, 'number');
    assert.equal(typeof data.data.metrics.totalClassesConducted, 'number');
    assert.equal(typeof data.data.metrics.totalLessonPlans, 'number');
    assert.equal(typeof data.data.metrics.completedSyllabusPercentage, 'number');
    assert.equal(typeof data.data.metrics.practicalActivities, 'number');
    assert.equal(typeof data.data.metrics.pendingDocumentation, 'number');
  });

  test('POST /api/dashboard/seed populates starter records and updates metrics', async () => {
    const seedRes = await fetch(`${baseUrl}/api/dashboard/seed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const seedData = await seedRes.json();
    assert.equal(seedRes.status, 201);
    assert.equal(seedData.success, true);

    const statsRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const statsData = await statsRes.json();
    assert.equal(statsRes.status, 200);
    assert.ok(statsData.data.metrics.totalClassesConducted >= 1);
    assert.ok(statsData.data.metrics.totalLessonPlans >= 1);
    assert.ok(statsData.data.recentTeachingRecords.length >= 1);
  });
});
