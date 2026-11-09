import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Document, Paragraph, HeadingLevel, TextRun, Packer } from 'docx';
import { ZipArchive } from 'archiver';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

describe('AI Document Intelligence and Automatic Teaching Documentation Tests', () => {
  let server;
  let baseUrl;
  let teacherTokenA;
  let teacherIdA;
  let teacherTokenB;
  let teacherIdB;

  const emailA = `teacher_doc_a_${Date.now()}@school.edu`;
  const emailB = `teacher_doc_b_${Date.now()}@school.edu`;
  const password = 'Password@123';

  // State IDs across test progression
  let uploadedPptId;
  let uploadedPdfId;
  let uploadedDocxId;
  let uploadedXlsxId;
  let uploadedImgId;
  let multiJobId;
  let generatedMaterialId;
  let convertedLessonPlanId;
  let diaryDraftId;

  // Helper buffers for testing
  let pptxBuffer;
  let pdfBuffer;
  let docxBuffer;
  let xlsxBuffer;
  let pngBuffer;

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
        fullName: 'Prof. Ananya Rao',
        email: emailA,
        password,
        schoolName: 'Delhi Public School',
        designation: 'Senior Science & AI Educator',
        subjectsTaught: ['Artificial Intelligence', 'Physics'],
        classesHandled: ['Class 9-A', 'Class 10-A'],
      }),
    });
    const dataA = await resA.json();
    teacherTokenA = dataA.token;
    teacherIdA = dataA.user._id || dataA.user.id;

    // Register Teacher B (for security & ownership checks)
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mr. Vikram Singh',
        email: emailB,
        password,
        schoolName: 'St. Xavier School',
        designation: 'Biology Educator',
        subjectsTaught: ['Biology'],
        classesHandled: ['Class 9-B'],
      }),
    });
    const dataB = await resB.json();
    teacherTokenB = dataB.token;
    teacherIdB = dataB.user._id || dataB.user.id;

    // 1. Generate real Excel (.xlsx) buffer
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('AI Curriculum Units');
    ws.addRow(['Unit', 'Chapter', 'Topic', 'Classroom Learning Objective']);
    ws.addRow(['Unit 1', 'Chapter 1', 'AI Reflection and Ethics', 'Understand algorithmic bias and ethical dilemmas in AI']);
    ws.addRow(['Unit 1', 'Chapter 2', 'AI Project Cycle', 'Formulate 4Ws problem scoping canvas']);
    xlsxBuffer = await wb.xlsx.writeBuffer();

    // 2. Generate real PDF (.pdf) buffer
    pdfBuffer = await new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fontSize(16).text('Unit 1: Foundations of Artificial Intelligence', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Chapter 1: Excite and Relate. What is AI?');
      doc.moveDown();
      doc.text('Key Definition: Artificial Intelligence refers to the ability of a digital computer or robot to perform tasks commonly associated with intelligent beings.');
      doc.text('Learning Objectives: Students will be able to distinguish between rule-based and learning-based systems.');
      doc.text('Item | Characteristic | Example');
      doc.text('Smart Device | Pre-programmed sensor | Automated geyser');
      doc.text('AI Device | Learns from data | Face recognition lock');
      doc.addPage();
      doc.fontSize(14).text('Page 2: Real-World Applications');
      doc.text('For example, autonomous vehicles utilize computer vision and deep reinforcement learning to navigate safely.');
      doc.end();
    });

    // 3. Generate real Word (.docx) buffer
    const docxDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: 'AI Ethics and Moral Frameworks', heading: HeadingLevel.HEADING_1 }),
            new Paragraph('Teacher Classroom Notes on Bias, Fairness and Privacy in Machine Learning.'),
            new Paragraph({ text: 'Essential Definitions', heading: HeadingLevel.HEADING_2 }),
            new Paragraph('Algorithmic Bias is defined as systematic and repeatable errors in a computer system that create unfair outcomes.'),
            new Paragraph({ text: 'Classroom Activities', heading: HeadingLevel.HEADING_2 }),
            new Paragraph('Activity 1: Divide class into groups to debate facial recognition surveillance vs personal privacy rights.'),
          ],
        },
      ],
    });
    docxBuffer = await Packer.toBuffer(docxDoc);

    // 4. Generate real PPTX buffer using archiver
    pptxBuffer = await new Promise((resolve, reject) => {
      const archive = new ZipArchive();
      const buffers = [];
      archive.on('data', (d) => buffers.push(d));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', reject);

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
</Types>`;

      const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>Introduction to Artificial Intelligence</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>• Artificial Intelligence is defined as machines mimicking human cognitive faculties.</a:t></a:r></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

      const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>The Three Domains of AI</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>1. Data Sciences - Numeric modeling</a:t></a:r></a:p>
          <a:p><a:r><a:t>2. Computer Vision - Image and video pixel analysis</a:t></a:r></a:p>
          <a:p><a:r><a:t>3. Natural Language Processing - Text and speech comprehension</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

      const notes1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody><a:p><a:r><a:t>Speaker Notes: Remind students about Alan Turing and the Imitation Game test from 1950.</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;

      archive.append(contentTypesXml, { name: '[Content_Types].xml' });
      archive.append(slide1Xml, { name: 'ppt/slides/slide1.xml' });
      archive.append(slide2Xml, { name: 'ppt/slides/slide2.xml' });
      archive.append(notes1Xml, { name: 'ppt/notesSlides/notesSlide1.xml' });
      archive.finalize();
    });

    // 5. Valid PNG buffer (1x1 PNG header + payload)
    pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  });

  after(() => {
    if (server) server.close();
  });

  // ==========================================
  // 1. DOCUMENT UPLOAD & VALIDATION TESTS
  // ==========================================
  describe('Document Upload & Security Validation', () => {
    test('POST /api/document-intelligence/upload rejects malicious executable binary (.exe masquerading as .pdf)', async () => {
      // Craft fake executable MZ buffer
      const fakeExe = Buffer.from('MZThisIsAnExecutableFileCannotBeUploaded');
      const boundary = '----WebKitFormBoundaryTest' + Date.now();

      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="virus.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        fakeExe,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await fetch(`${baseUrl}/api/document-intelligence/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.success, false);
      assert.ok(data.message.includes('failed validation'));
    });

    test('POST /api/document-intelligence/upload uploads PowerPoint PPTX and records metadata', async () => {
      const boundary = '----WebKitFormBoundaryPPTX' + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="className"\r\n\r\nClass 9\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nArtificial Intelligence\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="unit"\r\n\r\nUnit 1\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="topic"\r\n\r\nAI Project Cycle\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="AI_Ethics_Lesson.pptx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n`),
        pptxBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await fetch(`${baseUrl}/api/document-intelligence/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data.length > 0);
      uploadedPptId = data.data[0]._id || data.data[0].id;
      assert.equal(data.data[0].extension, 'pptx');
      assert.equal(data.data[0].className, 'Class 9');
      assert.equal(data.data[0].status, 'Uploaded');
    });

    test('POST /api/document-intelligence/upload avoids processing duplicate files unnecessarily (SHA-256)', async () => {
      const boundary = '----WebKitFormBoundaryDup' + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="AI_Ethics_Lesson_Duplicate.pptx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n`),
        pptxBuffer, // Exact same buffer
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await fetch(`${baseUrl}/api/document-intelligence/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      assert.ok(data.data[0].isDuplicate);
      assert.ok(data.data[0].duplicateNotice);
    });

    test('POST /api/document-intelligence/upload uploads PDF, Word, Excel, and Image documents', async () => {
      const boundary = '----WebKitFormBoundaryBatch' + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="className"\r\n\r\nClass 9\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nArtificial Intelligence\r\n`),
        // PDF
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="AI_Textbook_Chapter1.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        pdfBuffer,
        Buffer.from('\r\n'),
        // Word
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="Teacher_Notes_Ethics.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`),
        docxBuffer,
        Buffer.from('\r\n'),
        // Excel
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="Curriculum_Topics.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
        xlsxBuffer,
        Buffer.from('\r\n'),
        // Image
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="Neural_Network_Diagram.png"\r\nContent-Type: image/png\r\n\r\n`),
        pngBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await fetch(`${baseUrl}/api/document-intelligence/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.data.length, 4);

      uploadedPdfId = data.data.find((d) => d.extension === 'pdf')._id;
      uploadedDocxId = data.data.find((d) => d.extension === 'docx')._id;
      uploadedXlsxId = data.data.find((d) => d.extension === 'xlsx')._id;
      uploadedImgId = data.data.find((d) => d.extension === 'png')._id;

      assert.ok(uploadedPdfId);
      assert.ok(uploadedDocxId);
      assert.ok(uploadedXlsxId);
      assert.ok(uploadedImgId);
    });

    test('GET /api/document-intelligence/documents filters by class, subject, and search query', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/documents?className=Class 9&subject=Artificial Intelligence`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.count >= 4);
    });

    test('Security & Ownership: Teacher B cannot view, preview, or delete Teacher A document', async () => {
      // 1. View details
      const viewRes = await fetch(`${baseUrl}/api/document-intelligence/documents/${uploadedPptId}`, {
        headers: { Authorization: `Bearer ${teacherTokenB}` },
      });
      assert.equal(viewRes.status, 404);

      // 2. Stream preview
      const prevRes = await fetch(`${baseUrl}/api/document-intelligence/documents/${uploadedPptId}/preview`, {
        headers: { Authorization: `Bearer ${teacherTokenB}` },
      });
      assert.equal(prevRes.status, 404);

      // 3. Delete
      const delRes = await fetch(`${baseUrl}/api/document-intelligence/documents/${uploadedPptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${teacherTokenB}` },
      });
      assert.equal(delRes.status, 404);
    });
  });

  // ==========================================
  // 2. EXTRACTION & AI ANALYSIS TESTS
  // ==========================================
  describe('Document Content Extraction & Concept Analysis', () => {
    test('POST /api/document-intelligence/jobs/process extracts PowerPoint with slide numbers, titles, and speaker notes', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/jobs/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: [uploadedPptId],
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.success, true);
      assert.equal(data.data.job.status, 'Analysed');

      const extracted = data.data.extractedContents[0];
      assert.equal(extracted.totalItems, 2); // 2 slides
      assert.equal(extracted.sections[0].itemType, 'slide');
      assert.equal(extracted.sections[0].itemNumber, 1);
      assert.ok(extracted.sections[0].title.includes('Introduction to Artificial Intelligence'));
      assert.ok(extracted.sections[0].speakerNotes.includes('Alan Turing'));
    });

    test('POST /api/document-intelligence/jobs/process combines multiple documents (PPT, PDF, DOCX, XLSX) and detects conflicts', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/jobs/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: [uploadedPptId, uploadedPdfId, uploadedDocxId, uploadedXlsxId],
          userMetadata: {
            className: 'Class 9',
            subject: 'Artificial Intelligence',
            unit: 'Unit 1: AI Reflection and Ethics',
          },
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      multiJobId = data.data.job._id;

      const analysis = data.data.analysis;
      assert.ok(analysis.detectedMetadata);
      assert.equal(analysis.sourceCount, 4);
      assert.ok(analysis.totalSections >= 5);

      // Verify conflict and duplicate detection
      assert.ok(analysis.conflictDetections);
      assert.ok(Array.isArray(analysis.conflictDetections));

      // Verify clearly tagged extracted vs inferred definitions
      const defs = analysis.detectedMetadata.definitions;
      assert.ok(defs.length > 0);
      assert.ok(defs.some((d) => d.origin === 'extracted' || d.origin === 'inferred'));

      // Verify learning objectives tagged
      const objs = analysis.detectedMetadata.learningObjectives;
      assert.ok(objs.length > 0);
      assert.ok(objs[0].origin);
    });

    test('GET /api/document-intelligence/jobs/:id/status returns 100% progress and stage details', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/jobs/${multiJobId}/status`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'Analysed');
      assert.equal(data.data.progress, 100);
      assert.ok(data.data.currentStage);
    });
  });

  // ==========================================
  // 3. AUTOMATIC TEACHING DOCUMENTATION GENERATION
  // ==========================================
  describe('Automatic Teaching Documentation Generation', () => {
    test('POST /api/document-intelligence/generate produces all 5 artifacts + Slide-wise Explanations in Bilingual (Kannada + English)', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: [uploadedPptId, uploadedPdfId],
          detectedMetadata: {
            className: 'Class 9',
            subject: 'Artificial Intelligence',
            unit: 'Unit 1: AI Ethics',
            topic: 'AI Ethics and Moral Dilemmas',
          },
          teacherCorrections: {
            topic: 'AI Ethics, Algorithmic Bias and Moral Dilemmas',
          },
          language: 'Kannada + English',
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.success, true);
      generatedMaterialId = data.data._id;

      const mat = data.data;

      // 1. Detailed Lesson Plan (13 items)
      assert.ok(mat.lessonPlan.title);
      assert.ok(mat.lessonPlan.learningObjectives);
      assert.ok(mat.lessonPlan.previousKnowledge);
      assert.ok(mat.lessonPlan.introduction);
      assert.ok(mat.lessonPlan.topicExplanation);
      assert.ok(mat.lessonPlan.definitions);
      assert.ok(mat.lessonPlan.teachingMethodology);
      assert.ok(mat.lessonPlan.teachingAids);
      assert.ok(mat.lessonPlan.classroomActivities);
      assert.ok(mat.lessonPlan.realLifeExamples);
      assert.ok(mat.lessonPlan.assessment);
      assert.ok(mat.lessonPlan.learningOutcomes);
      assert.ok(mat.lessonPlan.homework);

      // 2. Classroom Teaching Notes (8 items)
      assert.ok(mat.classroomTeachingNotes.topicWiseExplanation);
      assert.ok(mat.classroomTeachingNotes.definitions);
      assert.ok(mat.classroomTeachingNotes.subtopics);
      assert.ok(mat.classroomTeachingNotes.examples);
      assert.ok(mat.classroomTeachingNotes.stepByStepExplanations);
      assert.ok(mat.classroomTeachingNotes.classroomDiscussion);
      assert.ok(mat.classroomTeachingNotes.practicalApplications);
      assert.ok(mat.classroomTeachingNotes.summary);

      // 3. Question Bank (MCQs, True/False, Fill in blanks, Short, Long, Answer Keys)
      assert.ok(mat.questionBank.mcqs.length >= 2);
      assert.ok(mat.questionBank.trueFalse.length >= 2);
      assert.ok(mat.questionBank.fillBlanks.length >= 2);
      assert.ok(mat.questionBank.shortAnswers.length >= 2);
      assert.ok(mat.questionBank.longAnswers.length >= 1);
      assert.ok(mat.questionBank.answerKeys);

      // 4. Classroom Activity Plan
      assert.ok(mat.classroomActivityPlan.individualActivities.length >= 1);
      assert.ok(mat.classroomActivityPlan.groupActivities.length >= 1);
      assert.ok(mat.classroomActivityPlan.practicalDemonstrations.length >= 1);

      // 5. Daily Teaching Diary Draft (Draft status, requires confirmation)
      assert.equal(mat.dailyTeachingDiaryDraft.status, 'Draft');
      assert.equal(mat.dailyTeachingDiaryDraft.confirmedTaught, false);
      assert.ok(mat.dailyTeachingDiaryDraft.detailedTeachingExplanation);

      // 6. Slide-Wise Teaching Explanations
      assert.ok(mat.slideExplanations.length >= 1);
      const slide1 = mat.slideExplanations[0];
      assert.equal(slide1.slideNumber, 1);
      assert.ok(slide1.slideHeading);
      assert.ok(slide1.extractedOriginalContent);
      assert.ok(slide1.detailedTeacherExplanation);
      assert.ok(slide1.studentFriendlyExamples);
      assert.ok(slide1.questionsToAskStudents.length > 0);
      assert.ok(slide1.classroomActivitySuggestions);

      // Verify Unicode Kannada presence
      assert.ok(mat.lessonPlan.title.includes('ಬೋಧನಾ ಯೋಜನೆ') || mat.lessonPlan.learningObjectives.includes('ವಿದ್ಯಾರ್ಥಿಗಳು'));
    });
  });

  // ==========================================
  // 4. TEACHER REVIEW WORKSPACE & EXPORT INTEGRATIONS
  // ==========================================
  describe('Teacher Review Workspace, Approval & Module Integrations', () => {
    test('PUT /api/document-intelligence/materials/:id enables teacher to edit and refine sections', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonPlan: {
            title: 'Customized Teacher Lesson Plan: AI Ethics & Fairness',
            homework: 'Complete ethics case study on autonomous drones.',
          },
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.data.lessonPlan.title, 'Customized Teacher Lesson Plan: AI Ethics & Fairness');
    });

    test('POST /api/document-intelligence/materials/:id/regenerate-section regenerates questionBank independently', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/regenerate-section`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionName: 'questionBank',
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.data.questionBank.mcqs.length > 0);
      // Lesson plan title preserved
      assert.equal(data.data.lessonPlan.title, 'Customized Teacher Lesson Plan: AI Ethics & Fairness');
    });

    test('POST /api/document-intelligence/materials/:id/approve marks dossier approved', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.data.status, 'Approved');
      assert.ok(data.data.approvedAt);
    });

    test('POST /api/document-intelligence/materials/:id/convert-to-lesson-plan creates real record in LessonPlan module', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/convert-to-lesson-plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.success, true);
      convertedLessonPlanId = data.data._id || data.data.id;
      assert.ok(convertedLessonPlanId);

      // Verify through existing /api/lesson-plans endpoint
      const checkRes = await fetch(`${baseUrl}/api/lesson-plans/${convertedLessonPlanId}`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const checkData = await checkRes.json();
      assert.equal(checkRes.status, 200);
      assert.equal(checkData.data.subject, 'Artificial Intelligence');
    });

    test('POST /api/document-intelligence/materials/:id/create-diary-draft creates DailyTeachingEntry as Draft without auto-completing', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/create-diary-draft`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacherTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmedTaught: false, // NOT confirmed taught yet
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      diaryDraftId = data.data._id || data.data.id;
      assert.ok(diaryDraftId);
      assert.equal(data.data.verificationStatus, 'Draft');
      assert.equal(data.data.isSignedByTeacher, false);

      // Verify through existing /api/diary endpoint
      const diaryRes = await fetch(`${baseUrl}/api/diary/${diaryDraftId}`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      const diaryData = await diaryRes.json();
      assert.equal(diaryRes.status, 200);
      assert.equal(diaryData.data.verificationStatus, 'Draft');
    });

    test('GET /api/document-intelligence/materials/:id/export/word exports full Word document (.docx) with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/export/word`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 1000);
    });

    test('GET /api/document-intelligence/materials/:id/export/pdf exports full PDF document with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/document-intelligence/materials/${generatedMaterialId}/export/pdf`, {
        headers: { Authorization: `Bearer ${teacherTokenA}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 1000);
    });
  });
});
