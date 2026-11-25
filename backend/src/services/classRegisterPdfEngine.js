import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontsDir = path.resolve(__dirname, '..', 'assets', 'fonts');

/**
 * Registers embedded TrueType fonts with Unicode & Indic (Kannada) support
 */
function registerFonts(doc) {
  const notoReg = path.join(fontsDir, 'NotoSans-Regular.ttf');
  const notoBold = path.join(fontsDir, 'NotoSans-Bold.ttf');
  const anekFont = path.join(fontsDir, 'AnekKannada.ttf');

  if (fs.existsSync(notoReg)) doc.registerFont('Noto', notoReg);
  if (fs.existsSync(notoBold)) doc.registerFont('Noto-Bold', notoBold);
  if (fs.existsSync(anekFont)) {
    doc.registerFont('Kannada', anekFont);
    doc.registerFont('Kannada-Bold', anekFont);
  }
}

/**
 * Selects font based on language/Unicode presence
 */
function selectFont(doc, isBold = false, text = '') {
  const hasKannada = /[\u0C80-\u0CFF]/.test(String(text || ''));
  const hasKanFont = !!doc._registeredFonts?.['Kannada'];
  const hasNotoFont = !!doc._registeredFonts?.['Noto'];

  if (hasKannada && hasKanFont) {
    const fontName = isBold ? 'Kannada-Bold' : 'Kannada';
    doc.font(fontName);
    return fontName;
  }
  if (hasNotoFont) {
    const fontName = isBold && doc._registeredFonts?.['Noto-Bold'] ? 'Noto-Bold' : 'Noto';
    doc.font(fontName);
    return fontName;
  }
  const fallback = isBold ? 'Helvetica-Bold' : 'Helvetica';
  doc.font(fallback);
  return fallback;
}

/**
 * Draw an elegant school academic crest/logo icon in vector format
 */
function drawSchoolCrest(doc, x, y, size = 38) {
  doc.save();
  // Outer shield / crest outline
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  // Background circle / seal
  doc.circle(cx, cy, r - 1).fillAndStroke('#eff6ff', '#1e3a8a');

  // Inner decorative ring
  doc.circle(cx, cy, r - 4).lineWidth(0.8).stroke('#3b82f6');

  // Graduation cap / book emblem icon
  doc.fillColor('#1e3a8a');
  // Cap diamond
  doc
    .polygon([cx, cy - 8], [cx + 10, cy - 3], [cx, cy + 2], [cx - 10, cy - 3])
    .fill('#1e3a8a');
  // Cap base
  doc
    .polygon([cx - 7, cy - 1], [cx + 7, cy - 1], [cx + 6, cy + 4], [cx - 6, cy + 4])
    .fill('#2563eb');
  // Tassel
  doc
    .moveTo(cx + 9, cy - 3)
    .lineTo(cx + 11, cy + 4)
    .lineWidth(1)
    .stroke('#d97706');

  // Open book at bottom
  doc
    .polygon([cx - 8, cy + 7], [cx, cy + 9], [cx + 8, cy + 7], [cx + 8, cy + 11], [cx, cy + 13], [cx - 8, cy + 11])
    .fill('#1e3a8a');

  doc.restore();
}

/**
 * Main Class Marks Register & Tabulation Sheet PDF Generator
 */
export async function generateClassMarksRegisterPdf({ examRecord, teacherInfo = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 25,
        bufferPages: true,
        autoFirstPage: true,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      registerFonts(doc);

      const pageWidth = doc.page.width; // 841.89 pt
      const pageHeight = doc.page.height; // 595.28 pt
      const margin = 25;
      const contentWidth = pageWidth - margin * 2; // ~791.89 pt
      const tableLeft = margin;

      // Extract metadata
      const rawSchoolName = (teacherInfo.schoolName || examRecord.schoolName || 'GOVERNMENT / MODEL SECONDARY SCHOOL').trim();
      const schoolName = rawSchoolName.toUpperCase();
      const className = examRecord.className || 'Class 9';
      const section = examRecord.section || 'A';
      const subject = examRecord.subject || 'Artificial Intelligence';
      const examTitle = examRecord.examTitle || 'Term 1 Assessment (AI/NSQF Official Sheet)';
      const academicYear = examRecord.academicYear || '2026-2027';
      const teacherName = teacherInfo.fullName || teacherInfo.name || 'Subject Teacher';
      const designation = teacherInfo.designation || 'Senior Faculty';
      const students = examRecord.studentMarks || [];
      const template = examRecord.templateSnapshot || {};
      const components = template.components || [];

      // Color scheme
      const navyDark = '#0f172a';
      const navyPrimary = '#1e3a8a';
      const navyHeader = '#1e293b';
      const blueAccent = '#2563eb';
      const lineBorder = '#cbd5e1';
      const rowAltBg = '#f8fafc';
      const white = '#ffffff';

      // ----------------------------------------------------------------------
      // Determine Tabulation Columns
      // ----------------------------------------------------------------------
      // Fixed leading columns: Sl (20), Roll (26), Name (110), Adm No (64) => 220 pt
      const colW_sl = 20;
      const colW_roll = 26;
      const colW_name = 110;
      const colW_adm = 64;
      const fixedLeftWidth = colW_sl + colW_roll + colW_name + colW_adm; // 220 pt

      // Fixed trailing columns: Total (38), % (32), Grade (26), Result (32) => 128 pt
      const colW_tot = 38;
      const colW_pct = 32;
      const colW_grade = 26;
      const colW_res = 32;
      const fixedRightWidth = colW_tot + colW_pct + colW_grade + colW_res; // 128 pt

      const remainingCompWidth = contentWidth - fixedLeftWidth - fixedRightWidth; // 792 - 340 = 452 pt

      // Default standard components if components array is empty
      let displayComponents = [];
      if (components && components.length > 0) {
        displayComponents = components.map((c) => {
          const code = c.code || c.key || c.id || 'COMP';
          const name = c.name || c.label || code;
          const maxRaw = c.maxRaw || c.maxMarks || 50;
          const finalMarks = c.finalMarks || c.maxMarks || maxRaw;
          const upperCode = String(code).toUpperCase();
          const group =
            c.group ||
            (upperCode.startsWith('FA1') || upperCode.startsWith('FA_1')
              ? 'FA 1'
              : upperCode.startsWith('FA2') || upperCode.startsWith('FA_2')
              ? 'FA 2'
              : upperCode.startsWith('FA3') || upperCode.startsWith('FA_3')
              ? 'FA 3'
              : upperCode.startsWith('FA4') || upperCode.startsWith('FA_4')
              ? 'FA 4'
              : upperCode.startsWith('SA1') || upperCode.startsWith('SA_1')
              ? 'SA 1'
              : upperCode.startsWith('SA2') || upperCode.startsWith('SA_2')
              ? 'SA 2'
              : upperCode.startsWith('TERM1')
              ? 'Term 1'
              : upperCode.startsWith('TERM2')
              ? 'Term 2'
              : upperCode.startsWith('SA') || upperCode.startsWith('TH')
              ? 'Summative Assessment'
              : upperCode.includes('PR')
              ? 'Practical'
              : 'Assessment');
          return {
            code,
            name,
            maxRaw,
            finalMarks,
            group,
            isTotal: c.isTotal || false,
          };
        });
      } else {
        // Standard AI/NSQF default columns
        displayComponents = [
          { code: 'FA1_ACT1', name: 'Act 1', maxRaw: 15, group: 'FA 1' },
          { code: 'FA1_ACT2', name: 'Act 2', maxRaw: 15, group: 'FA 1' },
          { code: 'FA1_TEST', name: 'Test', maxRaw: 20, group: 'FA 1' },
          { code: 'FA1_TOTAL', name: 'FA1 Tot', maxRaw: 50, isTotal: true, group: 'FA 1' },
          { code: 'FA2_ACT1', name: 'Act 1', maxRaw: 15, group: 'FA 2' },
          { code: 'FA2_ACT2', name: 'Act 2', maxRaw: 15, group: 'FA 2' },
          { code: 'FA2_TEST', name: 'Test', maxRaw: 20, group: 'FA 2' },
          { code: 'FA2_TOTAL', name: 'FA2 Tot', maxRaw: 50, isTotal: true, group: 'FA 2' },
          { code: 'IA_20', name: 'IA (20)', maxRaw: 20, isTotal: true, group: 'IA' },
          { code: 'SA1_TH_RAW', name: 'Theory', maxRaw: 70, group: 'SA 1' },
          { code: 'SA1_TH_30', name: 'Th (30)', maxRaw: 30, isTotal: true, group: 'SA 1' },
          { code: 'SA1_PR_TOT', name: 'Pr (50)', maxRaw: 50, isTotal: true, group: 'SA 1' },
        ];
      }

      const compCount = Math.max(1, displayComponents.length);
      const colW_comp = Math.floor(remainingCompWidth / compCount);
      const actualCompTotalWidth = colW_comp * compCount;
      // Balance out the table width so it fills contentWidth exactly
      const extraGap = remainingCompWidth - actualCompTotalWidth;
      const finalColW_name = colW_name + extraGap;

      // Group headers calculation
      const groupSpans = [];
      let currentGroup = null;
      let currentCount = 0;

      displayComponents.forEach((c) => {
        const gName = c.group || 'Assessment';
        if (!currentGroup) {
          currentGroup = gName;
          currentCount = 1;
        } else if (currentGroup === gName) {
          currentCount++;
        } else {
          groupSpans.push({ name: currentGroup, count: currentCount });
          currentGroup = gName;
          currentCount = 1;
        }
      });
      if (currentGroup) {
        groupSpans.push({ name: currentGroup, count: currentCount });
      }

      // ----------------------------------------------------------------------
      // Header Render Helper
      // ----------------------------------------------------------------------
      const drawDocumentHeader = (yStart) => {
        let y = yStart;

        // Top decorative accent line
        doc.rect(margin, y, contentWidth, 3).fill(navyPrimary);
        y += 7;

        // Draw Emblem
        drawSchoolCrest(doc, margin + 4, y + 1, 40);

        // School and Document Title
        selectFont(doc, true, schoolName);
        doc.fontSize(13).fillColor(navyPrimary).text(schoolName, margin + 50, y, {
          width: contentWidth - 100,
          align: 'center',
        });

        y += 16;
        selectFont(doc, true);
        doc.fontSize(10.5).fillColor(navyDark).text('CLASS MARKS REGISTER & TABULATION SHEET', margin + 50, y, {
          width: contentWidth - 100,
          align: 'center',
        });

        y += 13;
        selectFont(doc, false);
        doc.fontSize(7.5).fillColor('#64748b').text(
          `OFFICIAL ACADEMIC EVALUATION RECORD • ACADEMIC YEAR: ${academicYear} • DEPARTMENT / BOARD STANDARDS`,
          margin + 50,
          y,
          { width: contentWidth - 100, align: 'center' }
        );

        y += 16;

        // 4-cell structured metadata box
        const metaBoxY = y;
        const metaBoxH = 32;
        doc.rect(margin, metaBoxY, contentWidth, metaBoxH).fillAndStroke('#f8fafc', lineBorder);

        const colWidth = contentWidth / 4;

        // Cell 1: Class & Section
        doc.rect(margin, metaBoxY, colWidth, metaBoxH).stroke(lineBorder);
        selectFont(doc, true);
        doc.fontSize(6.8).fillColor('#64748b').text('CLASS & SECTION', margin + 8, metaBoxY + 4, { lineBreak: false });
        selectFont(doc, true);
        doc.fontSize(8.5).fillColor(navyPrimary).text(`${className} – Section ${section}`, margin + 8, metaBoxY + 15, {
          width: colWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

        // Cell 2: Subject
        doc.rect(margin + colWidth, metaBoxY, colWidth, metaBoxH).stroke(lineBorder);
        selectFont(doc, true);
        doc.fontSize(6.8).fillColor('#64748b').text('SUBJECT', margin + colWidth + 8, metaBoxY + 4, { lineBreak: false });
        selectFont(doc, true, subject);
        doc.fontSize(8.5).fillColor(navyDark).text(subject, margin + colWidth + 8, metaBoxY + 15, {
          width: colWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

        // Cell 3: Examination Name
        doc.rect(margin + colWidth * 2, metaBoxY, colWidth, metaBoxH).stroke(lineBorder);
        selectFont(doc, true);
        doc.fontSize(6.8).fillColor('#64748b').text('EXAMINATION', margin + colWidth * 2 + 8, metaBoxY + 4, { lineBreak: false });
        selectFont(doc, true, examTitle);
        doc.fontSize(8.5).fillColor(navyDark).text(examTitle, margin + colWidth * 2 + 8, metaBoxY + 15, {
          width: colWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

        // Cell 4: Subject Teacher
        doc.rect(margin + colWidth * 3, metaBoxY, colWidth, metaBoxH).stroke(lineBorder);
        selectFont(doc, true);
        doc.fontSize(6.8).fillColor('#64748b').text('SUBJECT TEACHER', margin + colWidth * 3 + 8, metaBoxY + 4, { lineBreak: false });
        selectFont(doc, true, teacherName);
        doc.fontSize(8.5).fillColor(navyDark).text(`${teacherName} (${designation})`, margin + colWidth * 3 + 8, metaBoxY + 15, {
          width: colWidth - 16,
          lineBreak: false,
          ellipsis: true,
        });

        return metaBoxY + metaBoxH + 8;
      };

      // ----------------------------------------------------------------------
      // Table Header Render Helper (Repeated on Page Breaks)
      // ----------------------------------------------------------------------
      const drawTableHeader = (yTop) => {
        const tier1H = 15;
        const tier2H = 18;
        const totalHeaderH = tier1H + tier2H;

        // Background for Tier 1
        doc.rect(tableLeft, yTop, contentWidth, tier1H).fill(navyPrimary);
        // Background for Tier 2
        doc.rect(tableLeft, yTop + tier1H, contentWidth, tier2H).fill(navyHeader);

        // Outline border
        doc.rect(tableLeft, yTop, contentWidth, totalHeaderH).lineWidth(0.8).stroke(navyDark);

        selectFont(doc, true);
        doc.fillColor(white).fontSize(7);

        // Tier 1 Left: "STUDENT IDENTITY"
        const studentInfoWidth = colW_sl + colW_roll + finalColW_name + colW_adm;
        doc.text('STUDENT INFORMATION', tableLeft, yTop + 4, {
          width: studentInfoWidth,
          align: 'center',
        });
        doc.moveTo(tableLeft + studentInfoWidth, yTop).lineTo(tableLeft + studentInfoWidth, yTop + tier1H).stroke(navyHeader);

        // Tier 1 Middle: Group Headers
        let groupX = tableLeft + studentInfoWidth;
        groupSpans.forEach((g) => {
          const gW = g.count * colW_comp;
          doc.fontSize(6.5).text(g.name.toUpperCase(), groupX + 2, yTop + 4.5, {
            width: gW - 4,
            align: 'center',
            lineBreak: false,
            ellipsis: true,
          });
          doc.moveTo(groupX + gW, yTop).lineTo(groupX + gW, yTop + tier1H).stroke(navyHeader);
          groupX += gW;
        });

        // Tier 1 Right: "FINAL EVALUATION"
        doc.text('FINAL EVALUATION', groupX, yTop + 4, { width: fixedRightWidth, align: 'center' });

        // Tier 2: Column Headers
        let curX = tableLeft;
        selectFont(doc, true);
        doc.fillColor(white).fontSize(6.8);

        // Sl
        doc.text('SL', curX, yTop + tier1H + 5, { width: colW_sl, align: 'center' });
        doc.moveTo(curX + colW_sl, yTop + tier1H).lineTo(curX + colW_sl, yTop + totalHeaderH).stroke('#334155');
        curX += colW_sl;

        // Roll
        doc.text('R.NO', curX, yTop + tier1H + 5, { width: colW_roll, align: 'center' });
        doc.moveTo(curX + colW_roll, yTop + tier1H).lineTo(curX + colW_roll, yTop + totalHeaderH).stroke('#334155');
        curX += colW_roll;

        // Name
        doc.text('STUDENT NAME', curX + 4, yTop + tier1H + 5, { width: finalColW_name - 8, align: 'left' });
        doc.moveTo(curX + finalColW_name, yTop + tier1H).lineTo(curX + finalColW_name, yTop + totalHeaderH).stroke('#334155');
        curX += finalColW_name;

        // Admission Number
        doc.text('ADM NO', curX, yTop + tier1H + 5, { width: colW_adm, align: 'center' });
        doc.moveTo(curX + colW_adm, yTop + tier1H).lineTo(curX + colW_adm, yTop + totalHeaderH).stroke('#334155');
        curX += colW_adm;

        // Component Columns
        displayComponents.forEach((comp) => {
          const label = `${comp.name}\n(${comp.maxRaw})`;
          doc.fontSize(6).text(label, curX, yTop + tier1H + 2.5, {
            width: colW_comp,
            align: 'center',
            lineGap: -1,
          });
          doc.moveTo(curX + colW_comp, yTop + tier1H).lineTo(curX + colW_comp, yTop + totalHeaderH).stroke('#334155');
          curX += colW_comp;
        });

        // Trailing Headers
        doc.fontSize(6.8);
        doc.text(`TOTAL\n(${template.totalFinalMarks || 100})`, curX, yTop + tier1H + 2.5, { width: colW_tot, align: 'center', lineGap: -1 });
        doc.moveTo(curX + colW_tot, yTop + tier1H).lineTo(curX + colW_tot, yTop + totalHeaderH).stroke('#334155');
        curX += colW_tot;

        doc.text('%\nAGE', curX, yTop + tier1H + 2.5, { width: colW_pct, align: 'center', lineGap: -1 });
        doc.moveTo(curX + colW_pct, yTop + tier1H).lineTo(curX + colW_pct, yTop + totalHeaderH).stroke('#334155');
        curX += colW_pct;

        doc.text('GRD', curX, yTop + tier1H + 5, { width: colW_grade, align: 'center' });
        doc.moveTo(curX + colW_grade, yTop + tier1H).lineTo(curX + colW_grade, yTop + totalHeaderH).stroke('#334155');
        curX += colW_grade;

        doc.text('RES', curX, yTop + tier1H + 5, { width: colW_res, align: 'center' });

        return yTop + totalHeaderH;
      };

      // ----------------------------------------------------------------------
      // Draw Page 1
      // ----------------------------------------------------------------------
      let currentY = drawDocumentHeader(margin);
      currentY = drawTableHeader(currentY);

      const rowHeight = 17;
      const bottomPageLimit = pageHeight - 50;

      // ----------------------------------------------------------------------
      // Student Rows Loop
      // ----------------------------------------------------------------------
      students.forEach((stu, idx) => {
        // Page break if row will overflow page
        if (currentY + rowHeight > bottomPageLimit) {
          doc.addPage();
          let contY = margin;

          // Continuation mini-header
          doc.rect(margin, contY, contentWidth, 14).fill('#f1f5f9');
          selectFont(doc, true);
          doc.fontSize(7.5).fillColor(navyPrimary).text(
            `CLASS MARKS REGISTER (CONTINUED) • ${className} – Section ${section} • Subject: ${subject} • Academic Year: ${academicYear}`,
            margin + 8,
            contY + 3
          );
          contY += 18;

          // REPEAT FULL 2-TIER TABLE HEADER!
          currentY = drawTableHeader(contY);
        }

        const isAlt = idx % 2 === 1;
        if (isAlt) {
          doc.rect(tableLeft, currentY, contentWidth, rowHeight).fill(rowAltBg);
        }

        // Row outline
        doc.rect(tableLeft, currentY, contentWidth, rowHeight).lineWidth(0.4).stroke(lineBorder);

        let rx = tableLeft;

        // 1. Sl No
        selectFont(doc, false);
        doc.fontSize(7).fillColor('#64748b').text(String(idx + 1), rx, currentY + 4.5, {
          width: colW_sl,
          align: 'center',
        });
        doc.moveTo(rx + colW_sl, currentY).lineTo(rx + colW_sl, currentY + rowHeight).lineWidth(0.4).stroke(lineBorder);
        rx += colW_sl;

        // 2. Roll No
        selectFont(doc, true);
        doc.fontSize(7.5).fillColor(navyDark).text(String(stu.rollNumber || idx + 1), rx, currentY + 4.5, {
          width: colW_roll,
          align: 'center',
        });
        doc.moveTo(rx + colW_roll, currentY).lineTo(rx + colW_roll, currentY + rowHeight).stroke(lineBorder);
        rx += colW_roll;

        // 3. Student Name (Unicode/Kannada safe)
        const stuName = stu.studentName || 'Student';
        selectFont(doc, false, stuName);
        doc.fontSize(7.5).fillColor(navyDark).text(stuName, rx + 4, currentY + 4.5, {
          width: finalColW_name - 8,
          align: 'left',
          ellipsis: true,
        });
        doc.moveTo(rx + finalColW_name, currentY).lineTo(rx + finalColW_name, currentY + rowHeight).stroke(lineBorder);
        rx += finalColW_name;

        // 4. Admission Number (clean or blank, never fake)
        selectFont(doc, false);
        doc.fontSize(6.8).fillColor('#475569').text(stu.admissionNumber || '—', rx, currentY + 4.5, {
          width: colW_adm,
          align: 'center',
          lineBreak: false,
          ellipsis: true,
        });
        doc.moveTo(rx + colW_adm, currentY).lineTo(rx + colW_adm, currentY + rowHeight).stroke(lineBorder);
        rx += colW_adm;

        // 5. Dynamic Component Marks
        const cm = stu.componentMarks || {};
        const sm = stu.marks || {};

        displayComponents.forEach((comp) => {
          const codeKey = comp.code;
          const codeLower = String(comp.code).toLowerCase();
          const codeUpper = String(comp.code).toUpperCase();
          const detail = cm[codeKey] || cm[codeUpper] || cm[codeLower] || {};
          const simpleVal = sm[codeKey] ?? sm[codeLower] ?? sm[codeUpper];

          let cellText = '—';
          let textColor = navyDark;

          if (detail.status === 'ABSENT' || detail.rawMarks === 'AB' || detail.raw === 'AB' || simpleVal === 'AB') {
            cellText = 'AB';
            textColor = '#b45309';
          } else if (detail.status === 'EXEMPTED' || simpleVal === 'EX') {
            cellText = 'EX';
            textColor = '#0284c7';
          } else if (detail.rawMarks !== undefined && detail.rawMarks !== null && detail.rawMarks !== '') {
            cellText = String(detail.rawMarks);
          } else if (detail.raw !== undefined && detail.raw !== null && detail.raw !== '') {
            cellText = String(detail.raw);
          } else if (detail.final !== undefined && detail.final !== null && detail.final !== '') {
            cellText = String(detail.final);
          } else if (simpleVal !== undefined && simpleVal !== null && simpleVal !== '') {
            cellText = String(simpleVal);
          }

          selectFont(doc, comp.isTotal);
          doc.fontSize(7.5).fillColor(textColor).text(cellText, rx, currentY + 4.5, {
            width: colW_comp,
            align: 'center',
          });
          doc.moveTo(rx + colW_comp, currentY).lineTo(rx + colW_comp, currentY + rowHeight).stroke(lineBorder);
          rx += colW_comp;
        });

        // 6. Total Marks
        const totalMarks =
          stu.grandTotal ??
          stu.totalFinal ??
          stu.totalMarks ??
          stu.totalRaw ??
          (stu.aggregateMarks?.totalScore !== undefined ? stu.aggregateMarks.totalScore : 0);
        selectFont(doc, true);
        doc.fontSize(7.5).fillColor(navyPrimary).text(String(totalMarks), rx, currentY + 4.5, {
          width: colW_tot - 2,
          align: 'right',
        });
        doc.moveTo(rx + colW_tot, currentY).lineTo(rx + colW_tot, currentY + rowHeight).stroke(lineBorder);
        rx += colW_tot;

        // 7. Percentage
        let pctRaw =
          stu.percentage !== undefined
            ? stu.percentage
            : stu.aggregateMarks?.percentage !== undefined
            ? stu.aggregateMarks.percentage
            : totalMarks;
        let pctStr = typeof pctRaw === 'number' ? `${pctRaw.toFixed(1)}%` : String(pctRaw);
        if (!pctStr.endsWith('%') && pctStr !== '—') pctStr = `${pctStr}%`;
        const numPct = parseFloat(String(pctStr).replace('%', '')) || 0;

        selectFont(doc, false);
        doc.fontSize(7).fillColor(navyDark).text(pctStr, rx, currentY + 4.5, {
          width: colW_pct - 2,
          align: 'right',
        });
        doc.moveTo(rx + colW_pct, currentY).lineTo(rx + colW_pct, currentY + rowHeight).stroke(lineBorder);
        rx += colW_pct;

        // 8. Grade
        const grade = stu.grade || stu.aggregateMarks?.grade || (numPct >= 40 ? 'B' : 'NA');
        selectFont(doc, true);
        doc.fontSize(7.5).fillColor(navyDark).text(String(grade), rx, currentY + 4.5, {
          width: colW_grade,
          align: 'center',
        });
        doc.moveTo(rx + colW_grade, currentY).lineTo(rx + colW_grade, currentY + rowHeight).stroke(lineBorder);
        rx += colW_grade;

        // 9. Result Badge
        const resCandidate = String(stu.result || stu.resultStatus || stu.aggregateMarks?.result || '').toUpperCase();
        const isAbs = stu.isEntirelyAbsent || resCandidate === 'AB';
        const isPass =
          stu.isPass !== undefined
            ? stu.isPass
            : resCandidate === 'PASS'
            ? true
            : resCandidate === 'FAIL'
            ? false
            : numPct >= 35;
        const resText = isAbs ? 'AB' : isPass ? 'PASS' : 'FAIL';
        const resColor = isAbs ? '#b45309' : isPass ? '#15803d' : '#b91c1c';

        selectFont(doc, true);
        doc.fontSize(7).fillColor(resColor).text(resText, rx, currentY + 4.5, {
          width: colW_res,
          align: 'center',
        });

        currentY += rowHeight;
      });

      // ----------------------------------------------------------------------
      // Class Performance Summary Section
      // ----------------------------------------------------------------------
      currentY += 10;
      const statsBlockHeight = 78;

      // Ensure space for summary and signatures
      if (currentY + statsBlockHeight + 50 > bottomPageLimit) {
        doc.addPage();
        currentY = margin + 10;
      }

      // Compute or retrieve exact statistics
      const stats = examRecord.statistics || {};
      const totalEnrolled = stats.totalStudents || students.length;
      const appearedCount = stats.appearedCount !== undefined ? stats.appearedCount : students.filter((s) => !s.isEntirelyAbsent && s.resultStatus !== 'AB').length;
      const absentCount = totalEnrolled - appearedCount;
      const passedCount = stats.passedCount !== undefined ? stats.passedCount : students.filter((s) => s.isPass || s.resultStatus === 'PASS').length;
      const failedCount = stats.failedCount !== undefined ? stats.failedCount : (appearedCount - passedCount);
      const passRate = stats.passPercentage !== undefined ? stats.passPercentage : (appearedCount > 0 ? Math.round((passedCount / appearedCount) * 1000) / 10 : 0);

      const validFinals = students
        .map((s) => {
          const t = s.grandTotal ?? s.totalFinal ?? s.totalMarks ?? s.totalRaw ?? s.aggregateMarks?.totalScore;
          return Number(t);
        })
        .filter((n) => !isNaN(n) && n > 0);

      const classAverage =
        stats.classAverage !== undefined
          ? stats.classAverage
          : validFinals.length > 0
          ? Math.round((validFinals.reduce((a, b) => a + b, 0) / validFinals.length) * 10) / 10
          : 0;

      const highestMarks =
        stats.highestMarks !== undefined
          ? stats.highestMarks
          : stats.highestScore !== undefined
          ? stats.highestScore
          : validFinals.length > 0
          ? Math.max(...validFinals)
          : 0;

      const lowestMarks =
        stats.lowestMarks !== undefined
          ? stats.lowestMarks
          : stats.lowestScore !== undefined
          ? stats.lowestScore
          : validFinals.length > 0
          ? Math.min(...validFinals)
          : 0;

      let passRateStr =
        stats.passPercentage !== undefined
          ? String(stats.passPercentage)
          : appearedCount > 0
          ? `${(Math.round((passedCount / appearedCount) * 1000) / 10).toFixed(1)}%`
          : '0.0%';
      if (!passRateStr.endsWith('%')) passRateStr = `${passRateStr}%`;

      const avgStr = typeof classAverage === 'number' ? classAverage.toFixed(1) : String(classAverage);

      // Draw Summary Header Banner
      doc.rect(tableLeft, currentY, contentWidth, 16).fill(navyPrimary);
      selectFont(doc, true);
      doc.fontSize(7.5).fillColor(white).text('OFFICIAL CLASS PERFORMANCE SUMMARY & TABULATION AUDIT', tableLeft, currentY + 4.5, {
        width: contentWidth,
        align: 'center',
      });
      currentY += 16;

      // Summary 9-column grid
      const sumCols = [
        { label: 'TOTAL ENROLLED', val: String(totalEnrolled) },
        { label: 'APPEARED', val: String(appearedCount) },
        { label: 'ABSENT', val: String(absentCount) },
        { label: 'PASSED', val: String(passedCount) },
        { label: 'FAILED', val: String(failedCount) },
        { label: 'PASS RATE', val: passRateStr },
        { label: 'CLASS AVERAGE', val: avgStr },
        { label: 'HIGHEST MARKS', val: String(highestMarks) },
        { label: 'LOWEST MARKS', val: String(lowestMarks) },
      ];

      const sumColW = contentWidth / sumCols.length;
      const sumRowH = 26;

      doc.rect(tableLeft, currentY, contentWidth, sumRowH).fillAndStroke('#eff6ff', lineBorder);

      sumCols.forEach((sc, i) => {
        const sx = tableLeft + i * sumColW;
        doc.rect(sx, currentY, sumColW, sumRowH).stroke(lineBorder);

        selectFont(doc, true);
        doc.fontSize(6).fillColor('#64748b').text(sc.label, sx + 2, currentY + 4, {
          width: sumColW - 4,
          align: 'center',
        });

        selectFont(doc, true);
        doc.fontSize(9).fillColor(navyPrimary).text(sc.val, sx + 2, currentY + 13, {
          width: sumColW - 4,
          align: 'center',
        });
      });

      currentY += sumRowH + 18;

      // ----------------------------------------------------------------------
      // Signatures Section (3 Columns)
      // ----------------------------------------------------------------------
      if (currentY + 50 > bottomPageLimit) {
        doc.addPage();
        currentY = margin + 15;
      }

      const sigWidth = contentWidth / 3;
      const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Sig 1: Subject Teacher
      selectFont(doc, false);
      doc.moveTo(tableLeft + 15, currentY + 25).lineTo(tableLeft + sigWidth - 15, currentY + 25).lineWidth(0.6).stroke(navyDark);
      selectFont(doc, true, teacherName);
      doc.fontSize(7.5).fillColor(navyDark).text(`Signature of Subject Teacher`, tableLeft + 15, currentY + 28);
      selectFont(doc, false);
      doc.fontSize(6.8).fillColor('#64748b').text(`Name: ${teacherName} • Date: ${todayStr}`, tableLeft + 15, currentY + 38);

      // Sig 2: Class Teacher
      const sig2X = tableLeft + sigWidth;
      doc.moveTo(sig2X + 15, currentY + 25).lineTo(sig2X + sigWidth - 15, currentY + 25).lineWidth(0.6).stroke(navyDark);
      selectFont(doc, true);
      doc.fontSize(7.5).fillColor(navyDark).text(`Signature of Class Teacher`, sig2X + 15, currentY + 28);
      selectFont(doc, false);
      doc.fontSize(6.8).fillColor('#64748b').text(`Class: ${className} (${section}) • Date: ....................`, sig2X + 15, currentY + 38);

      // Sig 3: Headmaster / Principal
      const sig3X = tableLeft + sigWidth * 2;
      doc.moveTo(sig3X + 15, currentY + 25).lineTo(sig3X + sigWidth - 15, currentY + 25).lineWidth(0.6).stroke(navyDark);
      selectFont(doc, true);
      doc.fontSize(7.5).fillColor(navyDark).text(`Headmaster / Principal Seal & Signature`, sig3X + 15, currentY + 28);
      selectFont(doc, false);
      doc.fontSize(6.8).fillColor('#64748b').text(`Institution: ${schoolName} • Date: ....................`, sig3X + 15, currentY + 38, {
        width: sigWidth - 25,
        ellipsis: true,
      });

      // ----------------------------------------------------------------------
      // Footers Across All Buffered Pages (Guarantees zero duplicate pages)
      // ----------------------------------------------------------------------
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        // CRITICAL: Disable bottom margin so PDFKit NEVER adds auto-page break
        doc.page.margins.bottom = 0;

        const footerY = pageHeight - 18;

        // Thin divider
        doc.moveTo(margin, footerY - 4).lineTo(pageWidth - margin, footerY - 4).lineWidth(0.4).stroke(lineBorder);

        selectFont(doc, false);
        doc.fontSize(6.5).fillColor('#94a3b8');

        // Left
        doc.text(
          `Generated on ${todayStr} • AI Teacher Documentation Management Portal`,
          margin,
          footerY,
          { width: 300, align: 'left', lineBreak: false }
        );

        // Center
        doc.text(
          'CONFIDENTIAL • OFFICIAL SCHOOL BOARD MARKS TABULATION REGISTER',
          margin + 200,
          footerY,
          { width: contentWidth - 400, align: 'center', lineBreak: false }
        );

        // Right
        selectFont(doc, true);
        doc.fontSize(7).fillColor(navyPrimary).text(
          `Page ${i + 1} of ${totalPages}`,
          pageWidth - margin - 100,
          footerY,
          { width: 100, align: 'right', lineBreak: false }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
