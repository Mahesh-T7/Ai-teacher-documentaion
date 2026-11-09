import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
} from 'docx';

const cleanHtmlToPlainText = (html) => {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
};

export const generateDocxReport = async (reportData) => {
  const { teacher, meta, diaryEntries = [], photos = [] } = reportData;
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  const children = [];

  // Title & School Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: teacher.schoolName.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Official Teacher Documentation & Academic Inspection Report',
          italics: true,
          size: 20, // 10pt
          color: '64748B',
        }),
      ],
    }),
    new Paragraph({ text: '' })
  );

  // Meta Table
  const metaRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Teacher Name: ', bold: true, size: 19 }),
                new TextRun({ text: teacher.fullName, size: 19 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Designation: ', bold: true, size: 19 }),
                new TextRun({ text: teacher.designation, size: 19 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Academic Year: ', bold: true, size: 19 }),
                new TextRun({ text: meta.academicYear, size: 19 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Report Type: ', bold: true, size: 19 }),
                new TextRun({ text: meta.reportType.toUpperCase(), size: 19 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Reporting Date(s): ', bold: true, size: 19 }),
                new TextRun({
                  text: `${new Date(meta.startDate).toLocaleDateString('en-GB')} to ${new Date(meta.endDate).toLocaleDateString('en-GB')}`,
                  size: 19,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Teaching Days: ', bold: true, size: 19 }),
                new TextRun({ text: `${meta.actualTeachingDays} days recorded`, size: 19 }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows,
    }),
    new Paragraph({ text: '' })
  );

  // Diary Entries
  if (diaryEntries.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'No teaching diary records found.', italics: true, color: '64748B' })],
      })
    );
  } else {
    diaryEntries.forEach((entry, idx) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: `Classroom Record #${idx + 1}: ${entry.className} (${entry.section || 'A'}) - ${entry.subject}`,
              bold: true,
              color: '1E3A8A',
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun({ text: `${new Date(entry.date).toLocaleDateString('en-GB')} | ` }),
            new TextRun({ text: 'Period: ', bold: true }),
            new TextRun({ text: `Period ${entry.periodNumber || 1} | ` }),
            new TextRun({ text: 'Topic: ', bold: true }),
            new TextRun({ text: entry.topic || 'Class Instruction' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Learning Objectives (ಕಲಿಕಾ ಉದ್ದೇಶಗಳು): ', bold: true, color: '0284C7' }),
            new TextRun({ text: entry.learningObjectives || 'Standard curriculum objectives' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Detailed Actual Teaching Content: ', bold: true, color: '1E3A8A' }),
          ],
        })
      );

      const plainContent = cleanHtmlToPlainText(entry.detailedExplanation);
      const paragraphs = (plainContent || 'No detailed text available.').split('\n\n');
      paragraphs.forEach((p) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p.trim(), size: 20 })],
            spacing: { after: 120 },
          })
        );
      });

      if (entry.classroomActivities) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Activities Conducted: ', bold: true }),
              new TextRun({ text: entry.classroomActivities.activitiesConducted || 'Classroom questions and exercises' }),
            ],
          })
        );
      }

      if (entry.completion) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Homework & Next Plan: ', bold: true }),
              new TextRun({ text: `${entry.completion.homeworkAssigned || 'Solve notebook questions'} | Next: ${entry.completion.nextClassPlan || 'Continue topic'}` }),
            ],
          }),
          new Paragraph({ text: '' })
        );
      }
    });
  }

  // Photo Evidence Section
  if (photos && photos.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Classroom Photographic Evidence', bold: true, color: '1E3A8A' })],
      })
    );

    for (const p of photos) {
      const pRuns = [
        new TextRun({ text: `📷 ${p.caption || 'Classroom Photo'}\n`, bold: true }),
        new TextRun({
          text: `Date: ${new Date(p.date).toLocaleDateString('en-GB')} | Class: ${p.className || ''} ${p.section || ''} | Subject: ${p.subject || ''}\n`,
          italics: true,
          size: 18,
          color: '64748B',
        }),
      ];

      const imgPath = p.storageKey ? path.resolve(uploadsDir, p.storageKey) : null;
      if (imgPath && fs.existsSync(imgPath)) {
        try {
          const imgBuffer = fs.readFileSync(imgPath);
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width: 380, height: 210 },
                }),
              ],
            })
          );
        } catch (imgErr) {
          console.warn('[Docx Image err]:', imgErr.message);
        }
      }

      children.push(new Paragraph({ children: pRuns, spacing: { after: 200 } }));
    }
  }

  // Signature Block
  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({ text: '' }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ text: '___________________________', bold: true }),
                new Paragraph({ text: 'Signature of Teacher', bold: true }),
                new Paragraph({ text: teacher.fullName, color: '64748B' }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ text: '___________________________', bold: true }),
                new Paragraph({ text: 'Signature of Headmaster / Principal', bold: true }),
                new Paragraph({ text: 'Institution Seal & Date', color: '64748B' }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};
