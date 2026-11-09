import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { generateClassMarksRegisterPdf } from './classRegisterPdfEngine.js';

/**
 * Strips HTML tags and decodes entities
 */
const cleanText = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

/**
 * 1. Generate Individual Student Report Card PDF (Portrait A4)
 */
export async function generateReportCardPdf({ examRecord, studentId, teacherInfo = {} }) {
  const student = (examRecord.studentMarks || []).find(
    (s) => String(s.studentId) === String(studentId) || String(s.rollNumber) === String(studentId)
  );

  if (!student) {
    throw new Error('Student marks not found in this examination record.');
  }

  const template = examRecord.templateSnapshot || {};
  const components = template.components || [];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      // Color Palette
      const primaryColor = '#1e3a8a'; // Deep Navy Blue
      const secondaryColor = '#0284c7'; // Academic Blue
      const successColor = '#15803d'; // Green
      const dangerColor = '#b91c1c'; // Red
      const textDark = '#0f172a';
      const textMuted = '#475569';
      const lineGray = '#cbd5e1';

      // Top colored bar
      doc.rect(0, 0, pageWidth, 6).fill(primaryColor);

      // School & Board Header
      doc
        .fontSize(16)
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text((teacherInfo.schoolName || 'GOVERNMENT / MODEL SECONDARY SCHOOL').toUpperCase(), 40, 24, {
          align: 'center',
          width: contentWidth,
        });

      doc
        .fontSize(9)
        .fillColor(textMuted)
        .font('Helvetica')
        .text('Central Board of Secondary Education & State Vocational / Skills Documentation Hub', {
          align: 'center',
          width: contentWidth,
        });

      doc.moveDown(0.5);

      // Report Card Banner Box
      const bannerY = doc.y;
      doc.rect(40, bannerY, contentWidth, 26).fillAndStroke('#eff6ff', primaryColor);
      doc
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('STUDENT OFFICIAL EXAMINATION REPORT CARD', 40, bannerY + 7, {
          align: 'center',
          width: contentWidth,
        });

      doc.y = bannerY + 36;

      // Student and Exam Information Grid Table
      const infoBoxY = doc.y;
      doc.rect(40, infoBoxY, contentWidth, 68).fillAndStroke('#f8fafc', lineGray);

      doc.fontSize(9).fillColor(textDark);

      // Column 1
      doc
        .font('Helvetica-Bold')
        .text('Student Name:', 50, infoBoxY + 8)
        .font('Helvetica')
        .text(student.studentName, 130, infoBoxY + 8)
        .font('Helvetica-Bold')
        .text('Roll Number:', 50, infoBoxY + 26)
        .font('Helvetica')
        .text(String(student.rollNumber), 130, infoBoxY + 26)
        .font('Helvetica-Bold')
        .text('Admission No:', 50, infoBoxY + 44)
        .font('Helvetica')
        .text(student.admissionNumber || 'N/A', 130, infoBoxY + 44);

      // Column 2
      const col2X = 320;
      doc
        .font('Helvetica-Bold')
        .text('Class & Section:', col2X, infoBoxY + 8)
        .font('Helvetica')
        .text(`${examRecord.className} (${examRecord.section || 'A'})`, col2X + 90, infoBoxY + 8)
        .font('Helvetica-Bold')
        .text('Subject:', col2X, infoBoxY + 26)
        .font('Helvetica')
        .text(examRecord.subject, col2X + 90, infoBoxY + 26)
        .font('Helvetica-Bold')
        .text('Exam Date:', col2X, infoBoxY + 44)
        .font('Helvetica')
        .text(new Date(examRecord.examDate).toLocaleDateString('en-GB'), col2X + 90, infoBoxY + 44);

      doc.y = infoBoxY + 80;

      // Component Breakdown Table Header
      const tableTop = doc.y;
      doc.rect(40, tableTop, contentWidth, 22).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);

      doc.text('CODE', 45, tableTop + 6, { width: 45 });
      doc.text('ASSESSMENT COMPONENT', 95, tableTop + 6, { width: 190 });
      doc.text('MAX RAW', 290, tableTop + 6, { width: 65, align: 'right' });
      doc.text('OBTAINED', 360, tableTop + 6, { width: 65, align: 'right' });
      doc.text('WEIGHTAGE', 430, tableTop + 6, { width: 65, align: 'right' });
      doc.text('FINAL MARK', 500, tableTop + 6, { width: 55, align: 'right' });

      let curY = tableTop + 22;

      // Component Rows
      components.forEach((comp, idx) => {
        const code = comp.code.trim().toUpperCase();
        const markDetail = student.componentMarks?.[code] || {};
        const isOdd = idx % 2 === 1;

        if (isOdd) {
          doc.rect(40, curY, contentWidth, 20).fill('#f8fafc');
        }

        doc.fillColor(textDark).font('Helvetica').fontSize(8.5);

        doc.font('Helvetica-Bold').text(code, 45, curY + 5, { width: 45 });
        doc.font('Helvetica').text(comp.name, 95, curY + 5, { width: 190 });
        doc.text(String(comp.maxRaw), 290, curY + 5, { width: 65, align: 'right' });

        const rawVal = markDetail.status === 'ABSENT'
          ? 'AB'
          : markDetail.status === 'EXEMPTED'
          ? 'EX'
          : String(markDetail.raw ?? 0);

        doc.text(rawVal, 360, curY + 5, { width: 65, align: 'right' });
        doc.text(String(comp.finalMarks), 430, curY + 5, { width: 65, align: 'right' });

        const finalVal = markDetail.status === 'ABSENT'
          ? '0'
          : String(markDetail.final ?? 0);

        doc.font('Helvetica-Bold').text(finalVal, 500, curY + 5, { width: 55, align: 'right' });

        curY += 20;
      });

      // Total Summary Row
      doc.rect(40, curY, contentWidth, 24).fillAndStroke('#eff6ff', primaryColor);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);

      doc.text('TOTAL FINAL AGGREGATE', 45, curY + 7, { width: 240 });
      doc.text(`RAW: ${student.totalRaw}`, 290, curY + 7, { width: 135, align: 'right' });
      doc.text(`MAX: ${template.totalFinalMarks || 100}`, 430, curY + 7, { width: 65, align: 'right' });
      doc.text(String(student.totalFinal), 500, curY + 7, { width: 55, align: 'right' });

      curY += 34;

      // Result & Performance Summary Card
      const resultBoxHeight = 65;
      doc.rect(40, curY, contentWidth, resultBoxHeight).fillAndStroke('#f8fafc', lineGray);

      const resColWidth = contentWidth / 4;

      // Col 1: Percentage
      doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('PERCENTAGE', 45, curY + 10);
      doc.fillColor(primaryColor).fontSize(16).text(`${student.percentage}%`, 45, curY + 24);

      // Col 2: Grade
      doc.fillColor(textMuted).fontSize(8).text('GRADE AWARDED', 40 + resColWidth, curY + 10);
      doc.fillColor(primaryColor).fontSize(16).text(student.grade, 40 + resColWidth, curY + 24);

      // Col 3: Final Result
      doc.fillColor(textMuted).fontSize(8).text('FINAL STATUS', 40 + resColWidth * 2, curY + 10);
      const statusColor = student.isPass ? successColor : dangerColor;
      doc.fillColor(statusColor).fontSize(16).text(student.isPass ? 'PASSED' : 'NEEDS IMPROVEMENT', 40 + resColWidth * 2, curY + 24);

      // Col 4: Distinction Badge
      doc.fillColor(textMuted).fontSize(8).text('SPECIAL HONOURS', 40 + resColWidth * 3, curY + 10);
      const distinctionText = student.isDistinction ? 'DISTINCTION' : 'STANDARD PASS';
      doc.fillColor(student.isDistinction ? '#b45309' : textDark).fontSize(11).font('Helvetica-Bold').text(distinctionText, 40 + resColWidth * 3, curY + 28);

      curY += resultBoxHeight + 20;

      // Remarks
      if (student.remarks) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(textDark).text('Evaluator Remarks:', 40, curY);
        doc.font('Helvetica').fillColor(textMuted).text(student.remarks, 40, curY + 14);
        curY += 36;
      }

      // Official Signatures
      const sigY = Math.max(curY + 20, 700);

      doc.moveTo(50, sigY).lineTo(200, sigY).strokeColor(textDark).lineWidth(0.8).stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark).text('Signature of Subject Teacher', 50, sigY + 5, {
        width: 150,
        align: 'center',
      });

      doc.moveTo(pageWidth - 200, sigY).lineTo(pageWidth - 50, sigY).strokeColor(textDark).lineWidth(0.8).stroke();
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textDark).text('Principal / Head of Institution', pageWidth - 200, sigY + 5, {
        width: 150,
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 2. Generate Class Marks Register PDF (Landscape A4)
 * High-performance, publication-grade official school register engine with bilingual Kannada/English support
 */
export async function generateClassRegisterPdf({ examRecord, teacherInfo = {} }) {
  return await generateClassMarksRegisterPdf({ examRecord, teacherInfo });
}

/**
 * 3. Generate Class Marks Register Excel (.xlsx) using ExcelJS
 */
export async function generateClassRegisterExcel({ examRecord, teacherInfo = {} }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Teacher Documentation Management Portal';
  workbook.created = new Date();

  const template = examRecord.templateSnapshot || {};
  const components = template.components || [];
  const students = examRecord.studentMarks || [];
  const stats = examRecord.statistics || {};

  // Sheet 1: Tabulation Sheet
  const sheet = workbook.addWorksheet('Class Marks Register', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  // Title Banner Rows
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = (teacherInfo.schoolName || 'GOVERNMENT / MODEL SECONDARY SCHOOL').toUpperCase();
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A2:J2');
  const subTitleCell = sheet.getCell('A2');
  subTitleCell.value = `OFFICIAL CLASS MARKS REGISTER | ${examRecord.className} (${examRecord.section || 'A'}) - ${examRecord.subject} | ${examRecord.examTitle}`;
  subTitleCell.font = { name: 'Calibri', size: 10, italic: true };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('A3:J3');
  const dateCell = sheet.getCell('A3');
  dateCell.value = `Academic Year: ${examRecord.academicYear} | Exam Date: ${new Date(examRecord.examDate).toLocaleDateString('en-GB')} | Status: ${examRecord.status}`;
  dateCell.font = { name: 'Calibri', size: 9 };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.addRow([]); // Blank row 4

  // Table Headers (Row 5)
  const headers = ['Roll No', 'Student Name', 'Admission No'];
  components.forEach((c) => {
    headers.push(`${c.code} Raw (Max ${c.maxRaw})`);
    headers.push(`${c.code} Final (Weight ${c.finalMarks})`);
  });
  headers.push('Total Raw', `Total Final (${template.totalFinalMarks || 100})`, 'Percentage (%)', 'Grade', 'Result', 'Remarks');

  const headerRow = sheet.addRow(headers);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' },
    };
  });

  // Student Data Rows
  students.forEach((stu, sIdx) => {
    const rowValues = [stu.rollNumber, stu.studentName, stu.admissionNumber || ''];

    components.forEach((c) => {
      const code = c.code.trim().toUpperCase();
      const markDetail = stu.componentMarks?.[code] || {};
      if (markDetail.status === 'ABSENT') {
        rowValues.push('AB', 0);
      } else if (markDetail.status === 'EXEMPTED') {
        rowValues.push('EX', 0);
      } else {
        rowValues.push(markDetail.raw ?? 0, markDetail.final ?? 0);
      }
    });

    rowValues.push(
      stu.totalRaw,
      stu.totalFinal,
      stu.percentage,
      stu.grade,
      stu.isEntirelyAbsent ? 'AB' : stu.isPass ? 'PASS' : 'FAIL',
      stu.remarks || ''
    );

    const dataRow = sheet.addRow(rowValues);
    dataRow.height = 18;

    const isEven = sIdx % 2 === 0;
    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: colNum <= 2 ? 'left' : 'center' };
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
      cell.border = {
        top: { style: 'hair' },
        left: { style: 'thin' },
        bottom: { style: 'hair' },
        right: { style: 'thin' },
      };
    });
  });

  // Summary Row at Bottom
  sheet.addRow([]);
  const summaryHeaderRow = sheet.addRow(['CLASS SUMMARY STATISTICS']);
  summaryHeaderRow.getCell(1).font = { bold: true, color: { argb: 'FF1E3A8A' } };

  sheet.addRow(['Total Enrolled', stats.totalStudents || students.length]);
  sheet.addRow(['Total Appeared', stats.appearedCount || 0]);
  sheet.addRow(['Passed Count', stats.passedCount || 0]);
  sheet.addRow(['Failed Count', stats.failedCount || 0]);
  sheet.addRow(['Pass Percentage', `${stats.passPercentage || 0}%`]);
  sheet.addRow(['Class Average Score', stats.classAverage || 0]);
  sheet.addRow(['Highest Score', stats.highestMarks || 0]);
  sheet.addRow(['Lowest Score', stats.lowestMarks || 0]);

  // Set Column Widths
  sheet.columns.forEach((col) => {
    col.width = 16;
  });
  sheet.getColumn(2).width = 24; // Student Name
  sheet.getColumn(3).width = 14; // Admission No

  // Sheet 2: Grade Distribution
  const gradeSheet = workbook.addWorksheet('Grade Analytics');
  gradeSheet.addRow(['Grade', 'Count of Students']);
  gradeSheet.getRow(1).font = { bold: true };

  const gradeDist = stats.gradeDistribution || {};
  Object.entries(gradeDist).forEach(([grade, count]) => {
    gradeSheet.addRow([grade, count]);
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * 4. Generate Bulk Report Cards for All Students in One Combined PDF
 */
export async function generateBulkReportCardsPdf({ examRecord, teacherInfo = {} }) {
  const students = examRecord.studentMarks || [];
  if (students.length === 0) {
    throw new Error('No students found to generate report cards.');
  }

  const template = examRecord.templateSnapshot || {};
  const components = template.components || [];

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      const primaryColor = '#1e3a8a';
      const successColor = '#15803d';
      const dangerColor = '#b91c1c';
      const textDark = '#0f172a';
      const textMuted = '#475569';
      const lineGray = '#cbd5e1';

      students.forEach((student, sIdx) => {
        if (sIdx > 0) doc.addPage();

        // Top bar
        doc.rect(0, 0, pageWidth, 6).fill(primaryColor);

        // School Title
        doc
          .fontSize(15)
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .text((teacherInfo.schoolName || 'GOVERNMENT / MODEL SECONDARY SCHOOL').toUpperCase(), 40, 24, {
            align: 'center',
            width: contentWidth,
          });

        doc
          .fontSize(8.5)
          .fillColor(textMuted)
          .font('Helvetica')
          .text('Department of Public Instruction & Skill Assessment Dossier', {
            align: 'center',
            width: contentWidth,
          });

        doc.moveDown(0.4);

        // Banner
        const bY = doc.y;
        doc.rect(40, bY, contentWidth, 24).fillAndStroke('#eff6ff', primaryColor);
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('STUDENT OFFICIAL EXAMINATION REPORT CARD', 40, bY + 6, {
            align: 'center',
            width: contentWidth,
          });

        doc.y = bY + 34;

        // Info box
        const iY = doc.y;
        doc.rect(40, iY, contentWidth, 62).fillAndStroke('#f8fafc', lineGray);
        doc.fontSize(8.5).fillColor(textDark);

        doc
          .font('Helvetica-Bold')
          .text('Student Name:', 50, iY + 6)
          .font('Helvetica')
          .text(student.studentName, 130, iY + 6)
          .font('Helvetica-Bold')
          .text('Roll Number:', 50, iY + 23)
          .font('Helvetica')
          .text(String(student.rollNumber), 130, iY + 23)
          .font('Helvetica-Bold')
          .text('Admission No:', 50, iY + 40)
          .font('Helvetica')
          .text(student.admissionNumber || 'N/A', 130, iY + 40);

        const col2X = 320;
        doc
          .font('Helvetica-Bold')
          .text('Class & Section:', col2X, iY + 6)
          .font('Helvetica')
          .text(`${examRecord.className} (${examRecord.section || 'A'})`, col2X + 90, iY + 6)
          .font('Helvetica-Bold')
          .text('Subject:', col2X, iY + 23)
          .font('Helvetica')
          .text(examRecord.subject, col2X + 90, iY + 23)
          .font('Helvetica-Bold')
          .text('Exam Date:', col2X, iY + 40)
          .font('Helvetica')
          .text(new Date(examRecord.examDate).toLocaleDateString('en-GB'), col2X + 90, iY + 40);

        doc.y = iY + 72;

        // Table Header
        const tY = doc.y;
        doc.rect(40, tY, contentWidth, 20).fill(primaryColor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);

        doc.text('CODE', 45, tY + 5, { width: 45 });
        doc.text('ASSESSMENT COMPONENT', 95, tY + 5, { width: 190 });
        doc.text('MAX RAW', 290, tY + 5, { width: 65, align: 'right' });
        doc.text('OBTAINED', 360, tY + 5, { width: 65, align: 'right' });
        doc.text('WEIGHTAGE', 430, tY + 5, { width: 65, align: 'right' });
        doc.text('FINAL MARK', 500, tY + 5, { width: 55, align: 'right' });

        let rowY = tY + 20;

        components.forEach((comp, cIdx) => {
          const code = comp.code.trim().toUpperCase();
          const markDetail = student.componentMarks?.[code] || {};
          if (cIdx % 2 === 1) doc.rect(40, rowY, contentWidth, 18).fill('#f8fafc');

          doc.fillColor(textDark).font('Helvetica').fontSize(8);
          doc.font('Helvetica-Bold').text(code, 45, rowY + 4, { width: 45 });
          doc.font('Helvetica').text(comp.name, 95, rowY + 4, { width: 190 });
          doc.text(String(comp.maxRaw), 290, rowY + 4, { width: 65, align: 'right' });

          const rawVal = markDetail.status === 'ABSENT'
            ? 'AB'
            : markDetail.status === 'EXEMPTED'
            ? 'EX'
            : String(markDetail.raw ?? 0);
          doc.text(rawVal, 360, rowY + 4, { width: 65, align: 'right' });
          doc.text(String(comp.finalMarks), 430, rowY + 4, { width: 65, align: 'right' });

          const finalVal = markDetail.status === 'ABSENT' ? '0' : String(markDetail.final ?? 0);
          doc.font('Helvetica-Bold').text(finalVal, 500, rowY + 4, { width: 55, align: 'right' });

          rowY += 18;
        });

        // Total Row
        doc.rect(40, rowY, contentWidth, 22).fillAndStroke('#eff6ff', primaryColor);
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5);
        doc.text('TOTAL FINAL AGGREGATE', 45, rowY + 6, { width: 240 });
        doc.text(`RAW: ${student.totalRaw}`, 290, rowY + 6, { width: 135, align: 'right' });
        doc.text(`MAX: ${template.totalFinalMarks || 100}`, 430, rowY + 6, { width: 65, align: 'right' });
        doc.text(String(student.totalFinal), 500, rowY + 6, { width: 55, align: 'right' });

        rowY += 30;

        // Result Box
        doc.rect(40, rowY, contentWidth, 55).fillAndStroke('#f8fafc', lineGray);
        const colW = contentWidth / 4;
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica-Bold').text('PERCENTAGE', 45, rowY + 8);
        doc.fillColor(primaryColor).fontSize(14).text(`${student.percentage}%`, 45, rowY + 22);

        doc.fillColor(textMuted).fontSize(7.5).text('GRADE', 40 + colW, rowY + 8);
        doc.fillColor(primaryColor).fontSize(14).text(student.grade, 40 + colW, rowY + 22);

        doc.fillColor(textMuted).fontSize(7.5).text('RESULT', 40 + colW * 2, rowY + 8);
        doc.fillColor(student.isPass ? successColor : dangerColor).fontSize(14).text(student.isPass ? 'PASSED' : 'NEEDS IMPROVEMENT', 40 + colW * 2, rowY + 22);

        doc.fillColor(textMuted).fontSize(7.5).text('HONOURS', 40 + colW * 3, rowY + 8);
        doc.fillColor(student.isDistinction ? '#b45309' : textDark).fontSize(10).text(student.isDistinction ? 'DISTINCTION' : 'STANDARD PASS', 40 + colW * 3, rowY + 24);

        // Signatures
        const sY = Math.max(rowY + 80, 720);
        doc.moveTo(50, sY).lineTo(200, sY).strokeColor(textDark).lineWidth(0.8).stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text('Signature of Subject Teacher', 50, sY + 4, {
          width: 150,
          align: 'center',
        });

        doc.moveTo(pageWidth - 200, sY).lineTo(pageWidth - 50, sY).strokeColor(textDark).lineWidth(0.8).stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(textDark).text('Principal / Head of Institution', pageWidth - 200, sY + 4, {
          width: 150,
          align: 'center',
        });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 5. Generate Exact Replica AI/NSQF Excel Workbook (.xlsx)
 * Matches "Copy of AI_NSQF marks entry format.xlsx" with yellow editable and grey formula cells
 */
export async function generateAiNsqfExcelWorkbook({ examRecord, teacherInfo = {} }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Teacher Documentation Management Portal';
  workbook.created = new Date();

  const students = examRecord.studentMarks || [];
  const className = examRecord.className || '9th';
  const section = examRecord.section || 'A';
  const sheetTitle = `${className} ${section}`.trim();

  const sheet = workbook.addWorksheet(sheetTitle, {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }],
  });

  // Color Fills & Borders
  const editableFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFACD' }, // Soft Yellow
  };
  const formulaFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Formula Soft Grey
  };
  const headerDarkFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 900
  };
  const headerBlueFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue 800
  };
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Row 1: Main Assessment Groups
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'Student Information';
  sheet.mergeCells('E1:I1');
  sheet.getCell('E1').value = 'FA 1 (Formative Assessment 1)';
  sheet.mergeCells('J1:N1');
  sheet.getCell('J1').value = 'FA 2 (Formative Assessment 2)';
  sheet.mergeCells('O1:P1');
  sheet.getCell('O1').value = 'FA1+FA2 (Internal Assessment)';
  sheet.mergeCells('Q1:Y1');
  sheet.getCell('Q1').value = 'SA1 (Summative Assessment 1 / Term 1 Final)';
  sheet.getCell('Z1').value = 'Result';

  ['A1', 'E1', 'J1', 'O1', 'Q1', 'Z1'].forEach((cellId) => {
    const c = sheet.getCell(cellId);
    c.fill = headerDarkFill;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Row 2: Assessment Components
  const row2Values = [
    'ಕ್ರ.ಸಂ (Sl No)',
    'ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು / ತಂದೆಯ ಹೆಸರು (Student Name)',
    'Gender',
    'Caste',
    'Activity 1',
    'Activity 2',
    'ಸಾ.ಪ (Test)',
    'ಒಟ್ಟು (Total)',
    'ಶ್ರೇಣಿ (Grade)',
    'Activity 3',
    'Activity 4',
    'ಸಾ.ಪ (Test)',
    'ಒಟ್ಟು (Total)',
    'ಶ್ರೇಣಿ (Grade)',
    'FA1+FA2 Total',
    'IA (20%)',
    'Theory Raw',
    'Theory (30)',
    'Hands-on Skill',
    'Portfolio',
    'Viva',
    'Practical Total',
    'Theory + Practical',
    'Grand Total (100)',
    'ಶ್ರೇಣಿ (Grade)',
    'Result Status',
  ];

  const r2 = sheet.addRow(row2Values);
  r2.height = 24;
  r2.eachCell((c) => {
    c.fill = headerBlueFill;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = borderThin;
  });

  // Row 3: Maximum Marks
  const row3Values = [
    '',
    '',
    '',
    '',
    'Max: 15',
    'Max: 15',
    'Max: 20',
    'Max: 50',
    'Grade',
    'Max: 15',
    'Max: 15',
    'Max: 20',
    'Max: 50',
    'Grade',
    'Max: 100',
    'Max: 20',
    'Max: 60',
    'Max: 30',
    'Max: 30',
    'Max: 10',
    'Max: 10',
    'Max: 50',
    'Max: 80',
    'Max: 100',
    'Grade',
    'Pass / Fail',
  ];

  const r3 = sheet.addRow(row3Values);
  r3.height = 18;
  r3.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    c.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF1E293B' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = borderThin;
  });

  // Helper for Grade lookup based on Grade Ref sheet
  const getFaGrade = (mark) => {
    if (mark >= 45) return 'A+';
    if (mark >= 40) return 'A';
    if (mark >= 35) return 'B+';
    if (mark >= 30) return 'B';
    if (mark >= 25) return 'C+';
    if (mark >= 18) return 'C';
    return 'NA';
  };

  const getSaGrade = (mark) => {
    if (mark >= 90) return 'A+';
    if (mark >= 80) return 'A';
    if (mark >= 70) return 'B+';
    if (mark >= 60) return 'B';
    if (mark >= 50) return 'C+';
    if (mark >= 35) return 'C';
    return 'NA';
  };

  // Student Data Rows
  students.forEach((stu, idx) => {
    const cm = stu.componentMarks || {};

    // Retrieve or calculate individual marks
    const fa1_act1 = Number(cm.FA1_ACT1?.rawMarks ?? cm.FA1_ACT1?.raw ?? 0);
    const fa1_act2 = Number(cm.FA1_ACT2?.rawMarks ?? cm.FA1_ACT2?.raw ?? 0);
    const fa1_test = Number(cm.FA1_TEST?.rawMarks ?? cm.FA1_TEST?.raw ?? 0);
    const fa1_tot = fa1_act1 + fa1_act2 + fa1_test;
    const fa1_grade = getFaGrade(fa1_tot);

    const fa2_act1 = Number(cm.FA2_ACT1?.rawMarks ?? cm.FA2_ACT1?.raw ?? 0);
    const fa2_act2 = Number(cm.FA2_ACT2?.rawMarks ?? cm.FA2_ACT2?.raw ?? 0);
    const fa2_test = Number(cm.FA2_TEST?.rawMarks ?? cm.FA2_TEST?.raw ?? 0);
    const fa2_tot = fa2_act1 + fa2_act2 + fa2_test;
    const fa2_grade = getFaGrade(fa2_tot);

    const fa_agg = fa1_tot + fa2_tot;
    const ia_20 = Math.round(fa_agg * 0.2);

    const th_raw = Number(cm.SA1_TH_RAW?.rawMarks ?? cm.TH?.rawMarks ?? cm.SA1_TH_RAW?.raw ?? cm.TH?.raw ?? 0);
    const th_30 = Math.round(th_raw / 2);

    const pr_hands = Number(cm.SA1_PR_HANDS?.rawMarks ?? cm.PR?.rawMarks ?? 0);
    const pr_port = Number(cm.SA1_PR_PORT?.rawMarks ?? cm.ATT?.rawMarks ?? 0);
    const pr_viva = Number(cm.SA1_PR_VIVA?.rawMarks ?? cm.VIVA?.rawMarks ?? 0);
    const pr_tot = pr_hands + pr_port + pr_viva || Number(cm.PR?.rawMarks ?? 0);

    const th_pr_80 = th_30 + pr_tot;
    const grand_tot = stu.totalFinal !== undefined ? stu.totalFinal : ia_20 + th_pr_80;
    const grand_grade = getSaGrade(grand_tot);
    const resultStatus = grand_tot >= 35 ? 'PASS' : 'FAIL';

    const rowData = [
      stu.rollNumber || idx + 1,
      stu.studentName,
      stu.gender || 'M',
      stu.caste || 'GEN',
      fa1_act1,
      fa1_act2,
      fa1_test,
      fa1_tot,
      fa1_grade,
      fa2_act1,
      fa2_act2,
      fa2_test,
      fa2_tot,
      fa2_grade,
      fa_agg,
      ia_20,
      th_raw,
      th_30,
      pr_hands,
      pr_port,
      pr_viva,
      pr_tot,
      th_pr_80,
      grand_tot,
      grand_grade,
      resultStatus,
    ];

    const dataRow = sheet.addRow(rowData);
    dataRow.height = 20;

    // Apply exact cell styling
    dataRow.eachCell({ includeEmpty: true }, (c, colNum) => {
      c.border = borderThin;
      c.font = { name: 'Calibri', size: 9 };
      c.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'left' : 'center' };

      // Editable yellow columns: 5,6,7 (FA1 inputs), 10,11,12 (FA2 inputs), 17 (Theory Raw), 19,20,21 (Practical inputs)
      if ([5, 6, 7, 10, 11, 12, 17, 19, 20, 21].includes(colNum)) {
        c.fill = editableFill;
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E40AF' } }; // Blue text
      } else {
        c.fill = formulaFill;
        if ([8, 13, 15, 16, 18, 22, 23, 24].includes(colNum)) {
          c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        }
      }
    });
  });

  // Auto-fit column widths
  sheet.columns.forEach((col, cIdx) => {
    if (cIdx === 1) col.width = 28; // Student Name
    else if (cIdx === 0) col.width = 8; // Sl No
    else col.width = 12;
  });

  // Sheet 2: Grade Reference Table
  const gradeSheet = workbook.addWorksheet('Grade Ref');
  gradeSheet.addRow(['FA (50) Scale', '', '', '', 'SA (100) Scale', '', '']);
  gradeSheet.addRow(['Range', 'Min %', 'Grade', '', 'Range', 'Min %', 'Grade']);
  const gradeRows = [
    ['0-17.9', 0, 'NA', '', '0-34.9', 0, 'NA'],
    ['18-24.9', 18, 'C', '', '35-49.9', 35, 'C'],
    ['25-29.9', 25, 'C+', '', '50-59.9', 50, 'C+'],
    ['30-34.9', 30, 'B', '', '60-69.9', 60, 'B'],
    ['35-39.9', 35, 'B+', '', '70-79.9', 70, 'B+'],
    ['40-44.9', 40, 'A', '', '80-89.9', 80, 'A'],
    ['45-50', 45, 'A+', '', '90-100', 90, 'A+'],
  ];
  gradeRows.forEach((r) => gradeSheet.addRow(r));

  return await workbook.xlsx.writeBuffer();
}
