import { Document, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Packer } from 'docx';
import PDFDocument from 'pdfkit';

/**
 * High Quality Multi-Format Document Export Service
 * Generates beautifully formatted Microsoft Word (.docx) and PDF (.pdf) documents
 * for all generated teaching materials, preserving source references and academic metadata.
 */
export class DocumentExportService {
  /**
   * Generates a styled Microsoft Word (.docx) document buffer.
   */
  static async exportToWord(material, options = {}) {
    const { detectedMetadata, lessonPlan, classroomTeachingNotes, questionBank, classroomActivityPlan, slideExplanations } = material;
    const { className, subject, unit, chapter, topic, academicYear } = detectedMetadata || {};

    const children = [];

    // Header Title
    children.push(
      new Paragraph({
        text: 'AI TEACHER DOCUMENTATION MANAGEMENT PORTAL',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );

    children.push(
      new Paragraph({
        text: `ACADEMIC TEACHING DOSSIER: ${topic ? topic.toUpperCase() : 'CURRICULUM LESSON'}`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Metadata Summary Box
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Academic Year: ', bold: true }),
          new TextRun(`${academicYear || '2026-2027'}    |    `),
          new TextRun({ text: 'Class: ', bold: true }),
          new TextRun(`${className || 'General'}    |    `),
          new TextRun({ text: 'Subject: ', bold: true }),
          new TextRun(`${subject || 'General'}\n`),
          new TextRun({ text: 'Unit: ', bold: true }),
          new TextRun(`${unit || 'Unit 1'}    |    `),
          new TextRun({ text: 'Chapter: ', bold: true }),
          new TextRun(`${chapter || 'Chapter 1'}    |    `),
          new TextRun({ text: 'Topic: ', bold: true }),
          new TextRun(`${topic || 'N/A'}`),
        ],
        spacing: { after: 300 },
      })
    );

    // ==========================================
    // 1. DETAILED LESSON PLAN
    // ==========================================
    if (lessonPlan && (lessonPlan.title || lessonPlan.learningObjectives)) {
      children.push(
        new Paragraph({
          text: '1. DETAILED LESSON PLAN',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      const planFields = [
        ['Lesson Title', lessonPlan.title],
        ['Learning Objectives', lessonPlan.learningObjectives],
        ['Previous Knowledge Required', lessonPlan.previousKnowledge],
        ['Introduction & Hook', lessonPlan.introduction],
        ['Teaching Methodology', lessonPlan.teachingMethodology],
        ['Teaching Aids & Resources', lessonPlan.teachingAids],
        ['Classroom Activities', lessonPlan.classroomActivities],
        ['Real-Life Examples', lessonPlan.realLifeExamples],
        ['Formative Assessment', lessonPlan.assessment],
        ['Expected Learning Outcomes', lessonPlan.learningOutcomes],
        ['Homework & Extension', lessonPlan.homework],
      ];

      planFields.forEach(([label, value]) => {
        if (value) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${label}: `, bold: true }),
                new TextRun(value.replace(/<[^>]+>/g, ' ')),
              ],
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // ==========================================
    // 2. CLASSROOM TEACHING NOTES
    // ==========================================
    if (classroomTeachingNotes && classroomTeachingNotes.topicWiseExplanation) {
      children.push(
        new Paragraph({
          text: '2. CLASSROOM TEACHING NOTES',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      const noteFields = [
        ['Subtopics', classroomTeachingNotes.subtopics],
        ['Key Definitions', classroomTeachingNotes.definitions],
        ['Conceptual Examples', classroomTeachingNotes.examples],
        ['Step-by-Step Problem Solving', classroomTeachingNotes.stepByStepExplanations],
        ['Classroom Discussion Prompts', classroomTeachingNotes.classroomDiscussion],
        ['Practical Applications', classroomTeachingNotes.practicalApplications],
        ['Lesson Summary', classroomTeachingNotes.summary],
      ];

      noteFields.forEach(([label, value]) => {
        if (value) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${label}:\n`, bold: true }),
                new TextRun(value.replace(/<[^>]+>/g, ' ')),
              ],
              spacing: { after: 120 },
            })
          );
        }
      });
    }

    // ==========================================
    // 3. SLIDE-WISE PRESENTATION EXPLANATIONS
    // ==========================================
    if (slideExplanations && slideExplanations.length > 0) {
      children.push(
        new Paragraph({
          text: '3. SLIDE-WISE TEACHING EXPLANATIONS (POWERPOINT)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      slideExplanations.forEach((slide) => {
        children.push(
          new Paragraph({
            text: `Slide ${slide.slideNumber}: ${slide.slideHeading}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 140, after: 80 },
          })
        );

        if (slide.extractedOriginalContent) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Original Slide Text: ', bold: true, italics: true }),
                new TextRun({ text: slide.extractedOriginalContent, italics: true }),
              ],
              spacing: { after: 80 },
            })
          );
        }

        if (slide.detailedTeacherExplanation) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Teacher Explanation: ', bold: true }),
                new TextRun(slide.detailedTeacherExplanation),
              ],
              spacing: { after: 80 },
            })
          );
        }

        if (slide.studentFriendlyExamples) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Student Example: ', bold: true }),
                new TextRun(slide.studentFriendlyExamples),
              ],
              spacing: { after: 80 },
            })
          );
        }

        if (slide.questionsToAskStudents && slide.questionsToAskStudents.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Interactive Questions: ', bold: true }),
                new TextRun(slide.questionsToAskStudents.join(' | ')),
              ],
              spacing: { after: 80 },
            })
          );
        }
      });
    }

    // ==========================================
    // 4. QUESTION BANK
    // ==========================================
    if (questionBank) {
      children.push(
        new Paragraph({
          text: '4. QUESTION BANK & ASSESSMENT ASSETS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      // MCQs
      if (questionBank.mcqs && questionBank.mcqs.length > 0) {
        children.push(
          new Paragraph({
            text: 'Multiple Choice Questions (MCQs):',
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 80 },
          })
        );

        questionBank.mcqs.forEach((mcq, idx) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Q${idx + 1}. ${mcq.question}\n`, bold: true }),
                new TextRun((mcq.options || []).join('\n') + '\n'),
                new TextRun({ text: `Answer: ${mcq.answer}\n`, bold: true }),
                new TextRun({ text: `Explanation: ${mcq.explanation || 'N/A'}\n`, italics: true }),
              ],
              spacing: { after: 100 },
            })
          );
        });
      }

      // True or False
      if (questionBank.trueFalse && questionBank.trueFalse.length > 0) {
        children.push(
          new Paragraph({
            text: 'True or False Statements:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 80 },
          })
        );

        questionBank.trueFalse.forEach((tf, idx) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. ${tf.statement}\n` }),
                new TextRun({ text: `Key: ${tf.isTrue ? 'True' : 'False'} - ${tf.explanation || ''}`, italics: true }),
              ],
              spacing: { after: 60 },
            })
          );
        });
      }

      // Short & Long Answers
      if (questionBank.shortAnswers && questionBank.shortAnswers.length > 0) {
        children.push(
          new Paragraph({
            text: 'Short Answer Questions:',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 80 },
          })
        );
        questionBank.shortAnswers.forEach((sa, idx) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Q${idx + 1}: ${sa.question}\n`, bold: true }),
                new TextRun({ text: `Model Answer: ${sa.answer}` }),
              ],
              spacing: { after: 80 },
            })
          );
        });
      }
    }

    // ==========================================
    // 5. CLASSROOM ACTIVITY PLAN
    // ==========================================
    if (classroomActivityPlan) {
      children.push(
        new Paragraph({
          text: '5. CLASSROOM ACTIVITY PLAN',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );

      if (classroomActivityPlan.individualActivities) {
        classroomActivityPlan.individualActivities.forEach((act) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Individual Activity - ${act.title} (${act.timeMinutes || 10} mins):\n`, bold: true }),
                new TextRun(`${act.description}\n`),
                new TextRun({ text: `Required Materials: ${act.materials} | Expected Outcome: ${act.expectedOutcome}`, italics: true }),
              ],
              spacing: { after: 100 },
            })
          );
        });
      }

      if (classroomActivityPlan.groupActivities) {
        classroomActivityPlan.groupActivities.forEach((act) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Group Activity - ${act.title} (Groups of ${act.groupSize || '4-5'}):\n`, bold: true }),
                new TextRun(`${act.description}\n`),
                new TextRun({ text: `Outcome: ${act.expectedOutcome}`, italics: true }),
              ],
              spacing: { after: 100 },
            })
          );
        });
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generates a styled PDF document buffer using PDFKit.
   */
  static async exportToPDF(material, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const { detectedMetadata, lessonPlan, classroomTeachingNotes, questionBank, classroomActivityPlan, slideExplanations } = material;
        const { className, subject, unit, chapter, topic, academicYear } = detectedMetadata || {};

        // Document Header
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e3a8a').text('AI TEACHER DOCUMENTATION PORTAL', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#0f172a').text(`TEACHING DOSSIER: ${topic || 'LESSON'}`, { align: 'center' });
        doc.moveDown(0.5);

        // Metadata Box
        doc.rect(45, doc.y, 505, 45).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        const boxY = doc.y + 8;
        doc.text(`Academic Year: ${academicYear || '2026-2027'}   |   Class: ${className || 'General'}   |   Subject: ${subject || 'General'}`, 55, boxY);
        doc.text(`Unit: ${unit || 'Unit 1'}   |   Chapter: ${chapter || 'Chapter 1'}   |   Topic: ${topic || 'General'}`, 55, boxY + 16);
        doc.moveDown(3);

        // 1. Lesson Plan Section
        if (lessonPlan && (lessonPlan.title || lessonPlan.learningObjectives)) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('1. DETAILED LESSON PLAN');
          doc.moveDown(0.3);

          const items = [
            ['Title', lessonPlan.title],
            ['Learning Objectives', lessonPlan.learningObjectives],
            ['Previous Knowledge', lessonPlan.previousKnowledge],
            ['Introduction', lessonPlan.introduction],
            ['Teaching Methodology', lessonPlan.teachingMethodology],
            ['Teaching Aids', lessonPlan.teachingAids],
            ['Classroom Activities', lessonPlan.classroomActivities],
            ['Real-Life Examples', lessonPlan.realLifeExamples],
            ['Assessment', lessonPlan.assessment],
            ['Learning Outcomes', lessonPlan.learningOutcomes],
            ['Homework', lessonPlan.homework],
          ];

          items.forEach(([label, val]) => {
            if (val) {
              doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(`${label}: `);
              doc.fontSize(9).font('Helvetica').fillColor('#334155').text(val.replace(/<[^>]+>/g, ' '));
              doc.moveDown(0.4);
            }
          });
          doc.moveDown(1);
        }

        // 2. Classroom Notes
        if (classroomTeachingNotes && classroomTeachingNotes.topicWiseExplanation) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('2. CLASSROOM TEACHING NOTES');
          doc.moveDown(0.3);

          const noteItems = [
            ['Subtopics', classroomTeachingNotes.subtopics],
            ['Key Definitions', classroomTeachingNotes.definitions],
            ['Examples', classroomTeachingNotes.examples],
            ['Step-by-Step Derivations', classroomTeachingNotes.stepByStepExplanations],
            ['Classroom Discussions', classroomTeachingNotes.classroomDiscussion],
            ['Practical Applications', classroomTeachingNotes.practicalApplications],
            ['Lesson Summary', classroomTeachingNotes.summary],
          ];

          noteItems.forEach(([lbl, val]) => {
            if (val) {
              doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(`${lbl}:`);
              doc.fontSize(9).font('Helvetica').fillColor('#334155').text(val.replace(/<[^>]+>/g, ' '));
              doc.moveDown(0.4);
            }
          });
          doc.moveDown(1);
        }

        // 3. Slide Explanations
        if (slideExplanations && slideExplanations.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('3. SLIDE-WISE POWERPOINT EXPLANATIONS');
          doc.moveDown(0.3);

          slideExplanations.forEach((slide) => {
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(`Slide ${slide.slideNumber}: ${slide.slideHeading}`);
            if (slide.detailedTeacherExplanation) {
              doc.fontSize(9).font('Helvetica').fillColor('#334155').text(`Explanation: ${slide.detailedTeacherExplanation}`);
            }
            if (slide.studentFriendlyExamples) {
              doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569').text(`Example: ${slide.studentFriendlyExamples}`);
            }
            doc.moveDown(0.5);
          });
          doc.moveDown(1);
        }

        // 4. Question Bank
        if (questionBank) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e40af').text('4. QUESTION BANK');
          doc.moveDown(0.3);

          if (questionBank.mcqs) {
            questionBank.mcqs.forEach((m, idx) => {
              doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(`Q${idx + 1}. ${m.question}`);
              doc.fontSize(8.5).font('Helvetica').fillColor('#334155').text((m.options || []).join('   |   '));
              doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#15803d').text(`Answer: ${m.answer}`);
              doc.moveDown(0.3);
            });
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
