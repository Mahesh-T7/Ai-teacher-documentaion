import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

let authToken = '';

async function getAuthToken() {
  const email = `test.teacher.${Date.now()}@karnataka.gov.in`;
  const registerRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Sri Suresh Kumar G',
      email,
      password: 'Password123!',
      schoolName: 'Karnataka Public School, Bengaluru',
      designation: 'Vocational Trainer / Subject Teacher',
      subjectsTaught: ['Artificial Intelligence', 'Information Technology'],
      classesHandled: ['Class 9', 'Class 10'],
      preferredLanguage: 'Kannada',
    }),
  });

  const regData = await registerRes.json();
  if (regData.token) {
    return regData.token;
  }
  throw new Error(`Failed to authenticate test runner: ${JSON.stringify(regData)}`);
}

async function testUpload(fileName) {
  const filePath = path.join(fixturesDir, fileName);
  const fileBytes = fs.readFileSync(filePath);
  const blob = new Blob([fileBytes], {
    type: fileName.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const formData = new FormData();
  formData.append('file', blob, fileName);

  const res = await fetch('http://127.0.0.1:5000/api/exams/import-students-excel', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  const data = await res.json();
  return { statusCode: res.status, data };
}

async function testPdfGeneration(studentsList) {
  const payload = {
    examRecord: {
      schoolName: 'Karnataka Public School, Bengaluru',
      academicYear: '2026-2027',
      className: 'Class 9',
      section: 'A',
      subject: 'Artificial Intelligence & IT (NSQF)',
      examTitle: 'Consolidated Term Evaluation & Class Marks Register',
      templateSnapshot: {
        components: [
          { key: 'fa1_act1', label: 'FA1 Act 1', group: 'FA 1', maxMarks: 5 },
          { key: 'fa1_act2', label: 'FA1 Act 2', group: 'FA 1', maxMarks: 5 },
          { key: 'fa1_proj', label: 'FA1 Proj', group: 'FA 1', maxMarks: 5 },
          { key: 'fa1_test', label: 'FA1 Test', group: 'FA 1', maxMarks: 15 },
          { key: 'fa2_act1', label: 'FA2 Act 1', group: 'FA 2', maxMarks: 5 },
          { key: 'fa2_act2', label: 'FA2 Act 2', group: 'FA 2', maxMarks: 5 },
          { key: 'fa2_proj', label: 'FA2 Proj', group: 'FA 2', maxMarks: 5 },
          { key: 'fa2_test', label: 'FA2 Test', group: 'FA 2', maxMarks: 15 },
          { key: 'sa_theory', label: 'SA Theory', group: 'Summative Assessment', maxMarks: 80 },
          { key: 'sa_practical', label: 'SA Pract', group: 'Summative Assessment', maxMarks: 20 },
        ],
      },
      studentMarks: studentsList.map((s, idx) => ({
        rollNumber: s.rollNumber || idx + 1,
        studentName: s.studentName,
        admissionNumber: s.admissionNumber || `ADM-${1000 + idx}`,
        marks: {
          fa1_act1: 4, fa1_act2: 4, fa1_proj: 5, fa1_test: 12,
          fa2_act1: 5, fa2_act2: 5, fa2_proj: 4, fa2_test: 14,
          sa_theory: Math.floor(40 + Math.random() * 35),
          sa_practical: Math.floor(15 + Math.random() * 10),
        },
        fa1Total: 25,
        fa2Total: 28,
        saTheory: 65,
        saPractical: 22,
        grandTotal: 140,
        percentage: '70.0%',
        grade: 'A',
        result: 'PASS',
      })),
      statistics: {
        totalStudents: studentsList.length,
        appearedCount: studentsList.length,
        passedCount: studentsList.length,
        failedCount: 0,
        passPercentage: '100.0%',
        classAverage: 140,
        highestScore: 165,
        lowestScore: 110,
      },
    },
  };

  const res = await fetch('http://127.0.0.1:5000/api/exams/preview-register-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  return { statusCode: res.status, headers: res.headers, buffer };
}

async function run() {
  console.log('=== Step 0: Authenticating Test Runner ===');
  authToken = await getAuthToken();
  console.log('Successfully acquired JWT Auth token!');

  console.log('=== Step 1: Testing Roster Uploads ===');
  
  // Test 25 students
  const res25 = await testUpload('roster_25.xlsx');
  console.log(`roster_25.xlsx status: ${res25.statusCode}, detected: ${res25.data?.stats?.validStudents}`);
  if (res25.data?.stats?.validStudents !== 25) {
    throw new Error(`Expected 25 students, got ${res25.data?.stats?.validStudents}`);
  }

  // Test 37 students (Kannada + English)
  const res37 = await testUpload('roster_37.xlsx');
  console.log(`roster_37.xlsx status: ${res37.statusCode}, detected: ${res37.data?.stats?.validStudents}`);
  if (res37.data?.stats?.validStudents !== 37) {
    throw new Error(`Expected 37 students, got ${res37.data?.stats?.validStudents}`);
  }
  // Check that Kannada name was extracted intact
  const sampleName = res37.data?.students?.[0]?.studentName;
  console.log(`First Kannada student name: "${sampleName}"`);
  if (!sampleName || sampleName !== 'ಆರವ್ ಕುಮಾರ್') {
    throw new Error(`Kannada name was corrupted or mismatch: got "${sampleName}"`);
  }

  // Test 40 students
  const res40 = await testUpload('roster_40.xlsx');
  console.log(`roster_40.xlsx status: ${res40.statusCode}, detected: ${res40.data?.stats?.validStudents}`);
  if (res40.data?.stats?.validStudents !== 40) {
    throw new Error(`Expected 40 students, got ${res40.data?.stats?.validStudents}`);
  }

  // Test 58 students (CSV)
  const res58 = await testUpload('roster_58.csv');
  console.log(`roster_58.csv status: ${res58.statusCode}, detected: ${res58.data?.stats?.validStudents}`);
  if (res58.data?.stats?.validStudents !== 58) {
    throw new Error(`Expected 58 students, got ${res58.data?.stats?.validStudents}`);
  }

  console.log('=== Step 2: Testing Multi-Page Landscape PDF Generation with 58 Students + Kannada names ===');
  // Combine 37 Kannada students + 21 additional to test 58 students with mixed Indic characters
  const combinedStudents = [...res37.data.students, ...res25.data.students.slice(0, 21)];
  console.log(`Generating PDF for ${combinedStudents.length} students...`);

  const pdfRes = await testPdfGeneration(combinedStudents);
  console.log(`PDF status: ${pdfRes.statusCode}, size: ${pdfRes.buffer.length} bytes`);
  
  if (pdfRes.statusCode !== 200) {
    throw new Error(`PDF generation failed with status ${pdfRes.statusCode}: ${pdfRes.buffer.toString()}`);
  }
  if (!pdfRes.buffer.slice(0, 5).toString().startsWith('%PDF-')) {
    throw new Error('Response is not a valid PDF binary');
  }

  // Save generated PDF to os temp dir so node --watch does not restart
  const outPdfPath = path.join(os.tmpdir(), 'Test_Generated_Class_Register_58_Students.pdf');
  fs.writeFileSync(outPdfPath, pdfRes.buffer);
  console.log(`Generated PDF saved to ${outPdfPath} (${(pdfRes.buffer.length / 1024).toFixed(1)} KB)`);

  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
