import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { generatePdfReport } from './pdfGeneratorService.js';
import { generateDocxReport } from './docxGeneratorService.js';
import { generateXlsxReport } from './xlsxGeneratorService.js';

/**
 * Creates a complete ZIP package with PDF, Word, Excel and actual photographs
 */
export const generateZipPackage = async (reportData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const buffers = [];

      archive.on('data', (data) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err) => reject(err));

      const { meta, photos = [] } = reportData;
      const basePrefix = `Documentation_${meta.reportType}_${new Date(meta.startDate).toISOString().split('T')[0]}`;

      // 1. Generate and attach PDF
      try {
        const pdfBuf = await generatePdfReport(reportData);
        archive.append(pdfBuf, { name: `${basePrefix}/01_Official_Report.pdf` });
      } catch (pdfErr) {
        console.warn('[ZIP PDF error]:', pdfErr.message);
      }

      // 2. Generate and attach DOCX
      try {
        const docxBuf = await generateDocxReport(reportData);
        archive.append(docxBuf, { name: `${basePrefix}/02_Editable_Report.docx` });
      } catch (docxErr) {
        console.warn('[ZIP DOCX error]:', docxErr.message);
      }

      // 3. Generate and attach XLSX
      try {
        const xlsxBuf = await generateXlsxReport(reportData);
        archive.append(xlsxBuf, { name: `${basePrefix}/03_Data_Register.xlsx` });
      } catch (xlsxErr) {
        console.warn('[ZIP XLSX error]:', xlsxErr.message);
      }

      // 4. Attach actual classroom photographs
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      photos.forEach((p, idx) => {
        if (p.storageKey) {
          const filePath = path.resolve(uploadsDir, p.storageKey);
          if (fs.existsSync(filePath)) {
            const ext = path.extname(p.storageKey);
            const safeName = `Photo_${idx + 1}_${(p.caption || 'evidence').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25)}${ext}`;
            archive.file(filePath, { name: `${basePrefix}/Photographs/${safeName}` });
          }
        }
      });

      // Finalize ZIP
      await archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
};
