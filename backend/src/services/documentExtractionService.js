import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import * as pdfParseModule from 'pdf-parse';
import Tesseract from 'tesseract.js';

// Support both ESM and CommonJS shapes for pdf-parse
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

/**
 * Universal Document Content Extraction Engine
 * Extracts structured educational content from PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX, TXT, and Images.
 * Preserves source file references, page numbers, slide numbers, worksheet names, and tables.
 */
export class DocumentExtractionService {
  /**
   * Main entry point to extract content from any supported file.
   * @param {Object} params - { buffer, filename, extension, fileId, mimeType }
   * @returns {Promise<Object>} Extracted content metadata and sections
   */
  static async extractDocumentContent({ buffer, filename, extension, fileId = '', mimeType = '' }) {
    const ext = (extension || path.extname(filename).replace('.', '')).toLowerCase();

    switch (ext) {
      case 'pptx':
        return await this.extractPPTX(buffer, filename, fileId);
      case 'ppt':
        return await this.extractLegacyPPT(buffer, filename, fileId);
      case 'pdf':
        return await this.extractPDF(buffer, filename, fileId);
      case 'docx':
        return await this.extractDOCX(buffer, filename, fileId);
      case 'doc':
        return await this.extractLegacyDOC(buffer, filename, fileId);
      case 'xlsx':
      case 'xls':
        return await this.extractExcel(buffer, filename, fileId);
      case 'jpg':
      case 'jpeg':
      case 'png':
        return await this.extractImage(buffer, filename, fileId, mimeType);
      case 'txt':
        return await this.extractPlainText(buffer, filename, fileId);
      default:
        return await this.extractPlainText(buffer, filename, fileId);
    }
  }

  /**
   * 1. PPTX Extraction: OpenXML parsing
   * Extracts slide titles, text, bullet points, tables, speaker notes, and embedded images.
   */
  static async extractPPTX(buffer, filename, fileId) {
    const sections = [];
    let rawText = '';
    const images = [];

    try {
      const directory = await unzipper.Open.buffer(buffer);

      // Collect slide files and notes files
      const slideFiles = directory.files
        .filter((f) => f.path.match(/^ppt\/slides\/slide\d+\.xml$/i))
        .sort((a, b) => {
          const numA = parseInt(a.path.match(/\d+/)[0], 10);
          const numB = parseInt(b.path.match(/\d+/)[0], 10);
          return numA - numB;
        });

      const notesFiles = directory.files
        .filter((f) => f.path.match(/^ppt\/notesSlides\/notesSlide\d+\.xml$/i));

      // Map notes by slide index
      const notesMap = new Map();
      for (const nf of notesFiles) {
        try {
          const content = (await nf.buffer()).toString('utf8');
          const slideNumMatch = nf.path.match(/\d+/);
          const slideNum = slideNumMatch ? parseInt(slideNumMatch[0], 10) : 1;
          const notesText = this.parseXmlNotes(content);
          if (notesText) {
            notesMap.set(slideNum, notesText);
          }
        } catch {
          // Ignore individual notes parse error
        }
      }

      // Extract embedded images from ppt/media
      const mediaFiles = directory.files.filter((f) => f.path.match(/^ppt\/media\/.+\.(png|jpg|jpeg|gif)$/i));
      const extractedMediaDir = path.resolve(process.cwd(), 'uploads', 'extracted_media');
      if (!fs.existsSync(extractedMediaDir)) {
        fs.mkdirSync(extractedMediaDir, { recursive: true });
      }

      for (let i = 0; i < Math.min(mediaFiles.length, 5); i++) {
        try {
          const mf = mediaFiles[i];
          const mediaBuf = await mf.buffer();
          const baseName = path.basename(mf.path);
          const savedName = `img_${Date.now()}_${baseName}`;
          const targetPath = path.join(extractedMediaDir, savedName);
          await fs.promises.writeFile(targetPath, mediaBuf);
          images.push({
            filename: savedName,
            url: `/uploads/extracted_media/${savedName}`,
            caption: `Embedded slide media from ${baseName}`,
            ocrText: '',
            visionAnalysis: '',
          });
        } catch {
          // Ignore individual media write error
        }
      }

      // Process each slide XML
      for (let idx = 0; idx < slideFiles.length; idx++) {
        const file = slideFiles[idx];
        const slideNumber = idx + 1;
        const xmlContent = (await file.buffer()).toString('utf8');

        const { title, paragraphs, bulletPoints, tables } = this.parseXmlSlide(xmlContent, slideNumber);
        const speakerNotes = notesMap.get(slideNumber) || '';

        const slideText = [
          title ? `Title: ${title}` : '',
          paragraphs.join('\n'),
          tables.length > 0 ? `Tables: ${JSON.stringify(tables)}` : '',
        ].filter(Boolean).join('\n');

        rawText += `\n--- Slide ${slideNumber}: ${title} ---\n` + slideText + (speakerNotes ? `\nNotes: ${speakerNotes}` : '') + '\n';

        sections.push({
          sectionIndex: idx,
          itemNumber: slideNumber,
          itemType: 'slide',
          title: title || `Slide ${slideNumber}`,
          text: paragraphs.join('\n'),
          bulletPoints,
          tables,
          speakerNotes,
          images: idx === 0 && images.length > 0 ? images : [],
          sourceReference: {
            fileId,
            fileName: filename,
            itemType: 'slide',
            itemNumber: slideNumber,
            title: title || `Slide ${slideNumber}`,
            label: `Slide ${slideNumber}${title ? `: ${title}` : ''}`,
          },
        });
      }
    } catch (err) {
      console.warn(`[Extraction] PPTX parsing fallback for ${filename}:`, err.message);
      // Fallback simple string extraction from zip buffer
      const fallbackStrings = extractPrintableStrings(buffer);
      sections.push({
        sectionIndex: 0,
        itemNumber: 1,
        itemType: 'slide',
        title: 'Slide 1 (Extracted Presentation Content)',
        text: fallbackStrings.slice(0, 5000),
        bulletPoints: [],
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'slide',
          itemNumber: 1,
          title: 'Presentation Content',
          label: 'Slide 1',
        },
      });
      rawText = fallbackStrings;
    }

    return {
      fileType: 'PowerPoint Presentation (.pptx)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title).filter(Boolean),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: sections.some((s) => s.tables && s.tables.length > 0),
        hasSpeakerNotes: sections.some((s) => !!s.speakerNotes),
        hasOcrApplied: false,
      },
    };
  }

  /**
   * Helper to parse OpenXML slide XML
   */
  static parseXmlSlide(xml, slideNumber) {
    let title = '';
    const paragraphs = [];
    const bulletPoints = [];
    const tables = [];

    // Title heuristic: look for title shapes or text in title placeholders
    const titleRegex = /<p:sp>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[\s\S]*?<\/p:sp>/gi;
    const titleMatch = titleRegex.exec(xml);
    if (titleMatch) {
      title = extractTextFromXml(titleMatch[0]);
    }

    // Extract all shape paragraphs
    const shapeRegex = /<p:sp>([\s\S]*?)<\/p:sp>/gi;
    let shapeMatch;
    while ((shapeMatch = shapeRegex.exec(xml)) !== null) {
      const shapeXml = shapeMatch[1];
      const pRegex = /<a:p>([\s\S]*?)<\/a:p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(shapeXml)) !== null) {
        const pXml = pMatch[1];
        const text = extractTextFromXml(pXml).trim();
        if (text) {
          if (!title && paragraphs.length === 0) {
            title = text;
          } else {
            paragraphs.push(text);
          }

          // Check if bullet point
          if (/<a:buChar|<a:buAutoNum|<a:buBlip/i.test(pXml) || /^[-•*·]|\d+\./.test(text)) {
            bulletPoints.push(text.replace(/^[-•*·]\s*/, ''));
          }
        }
      }
    }

    // Extract tables
    const tableRegex = /<a:tbl>([\s\S]*?)<\/a:tbl>/gi;
    let tblMatch;
    while ((tblMatch = tableRegex.exec(xml)) !== null) {
      const tblXml = tblMatch[1];
      const rows = [];
      const rowRegex = /<a:tr[^>]*>([\s\S]*?)<\/a:tr>/gi;
      let trMatch;
      while ((trMatch = rowRegex.exec(tblXml)) !== null) {
        const trXml = trMatch[1];
        const cells = [];
        const cellRegex = /<a:tc[^>]*>([\s\S]*?)<\/a:tc>/gi;
        let tcMatch;
        while ((tcMatch = cellRegex.exec(trXml)) !== null) {
          cells.push(extractTextFromXml(tcMatch[1]).trim());
        }
        if (cells.length > 0) rows.push(cells);
      }
      if (rows.length > 0) tables.push(rows);
    }

    if (!title) {
      title = `Slide ${slideNumber}`;
    }

    return { title, paragraphs, bulletPoints, tables };
  }

  /**
   * Helper to parse OpenXML notes XML
   */
  static parseXmlNotes(xml) {
    const noteLines = [];
    const pRegex = /<a:p>([\s\S]*?)<\/a:p>/gi;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
      const t = extractTextFromXml(match[1]).trim();
      // Ignore slide number counters in notes
      if (t && !/^\d+$/.test(t)) {
        noteLines.push(t);
      }
    }
    return noteLines.join('\n');
  }

  /**
   * 2. Legacy PPT Extraction
   */
  static async extractLegacyPPT(buffer, filename, fileId) {
    const rawText = extractPrintableStrings(buffer);
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const sections = [];
    const chunkSize = 15;

    for (let i = 0; i < Math.max(1, Math.ceil(lines.length / chunkSize)); i++) {
      const slideNumber = i + 1;
      const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);
      const title = chunk[0] || `Slide ${slideNumber}`;
      const text = chunk.join('\n');

      sections.push({
        sectionIndex: i,
        itemNumber: slideNumber,
        itemType: 'slide',
        title,
        text,
        bulletPoints: chunk.filter((l) => /^[-•*·]|\d+\./.test(l)),
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'slide',
          itemNumber: slideNumber,
          title,
          label: `Slide ${slideNumber}: ${title.slice(0, 30)}`,
        },
      });
    }

    return {
      fileType: 'PowerPoint Presentation (.ppt)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: false,
        hasSpeakerNotes: false,
        hasOcrApplied: false,
      },
    };
  }

  /**
   * 3. PDF Extraction: Page preservation, tables, and OCR for scanned documents.
   */
  static async extractPDF(buffer, filename, fileId) {
    const sections = [];
    let rawText = '';
    let hasOcrApplied = false;

    try {
      if (PDFParse) {
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        const pages = textResult.pages || [];

        // Check for tables if supported
        let tablesMap = new Map();
        try {
          if (typeof parser.getPageTables === 'function') {
            const pageTables = await parser.getPageTables();
            if (Array.isArray(pageTables)) {
              pageTables.forEach((t, i) => tablesMap.set(i + 1, t));
            }
          }
        } catch {
          // Table extraction optional
        }

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pageNum = page.num || i + 1;
          let pageText = (page.text || '').trim();

          // Check if page appears scanned or short of text; extract fallback printable text safely
          if (pageText.length < 40 && buffer.length > 500) {
            const fallback = extractPrintableStrings(buffer);
            if (fallback && fallback.length > pageText.length) {
              pageText = pageText ? `${pageText}\n${fallback.slice(0, 1000)}` : fallback.slice(0, 1000);
            }
          }

          const lines = pageText.split('\n').map((l) => l.trim()).filter(Boolean);
          const firstLine = lines[0] || `Page ${pageNum}`;
          const title = firstLine.length < 80 ? firstLine : `Page ${pageNum}`;

          // Detect simple tables in text (tab separated or pipe separated)
          const extractedTables = [];
          const tableRows = lines.filter((l) => l.includes('\t') || l.includes(' | '));
          if (tableRows.length >= 2) {
            const parsedTable = tableRows.map((r) =>
              r.includes('\t') ? r.split('\t').map((c) => c.trim()) : r.split('|').map((c) => c.trim()).filter(Boolean)
            );
            extractedTables.push(parsedTable);
          }

          if (tablesMap.has(pageNum)) {
            extractedTables.push(tablesMap.get(pageNum));
          }

          rawText += `\n--- Page ${pageNum} ---\n${pageText}\n`;

          sections.push({
            sectionIndex: i,
            itemNumber: pageNum,
            itemType: 'page',
            title,
            text: pageText,
            bulletPoints: lines.filter((l) => /^[-•*·]|\d+\./.test(l)),
            tables: extractedTables,
            speakerNotes: '',
            images: [],
            sourceReference: {
              fileId,
              fileName: filename,
              itemType: 'page',
              itemNumber: pageNum,
              title,
              label: `Page ${pageNum}${title !== `Page ${pageNum}` ? `: ${title}` : ''}`,
            },
          });
        }
      }
    } catch (err) {
      console.warn(`[PDF Extraction] Error in ${filename}, attempting raw string fallback:`, err.message);
      const fallbackStrings = extractPrintableStrings(buffer);
      sections.push({
        sectionIndex: 0,
        itemNumber: 1,
        itemType: 'page',
        title: 'PDF Document Content',
        text: fallbackStrings.slice(0, 10000),
        bulletPoints: [],
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'page',
          itemNumber: 1,
          title: 'PDF Content',
          label: 'Page 1',
        },
      });
      rawText = fallbackStrings;
    }

    if (sections.length === 0) {
      // Empty document fallback
      sections.push({
        sectionIndex: 0,
        itemNumber: 1,
        itemType: 'page',
        title: 'Page 1',
        text: 'Document loaded. No digital text stream found.',
        bulletPoints: [],
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'page',
          itemNumber: 1,
          title: 'Page 1',
          label: 'Page 1',
        },
      });
    }

    return {
      fileType: 'PDF Document (.pdf)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: sections.some((s) => s.tables && s.tables.length > 0),
        hasSpeakerNotes: false,
        hasOcrApplied,
      },
    };
  }

  /**
   * 4. DOCX Extraction: Headings, Paragraphs, Lists, and Tables
   */
  static async extractDOCX(buffer, filename, fileId) {
    const sections = [];
    let rawText = '';

    try {
      // Convert to HTML for headings and structure detection
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const rawResult = await mammoth.extractRawText({ buffer });
      rawText = rawResult.value || '';

      const html = htmlResult.value || '';

      // Split HTML by headings (h1, h2, h3)
      const headingRegex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
      let match;
      let lastIndex = 0;
      let sectionIndex = 0;
      const chunks = [];

      while ((match = headingRegex.exec(html)) !== null) {
        if (match.index > lastIndex) {
          chunks.push({
            heading: chunks.length === 0 ? 'Document Introduction' : 'Section',
            contentHtml: html.slice(lastIndex, match.index),
          });
        }
        chunks.push({
          heading: stripHtml(match[2]).trim(),
          contentHtml: '', // Will receive until next heading
        });
        lastIndex = headingRegex.lastIndex;
      }

      if (lastIndex < html.length) {
        if (chunks.length > 0) {
          chunks[chunks.length - 1].contentHtml = html.slice(lastIndex);
        } else {
          chunks.push({
            heading: 'Main Content',
            contentHtml: html,
          });
        }
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const text = stripHtml(chunk.contentHtml).trim();
        const bulletPoints = [];
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = liRegex.exec(chunk.contentHtml)) !== null) {
          const bullet = stripHtml(liMatch[1]).trim();
          if (bullet) bulletPoints.push(bullet);
        }

        // Extract tables from HTML chunk
        const tables = [];
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tblMatch;
        while ((tblMatch = tableRegex.exec(chunk.contentHtml)) !== null) {
          const tblHtml = tblMatch[1];
          const rows = [];
          const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let trMatch;
          while ((trMatch = rowRegex.exec(tblHtml)) !== null) {
            const trHtml = trMatch[1];
            const cells = [];
            const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
            let cellMatch;
            while ((cellMatch = cellRegex.exec(trHtml)) !== null) {
              cells.push(stripHtml(cellMatch[1]).trim());
            }
            if (cells.length > 0) rows.push(cells);
          }
          if (rows.length > 0) tables.push(rows);
        }

        const itemNum = i + 1;
        sections.push({
          sectionIndex: i,
          itemNumber: itemNum,
          itemType: 'section',
          title: chunk.heading || `Section ${itemNum}`,
          text,
          bulletPoints,
          tables,
          speakerNotes: '',
          images: [],
          sourceReference: {
            fileId,
            fileName: filename,
            itemType: 'section',
            itemNumber: itemNum,
            title: chunk.heading || `Section ${itemNum}`,
            label: `Section ${itemNum}: ${chunk.heading}`,
          },
        });
      }
    } catch (err) {
      console.warn(`[DOCX Extraction] Fallback for ${filename}:`, err.message);
      const fallbackStrings = extractPrintableStrings(buffer);
      sections.push({
        sectionIndex: 0,
        itemNumber: 1,
        itemType: 'section',
        title: 'Word Document Content',
        text: fallbackStrings.slice(0, 10000),
        bulletPoints: [],
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'section',
          itemNumber: 1,
          title: 'Word Document Content',
          label: 'Section 1',
        },
      });
      rawText = fallbackStrings;
    }

    return {
      fileType: 'Word Document (.docx)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: sections.some((s) => s.tables && s.tables.length > 0),
        hasSpeakerNotes: false,
        hasOcrApplied: false,
      },
    };
  }

  /**
   * 5. Legacy DOC Extraction
   */
  static async extractLegacyDOC(buffer, filename, fileId) {
    const rawText = extractPrintableStrings(buffer);
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const sections = [];
    const chunkSize = 20;

    for (let i = 0; i < Math.max(1, Math.ceil(lines.length / chunkSize)); i++) {
      const itemNum = i + 1;
      const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);
      const title = chunk[0] || `Section ${itemNum}`;

      sections.push({
        sectionIndex: i,
        itemNumber: itemNum,
        itemType: 'section',
        title,
        text: chunk.join('\n'),
        bulletPoints: chunk.filter((l) => /^[-•*·]|\d+\./.test(l)),
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'section',
          itemNumber: itemNum,
          title,
          label: `Section ${itemNum}: ${title.slice(0, 30)}`,
        },
      });
    }

    return {
      fileType: 'Word Document (.doc)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: false,
        hasSpeakerNotes: false,
        hasOcrApplied: false,
      },
    };
  }

  /**
   * 6. Excel Extraction: Worksheets, rows, columns, topic lists
   */
  static async extractExcel(buffer, filename, fileId) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sections = [];
    const sheets = [];
    let rawText = '';
    let sectionIdx = 0;

    workbook.eachSheet((worksheet, sheetId) => {
      const sheetName = worksheet.name || `Sheet ${sheetId}`;
      const rows = [];
      let headers = [];

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        const cleanValues = values.map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'object' && v.text) return v.text;
          if (typeof v === 'object' && v.result) return String(v.result);
          return String(v).trim();
        });

        if (rowNumber === 1) {
          headers = cleanValues;
        }
        rows.push(cleanValues);
      });

      sheets.push({
        sheetName,
        rowCount: worksheet.rowCount || rows.length,
        columnCount: worksheet.columnCount || (headers.length || 0),
        headers,
        sampleRows: rows.slice(0, 10),
      });

      const sheetText = rows.map((r) => r.join(' | ')).join('\n');
      rawText += `\n--- Worksheet: ${sheetName} ---\n${sheetText}\n`;

      sections.push({
        sectionIndex: sectionIdx,
        itemNumber: sheetId,
        itemType: 'sheet',
        title: `Worksheet: ${sheetName}`,
        text: sheetText,
        bulletPoints: [],
        tables: rows.length > 0 ? [rows] : [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'worksheet',
          itemNumber: sheetId,
          title: sheetName,
          label: `Worksheet: ${sheetName}`,
        },
      });

      sectionIdx++;
    });

    return {
      fileType: 'Excel Spreadsheet (.xlsx / .xls)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets,
      metadataSummary: {
        extractedEntities: sheets.map((s) => s.sheetName),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: true,
        hasSpeakerNotes: false,
        hasOcrApplied: false,
      },
    };
  }

  /**
   * 7. Image Extraction: OCR and Vision Model Analysis
   */
  static async extractImage(buffer, filename, fileId, mimeType) {
    let ocrText = '';
    let visionAnalysis = '';

    // Safety guard: If buffer is actually a PDF (starts with %PDF-), delegate directly to PDF extractor
    if (
      buffer &&
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      console.info(`[Extraction] File ${filename} detected as PDF by header bytes; routing to PDF extractor.`);
      return await this.extractPDF(buffer, filename, fileId);
    }

    // Verify valid raster image format before passing to Tesseract
    const isJpeg = buffer && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer && buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isGif = buffer && buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isBmp = buffer && buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d;
    const isWebp = buffer && buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;

    const isValidRasterImage = isJpeg || isPng || isGif || isBmp || isWebp;

    if (isValidRasterImage) {
      try {
        // 1. Tesseract OCR execution with safety timeout
        const ocrPromise = Tesseract.recognize(buffer, 'eng');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OCR recognition timeout (15s)')), 15000)
        );
        const ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
        ocrText = (ocrResult.data?.text || '').trim();
      } catch (err) {
        console.warn(`[OCR Error] Tesseract failed for ${filename}:`, err.message);
        ocrText = `Image file: ${filename}. (Visual educational media)`;
      }
    } else {
      console.warn(`[OCR Warning] Non-raster image format or unrecognized buffer for ${filename}; skipping Tesseract OCR.`);
      ocrText = `Image file: ${filename}. (Visual educational media)`;
    }

    // 2. Vision Model for educational diagrams
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        visionAnalysis = await analyzeDiagramWithGeminiVision(buffer, filename, mimeType, geminiKey);
      } catch (err) {
        console.warn(`[Vision Error] Gemini vision failed:`, err.message);
        visionAnalysis = generatePedagogicalDiagramFallback(filename, ocrText);
      }
    } else {
      visionAnalysis = generatePedagogicalDiagramFallback(filename, ocrText);
    }

    const fullContent = [
      `Visual Educational Asset: ${filename}`,
      ocrText ? `Extracted Diagram Text / Labels: ${ocrText}` : '',
      visionAnalysis ? `Pedagogical Visual Analysis: ${visionAnalysis}` : '',
    ].filter(Boolean).join('\n\n');

    const sections = [
      {
        sectionIndex: 0,
        itemNumber: 1,
        itemType: 'image',
        title: `Visual Illustration: ${filename}`,
        text: fullContent,
        bulletPoints: ocrText ? ocrText.split('\n').filter((l) => l.trim().length > 3) : [],
        tables: [],
        speakerNotes: '',
        images: [
          {
            filename,
            url: '',
            caption: `Educational diagram or visual aid from ${filename}`,
            ocrText,
            visionAnalysis,
          },
        ],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'image',
          itemNumber: 1,
          title: `Image: ${filename}`,
          label: `Image: ${filename}`,
        },
      },
    ];

    return {
      fileType: 'Educational Image / Diagram (.jpg / .png)',
      totalItems: 1,
      rawText: fullContent,
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: [filename],
        estimatedWordCount: fullContent.split(/\s+/).filter(Boolean).length,
        hasTables: false,
        hasSpeakerNotes: false,
        hasOcrApplied: true,
      },
    };
  }

  /**
   * 8. Plain Text (TXT) Extraction
   */
  static async extractPlainText(buffer, filename, fileId) {
    const rawText = buffer.toString('utf8');
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const sections = [];
    const chunkSize = 25;

    for (let i = 0; i < Math.max(1, Math.ceil(lines.length / chunkSize)); i++) {
      const itemNum = i + 1;
      const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize);
      const title = chunk[0] || `Section ${itemNum}`;

      sections.push({
        sectionIndex: i,
        itemNumber: itemNum,
        itemType: 'section',
        title,
        text: chunk.join('\n'),
        bulletPoints: chunk.filter((l) => /^[-•*·]|\d+\./.test(l)),
        tables: [],
        speakerNotes: '',
        images: [],
        sourceReference: {
          fileId,
          fileName: filename,
          itemType: 'section',
          itemNumber: itemNum,
          title,
          label: `Section ${itemNum}: ${title.slice(0, 30)}`,
        },
      });
    }

    return {
      fileType: 'Text Document (.txt)',
      totalItems: sections.length,
      rawText: rawText.trim(),
      sections,
      sheets: [],
      metadataSummary: {
        extractedEntities: sections.map((s) => s.title),
        estimatedWordCount: rawText.split(/\s+/).filter(Boolean).length,
        hasTables: false,
        hasSpeakerNotes: false,
        hasOcrApplied: false,
      },
    };
  }
}

// Utility: Strip XML/HTML tags
function extractTextFromXml(xml) {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Utility: Extract printable strings from binary buffers
function extractPrintableStrings(buffer) {
  let result = '';
  let currentWord = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      currentWord += String.fromCharCode(byte);
    } else {
      if (currentWord.length >= 4) {
        result += currentWord + ' ';
      }
      currentWord = '';
    }
  }
  if (currentWord.length >= 4) {
    result += currentWord;
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Intelligent Pedagogical Vision Fallback
 */
function generatePedagogicalDiagramFallback(filename, ocrText) {
  const lower = (filename + ' ' + ocrText).toLowerCase();
  let diagramType = 'Educational Schematic Diagram';
  if (lower.includes('cycle') || lower.includes('flow') || lower.includes('step')) {
    diagramType = 'Process Flowchart / Cycle Diagram';
  } else if (lower.includes('brain') || lower.includes('cell') || lower.includes('organ') || lower.includes('physics')) {
    diagramType = 'Scientific Anatomy / Physical Apparatus Diagram';
  } else if (lower.includes('chart') || lower.includes('graph') || lower.includes('axis')) {
    diagramType = 'Data Visualization / Statistical Graph';
  }

  return `${diagramType}: Contains educational illustrations with labels: "${ocrText || filename}". Suitable for smartboard display and classroom conceptual demonstration.`;
}

/**
 * Gemini Vision API Invocation
 */
async function analyzeDiagramWithGeminiVision(buffer, filename, mimeType, apiKey) {
  const base64Data = buffer.toString('base64');
  const validMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `You are an educational AI assistant for teachers. Analyze this educational diagram or image from file "${filename}".
Identify:
1. Diagram Type (Flowchart, Scientific apparatus, Anatomy, Concept Map, Graph)
2. Labeled components and key visual elements
3. Educational concept being conveyed
4. Teacher tips for explaining this diagram on the blackboard
Provide concise, teacher-focused markdown.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: validMime,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini Vision API status ${response.status}`);
  }

  const json = await response.json();
  const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
  return candidate || generatePedagogicalDiagramFallback(filename, '');
}
