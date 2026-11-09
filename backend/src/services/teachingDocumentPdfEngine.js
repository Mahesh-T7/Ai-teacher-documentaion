import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

/**
 * Teaching Document PDF Generation Engine
 * Handles standardized, professional A4 PDF generation for Lesson Plans and Daily Teaching Diaries.
 * Fully supports Kannada Unicode & English, intelligent pagination, 17-section structure, and clean tables.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontsDir = path.resolve(__dirname, '..', 'assets', 'fonts');
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
const backendUploadsDir = path.resolve(__dirname, '..', '..', 'backend', 'uploads');

/**
 * Strips HTML tags, decodes entities, and cleans whitespace
 */
export const cleanHtmlToPlainText = (html) => {
  if (!html) return '';
  return String(html)
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
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
};

/**
 * Cleans slide markers, placeholder strings, and unresolved template variables
 */
export const sanitizeDocumentText = (text) => {
  if (!text) return '';
  let cleaned = cleanHtmlToPlainText(text);
  cleaned = cleaned
    .replace(/^--\s*Slide\s*\d+\s*:\s*(.*?)\s*---$/gim, '$1')
    .replace(/--\s*Slide\s*\d+\s*:\s*(.*?)\s*---/gim, '$1')
    .replace(/^Slide\s*\d+\s*:\s*/gim, '')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\s*insert\s+[^\]]+\]/gi, '')
    .trim();
  return cleaned;
};

/**
 * Resolves physical file path for uploaded photos
 */
export const resolveImagePath = (photo) => {
  if (!photo) return null;
  const rawKey = typeof photo === 'string' ? photo : (photo.storageKey || photo.url || photo.path || photo.filename || '');
  const original = typeof photo === 'object' ? (photo.originalFileName || photo.originalname || '') : '';

  const candidates = [
    rawKey,
    rawKey.replace(/^\/uploads\//, ''),
    rawKey.replace(/^\//, ''),
    original,
  ].filter(Boolean);

  const searchDirs = [backendUploadsDir, uploadsDir, process.cwd()];

  for (const dir of searchDirs) {
    for (const c of candidates) {
      const full = path.resolve(dir, c);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
      const base = path.resolve(dir, path.basename(c));
      if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
    }
  }

  // Fallback: search directory for similar filename prefix (e.g. timestamp or date match)
  const probe = original || rawKey;
  if (probe) {
    const probeClean = probe.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const probePrefix = probeClean.slice(0, 18);
    for (const dir of [backendUploadsDir, uploadsDir]) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const match = files.find((f) => {
            const fClean = f.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            return fClean.startsWith(probePrefix) || fClean.includes(probePrefix);
          });
          if (match) return path.resolve(dir, match);
        }
      } catch (_) {}
    }
  }

  return null;
};

/**
 * Registers embedded TrueType fonts with Unicode & Indic (Kannada) support
 */
export const registerFonts = (doc) => {
  const notoReg = path.join(fontsDir, 'NotoSans-Regular.ttf');
  const notoBold = path.join(fontsDir, 'NotoSans-Bold.ttf');
  const anekFont = path.join(fontsDir, 'AnekKannada.ttf');

  if (fs.existsSync(notoReg)) doc.registerFont('Noto', notoReg);
  if (fs.existsSync(notoBold)) doc.registerFont('Noto-Bold', notoBold);
  if (fs.existsSync(anekFont)) {
    doc.registerFont('Kannada', anekFont);
    doc.registerFont('Kannada-Bold', anekFont);
  }
};

/**
 * Selects font based on language/Unicode presence
 */
export const selectFont = (doc, isBold = false, text = '') => {
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
};

/**
 * Core PDF Builder Class
 */
export class TeachingDiaryPdfBuilder {
  constructor(options = {}) {
    this.options = options;
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 45, // 16mm margins (~45pt)
      bufferPages: true,
      autoFirstPage: true,
    });

    registerFonts(this.doc);

    this.pageWidth = this.doc.page.width; // 595.28
    this.pageHeight = this.doc.page.height; // 841.89
    this.leftMargin = 45;
    this.rightMargin = 45;
    this.contentWidth = this.pageWidth - (this.leftMargin + this.rightMargin); // 505.28
    this.bottomMarginLimit = this.pageHeight - 52; // Keep at least 52pt clear from bottom

    // Color Palette
    this.colors = {
      primary: '#1e3a8a', // Deep Navy Blue
      secondary: '#0284c7', // Academic Cyan / Blue
      textDark: '#0f172a', // Jet Slate / Black
      textMuted: '#475569', // Slate Muted
      border: '#cbd5e1', // Light Slate Border
      tableHeaderBg: '#f1f5f9', // Table Header Fill
      cardBg: '#f8fafc', // Card Subtle Fill
      white: '#ffffff',
    };

    this.schoolName = (options.schoolName || 'Government / Model Secondary School').toUpperCase();
    this.teacherName = options.teacherName || 'Subject Teacher';
    this.documentTitle = options.documentTitle || 'DAILY CLASSROOM TEACHING DIARY';
    this.academicYear = options.academicYear || '2026-2027';
  }

  getDoc() {
    return this.doc;
  }

  ensureSpace(requiredHeight) {
    if (this.doc.y + requiredHeight > this.bottomMarginLimit) {
      this.doc.addPage();
      this.renderRunningHeader();
    }
  }

  renderRunningHeader() {
    // Only on page 2 and onwards
    const headerY = 24;
    this.doc.rect(this.leftMargin, headerY + 16, this.contentWidth, 0.6).fill(this.colors.border);

    selectFont(this.doc, true, this.schoolName);
    this.doc
      .fontSize(8)
      .fillColor(this.colors.primary)
      .text(this.schoolName, this.leftMargin, headerY, {
        width: this.contentWidth / 2,
        lineBreak: false,
        ellipsis: true,
      });

    selectFont(this.doc, false);
    this.doc
      .fontSize(8)
      .fillColor(this.colors.textMuted)
      .text(
        `${this.documentTitle} • AY: ${this.academicYear}`,
        this.leftMargin + this.contentWidth / 2,
        headerY,
        {
          width: this.contentWidth / 2,
          align: 'right',
          lineBreak: false,
        }
      );

    this.doc.y = headerY + 26;
  }

  /**
   * SECTION 1: OFFICIAL SCHOOL HEADER
   */
  renderOfficialSchoolHeader(meta = {}) {
    const topBarHeight = 4;
    this.doc.rect(0, 0, this.pageWidth, topBarHeight).fill(this.colors.primary);

    const startY = 22;
    const emblemW = 46;
    const emblemH = 46;
    const metaBoxW = 120;
    const metaBoxH = 46;
    const centerW = this.contentWidth - emblemW - metaBoxW - 16;
    const centerX = this.leftMargin + emblemW + 8;
    const rightX = this.leftMargin + this.contentWidth - metaBoxW;

    // 1. Left Emblem Badge
    this.doc.roundedRect(this.leftMargin, startY, emblemW, emblemH, 5).fillAndStroke('#eff6ff', this.colors.primary);
    selectFont(this.doc, true);
    this.doc
      .fontSize(7.5)
      .fillColor(this.colors.primary)
      .text('OFFICIAL\nSCHOOL\nDIARY', this.leftMargin, startY + 9, {
        width: emblemW,
        align: 'center',
        lineGap: 1.5,
      });

    // 2. Center School Title & Subtitles
    selectFont(this.doc, true, this.schoolName);
    this.doc
      .fontSize(16)
      .fillColor(this.colors.primary)
      .text(this.schoolName, centerX, startY - 1, {
        width: centerW,
        align: 'center',
      });

    selectFont(this.doc, true, this.documentTitle);
    this.doc
      .fontSize(11)
      .fillColor(this.colors.textDark)
      .text(this.documentTitle, centerX, this.doc.y + 1, {
        width: centerW,
        align: 'center',
      });

    selectFont(this.doc, false);
    this.doc
      .fontSize(8.5)
      .fillColor(this.colors.textMuted)
      .text(`Government Recognized Academic Curriculum • Academic Year: ${this.academicYear}`, centerX, this.doc.y + 1, {
        width: centerW,
        align: 'center',
      });

    // 3. Right Metadata Box (Date & Ref)
    const dateFormatted = meta.date
      ? new Date(meta.date).toLocaleDateString('en-GB')
      : new Date().toLocaleDateString('en-GB');

    this.doc.roundedRect(rightX, startY, metaBoxW, metaBoxH, 4).fillAndStroke(this.colors.cardBg, this.colors.border);
    this.doc.fillColor(this.colors.textDark).fontSize(7.5);

    selectFont(this.doc, true);
    this.doc.text('Date:', rightX + 6, startY + 6);
    selectFont(this.doc, false);
    this.doc.text(dateFormatted, rightX + 32, startY + 6);

    selectFont(this.doc, true);
    this.doc.text('Record #:', rightX + 6, startY + 18);
    selectFont(this.doc, false);
    this.doc.text(meta.recordNumber || 'DIARY-01', rightX + 50, startY + 18);

    selectFont(this.doc, true);
    this.doc.text('Status:', rightX + 6, startY + 30);
    selectFont(this.doc, true);
    this.doc.fillColor('#15803d').text(meta.status || 'Verified & Attested', rightX + 38, startY + 30);

    this.doc.y = startY + metaBoxH + 10;
  }

  /**
   * SECTION 2 & 3: TEACHER, CLASS, SUBJECT, UNIT & TOPIC MATRIX TABLE
   */
  renderTeacherAndLessonMatrix(info = {}) {
    const tableX = this.leftMargin;
    const tableY = this.doc.y;
    const col1W = 100;
    const col2W = 152;
    const col3W = 100;
    const col4W = 153;
    const rowH = 21;
    const totalH = rowH * 4;

    this.ensureSpace(totalH + 10);

    const dateStr = info.date
      ? `${new Date(info.date).toLocaleDateString('en-GB')} (${info.dayOfWeek || 'Weekday'})`
      : new Date().toLocaleDateString('en-GB');

    const cleanTopic = sanitizeDocumentText(info.topic || info.title || 'Curriculum Instructional Session');
    const cleanUnit = sanitizeDocumentText(info.unit || info.chapter || info.unitOrChapter || 'Core Syllabus Unit');

    // Background fill & border
    this.doc.rect(tableX, tableY, this.contentWidth, totalH).fillAndStroke(this.colors.white, this.colors.border);

    // Inner horizontal divider lines
    for (let i = 1; i < 4; i++) {
      this.doc
        .moveTo(tableX, tableY + i * rowH)
        .lineTo(tableX + this.contentWidth, tableY + i * rowH)
        .strokeColor(this.colors.border)
        .lineWidth(0.5)
        .stroke();
    }

    // Inner vertical divider lines
    const colPoints = [col1W, col1W + col2W, col1W + col2W + col3W];
    colPoints.forEach((px) => {
      this.doc
        .moveTo(tableX + px, tableY)
        .lineTo(tableX + px, tableY + totalH)
        .strokeColor(this.colors.border)
        .lineWidth(0.5)
        .stroke();
    });

    // Helper for table cells
    const drawCell = (col, row, label, value, isBoldVal = false) => {
      const cx =
        col === 0
          ? tableX
          : col === 1
          ? tableX + col1W
          : col === 2
          ? tableX + col1W + col2W
          : tableX + col1W + col2W + col3W;
      const cy = tableY + row * rowH + 4;
      const w = col === 0 ? col1W : col === 1 ? col2W : col === 2 ? col3W : col4W;

      // Label column shading
      if (col === 0 || col === 2) {
        this.doc.rect(cx + 0.5, tableY + row * rowH + 0.5, w - 1, rowH - 1).fill(this.colors.tableHeaderBg);
      }

      this.doc.fillColor(col === 0 || col === 2 ? '#334155' : this.colors.textDark);
      this.doc.fontSize(8);
      selectFont(this.doc, col === 0 || col === 2 ? true : isBoldVal, label || value);

      const text = col === 0 || col === 2 ? label : value;
      this.doc.text(text || '—', cx + 6, cy, {
        width: w - 12,
        lineBreak: false,
        ellipsis: true,
      });
    };

    // Row 1: Teacher & Designation
    drawCell(0, 0, 'Teacher Name:');
    drawCell(1, 0, null, info.teacherName || this.teacherName, true);
    drawCell(2, 0, 'Designation:');
    drawCell(3, 0, null, info.teacherDesignation || info.designation || 'TGT / Subject Teacher');

    // Row 2: Class & Subject
    drawCell(0, 1, 'Class & Section:');
    drawCell(1, 1, null, `${info.className || 'Class 9'}${info.section ? ` - Sec ${info.section}` : ''}`);
    drawCell(2, 1, 'Subject:');
    drawCell(3, 1, null, info.subject || 'Core Subject', true);

    // Row 3: Date & Period
    drawCell(0, 2, 'Date & Day:');
    drawCell(1, 2, null, dateStr);
    drawCell(2, 2, 'Period & Duration:');
    drawCell(
      3,
      2,
      null,
      `Period ${info.period || 1}${info.startTime ? ` (${info.startTime} - ${info.endTime || ''})` : ''} • ${info.durationMinutes || 45}m`
    );

    // Row 4: Unit & Topic
    drawCell(0, 3, 'Unit / Chapter:');
    drawCell(1, 3, null, cleanUnit);
    drawCell(2, 3, 'Topic / Concept:');
    drawCell(3, 3, null, cleanTopic, true);

    this.doc.y = tableY + totalH + 8;
  }

  /**
   * Generic Section Header Banner
   */
  renderSectionHeading(numberAndTitle, subtitle = '') {
    this.ensureSpace(34);
    const headingY = this.doc.y;
    const bannerH = 18;

    // Header strip background with deep navy left accent
    this.doc.rect(this.leftMargin, headingY, this.contentWidth, bannerH).fill(this.colors.tableHeaderBg);
    this.doc.rect(this.leftMargin, headingY, 3.5, bannerH).fill(this.colors.primary);

    selectFont(this.doc, true, numberAndTitle);
    this.doc
      .fontSize(9.5)
      .fillColor(this.colors.primary)
      .text(numberAndTitle, this.leftMargin + 8, headingY + 4, {
        width: this.contentWidth - 16,
        lineBreak: false,
      });

    this.doc.y = headingY + bannerH + 4;
  }

  /**
   * Standard Structured Content Block
   */
  renderContentBlock(numberAndTitle, content, defaultFallback = '') {
    const cleaned = sanitizeDocumentText(content);
    if (!cleaned && !defaultFallback) return;

    const textToPrint = cleaned || defaultFallback;
    selectFont(this.doc, false, textToPrint);
    this.doc.fontSize(8.5);

    const textHeight = this.doc.heightOfString(textToPrint, {
      width: this.contentWidth - 16,
      lineGap: 2,
    });

    const blockHeight = textHeight + 12;
    this.ensureSpace(24 + Math.min(blockHeight, 100));

    this.renderSectionHeading(numberAndTitle);

    const cardY = this.doc.y;
    this.doc.rect(this.leftMargin, cardY, this.contentWidth, blockHeight).fillAndStroke(this.colors.white, this.colors.border);

    selectFont(this.doc, false, textToPrint);
    this.doc
      .fontSize(8.5)
      .fillColor(this.colors.textDark)
      .text(textToPrint, this.leftMargin + 8, cardY + 6, {
        width: this.contentWidth - 16,
        lineGap: 2,
      });

    this.doc.y = cardY + blockHeight + 6;
  }

  /**
   * SECTION 9: TEACHING-LEARNING PROCESS 4-COLUMN STRUCTURED TABLE
   */
  renderTeachingLearningProcess(stages = []) {
    const colW = {
      stage: 80,
      teacher: 195,
      student: 170,
      time: 60,
    };

    this.ensureSpace(60);
    this.renderSectionHeading(
      '9. TEACHING-LEARNING PROCESS (PEDAGOGICAL TRANSACTIONS)',
      'Sequential classroom phases & activities'
    );

    const renderTableHeader = () => {
      const topY = this.doc.y;
      this.doc.rect(this.leftMargin, topY, this.contentWidth, 18).fillAndStroke(this.colors.tableHeaderBg, this.colors.primary);

      selectFont(this.doc, true);
      this.doc.fontSize(8).fillColor(this.colors.primary);

      let curX = this.leftMargin + 6;
      this.doc.text('Stage', curX, topY + 5, { width: colW.stage - 8 });
      curX += colW.stage;
      this.doc.text('Teacher Activities & Instruction', curX, topY + 5, { width: colW.teacher - 8 });
      curX += colW.teacher;
      this.doc.text('Student Activities & Participation', curX, topY + 5, { width: colW.student - 8 });
      curX += colW.student;
      this.doc.text('Time', curX, topY + 5, { width: colW.time - 12, align: 'center' });

      this.doc.y = topY + 18;
    };

    renderTableHeader();

    stages.forEach((item, idx) => {
      const tAct = sanitizeDocumentText(item.teacherActivities || item.activity || item.description || '');
      const sAct = sanitizeDocumentText(item.studentActivities || item.studentAction || item.participation || '');

      selectFont(this.doc, false, tAct + sAct);
      this.doc.fontSize(8);

      const h1 = this.doc.heightOfString(tAct || 'Instruction conducted', { width: colW.teacher - 10, lineGap: 1.5 });
      const h2 = this.doc.heightOfString(sAct || 'Observed & participated', { width: colW.student - 10, lineGap: 1.5 });
      const rowHeight = Math.max(20, Math.max(h1, h2) + 8);

      if (this.doc.y + rowHeight > this.bottomMarginLimit) {
        this.doc.addPage();
        this.renderRunningHeader();
        renderTableHeader();
      }

      const rowY = this.doc.y;
      const rowBg = idx % 2 === 0 ? this.colors.white : this.colors.cardBg;

      this.doc.rect(this.leftMargin, rowY, this.contentWidth, rowHeight).fillAndStroke(rowBg, this.colors.border);

      // Stage
      selectFont(this.doc, true);
      this.doc.fontSize(8).fillColor(this.colors.textDark);
      this.doc.text(item.stage || `Phase ${idx + 1}`, this.leftMargin + 6, rowY + 4, {
        width: colW.stage - 10,
      });

      // Teacher Activities
      selectFont(this.doc, false, tAct);
      this.doc.text(tAct || 'Classroom instruction delivered.', this.leftMargin + colW.stage + 6, rowY + 4, {
        width: colW.teacher - 10,
        lineGap: 1.5,
      });

      // Student Activities
      selectFont(this.doc, false, sAct);
      this.doc.text(
        sAct || 'Students took notes & engaged in class.',
        this.leftMargin + colW.stage + colW.teacher + 6,
        rowY + 4,
        {
          width: colW.student - 10,
          lineGap: 1.5,
        }
      );

      // Time
      selectFont(this.doc, true);
      this.doc.text(
        item.time || item.duration || '5-10m',
        this.leftMargin + colW.stage + colW.teacher + colW.student + 4,
        rowY + 4,
        {
          width: colW.time - 8,
          align: 'center',
        }
      );

      this.doc.y = rowY + rowHeight;
    });

    this.doc.y += 6;
  }

  /**
   * SECTION 16: PHOTOGRAPHIC EVIDENCE TWO-COLUMN GRID
   */
  renderPhotographicEvidence(photos = []) {
    if (!photos || photos.length === 0) return;

    this.ensureSpace(120);
    this.renderSectionHeading(
      `16. PHOTOGRAPHIC EVIDENCE (${photos.length} Captured Snapshot${photos.length > 1 ? 's' : ''})`
    );

    const gap = 15;
    const colW = (this.contentWidth - gap) / 2; // ~245pt
    const cardH = 150;
    const imgH = 105;
    const captionH = cardH - imgH;

    let curCol = 0;
    let rowStartY = this.doc.y;

    photos.forEach((photo, idx) => {
      if (curCol === 0 && rowStartY + cardH > this.bottomMarginLimit) {
        this.doc.addPage();
        this.renderRunningHeader();
        rowStartY = this.doc.y;
      }

      const boxX = this.leftMargin + curCol * (colW + gap);
      const boxY = rowStartY;

      // Outer Photo Frame
      this.doc.rect(boxX, boxY, colW, cardH).fillAndStroke(this.colors.cardBg, this.colors.border);

      // Resolve disk image
      const imgPath = resolveImagePath(photo.storageKey || photo.url || photo.path || photo.filename);
      let imageRendered = false;

      if (imgPath && fs.existsSync(imgPath)) {
        try {
          this.doc.image(imgPath, boxX + 4, boxY + 4, {
            fit: [colW - 8, imgH - 8],
            align: 'center',
            valign: 'center',
          });
          imageRendered = true;
        } catch (imgErr) {
          console.warn('[PDF Image render warning]:', imgErr.message);
        }
      }

      if (!imageRendered) {
        selectFont(this.doc, true);
        this.doc
          .fontSize(9)
          .fillColor(this.colors.textMuted)
          .text('CLASSROOM PHOTO EVIDENCE', boxX + 10, boxY + 38, {
            width: colW - 20,
            align: 'center',
          });
        selectFont(this.doc, false);
        this.doc
          .fontSize(7.5)
          .text(photo.originalFileName || photo.caption || 'Authentic Teaching Snapshot', boxX + 10, boxY + 54, {
            width: colW - 20,
            align: 'center',
          });
      }

      // Caption Footer Strip
      const capY = boxY + imgH;
      this.doc.rect(boxX, capY, colW, captionH).fillAndStroke(this.colors.tableHeaderBg, this.colors.border);

      const photoDate = photo.date
        ? new Date(photo.date).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

      selectFont(this.doc, true);
      this.doc.fontSize(7).fillColor(this.colors.primary);
      this.doc.text(`Date: ${photoDate} | ${photo.className || ''} ${photo.section || ''}`, boxX + 6, capY + 5, {
        width: colW - 12,
        lineBreak: false,
      });

      const captionText = sanitizeDocumentText(photo.caption || 'Active classroom teaching and learning transaction');
      selectFont(this.doc, false, captionText);
      this.doc.fontSize(7).fillColor(this.colors.textDark);
      this.doc.text(captionText, boxX + 6, capY + 16, {
        width: colW - 12,
        height: 22,
        ellipsis: true,
      });

      if (curCol === 0) {
        curCol = 1;
      } else {
        curCol = 0;
        rowStartY += cardH + 10;
        this.doc.y = rowStartY;
      }
    });

    if (curCol === 1) {
      this.doc.y = rowStartY + cardH + 10;
    }
  }

  /**
   * SECTION 17: OFFICIAL ATTESTATION & SIGNATURES
   */
  renderSignatures(signInfo = {}) {
    const sigBoxH = 75;
    this.ensureSpace(sigBoxH + 15);

    const sigY = this.doc.y + 4;
    const boxW = (this.contentWidth - 20) / 2;
    const tX = this.leftMargin;
    const pX = this.leftMargin + boxW + 20;

    // Teacher Signature Box
    this.doc.rect(tX, sigY, boxW, sigBoxH).fillAndStroke(this.colors.cardBg, this.colors.border);
    this.doc.moveTo(tX + 15, sigY + 40).lineTo(tX + boxW - 15, sigY + 40).strokeColor(this.colors.textDark).lineWidth(0.6).stroke();

    selectFont(this.doc, true);
    this.doc.fontSize(8.5).fillColor(this.colors.primary).text('TEACHER SIGNATURE', tX + 15, sigY + 8);

    selectFont(this.doc, true);
    this.doc.fontSize(8).fillColor(this.colors.textDark).text(signInfo.teacherName || this.teacherName, tX + 15, sigY + 45);

    selectFont(this.doc, false);
    this.doc
      .fontSize(7.5)
      .fillColor(this.colors.textMuted)
      .text(`Designation: ${signInfo.teacherDesignation || 'TGT / Subject Teacher'}`, tX + 15, sigY + 57);

    // Headmaster / Principal Signature Box
    this.doc.rect(pX, sigY, boxW, sigBoxH).fillAndStroke(this.colors.cardBg, this.colors.border);
    this.doc.moveTo(pX + 15, sigY + 40).lineTo(pX + boxW - 15, sigY + 40).strokeColor(this.colors.textDark).lineWidth(0.6).stroke();

    selectFont(this.doc, true);
    this.doc.fontSize(8.5).fillColor(this.colors.primary).text('HEADMASTER / PRINCIPAL APPROVAL', pX + 15, sigY + 8);

    selectFont(this.doc, true);
    this.doc.fontSize(8).fillColor(this.colors.textDark).text('School Seal & Verified Signature', pX + 15, sigY + 45);

    selectFont(this.doc, false);
    this.doc.fontSize(7.5).fillColor(this.colors.textMuted).text('Official Attestation & Inspection Dossier', pX + 15, sigY + 57);

    this.doc.y = sigY + sigBoxH + 10;
  }

  /**
   * Finalizes document footers and page numbers across all buffered pages
   * Guarantees ZERO duplicate blank pages
   */
  finalizeFooters() {
    const range = this.doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);

      // Disable bottom margin so PDFKit NEVER adds auto-page break
      this.doc.page.margins.bottom = 0;

      const footerLineY = this.pageHeight - 32;

      // Divider line
      this.doc
        .moveTo(this.leftMargin, footerLineY)
        .lineTo(this.pageWidth - this.rightMargin, footerLineY)
        .strokeColor(this.colors.border)
        .lineWidth(0.5)
        .stroke();

      // Left Footer
      const footerLeftText = `${this.schoolName} • ${this.teacherName} • Official Curriculum Record`;
      selectFont(this.doc, false, footerLeftText);
      this.doc
        .fontSize(7.5)
        .fillColor(this.colors.textMuted)
        .text(
          footerLeftText,
          this.leftMargin,
          footerLineY + 5,
          {
            width: this.contentWidth - 110,
            lineBreak: false,
            ellipsis: true,
          }
        );

      // Right Footer: Page X of Y
      selectFont(this.doc, true);
      this.doc
        .fontSize(7.5)
        .fillColor(this.colors.textDark)
        .text(`Page ${i + 1} of ${range.count}`, this.pageWidth - this.rightMargin - 100, footerLineY + 5, {
          width: 100,
          align: 'right',
          lineBreak: false,
        });
    }

    this.doc.end();
  }
}
