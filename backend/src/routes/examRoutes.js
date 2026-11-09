import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  previewCalculation,
} from '../controllers/examTemplateController.js';
import {
  getExamRecords,
  getExamRecordById,
  createExamRecord,
  updateExamRecord,
  finalizeExamRecord,
  unlockExamRecord,
  deleteExamRecord,
  exportClassRegisterPdf,
  exportClassRegisterExcel,
  exportStudentReportCardPdf,
  exportBulkReportCardsPdf,
  exportNsqfExcelFormat,
  downloadExcelFormatTemplate,
  importExcelMarks,
  uploadExcelMiddleware,
  importStudentsFromExcel,
  previewClassRegisterPdf,
} from '../controllers/examRecordController.js';

const router = express.Router();

router.use(protect);

// ----------------------------------------------------
// Examination Templates Routes
// ----------------------------------------------------
router.route('/templates')
  .get(getTemplates)
  .post(createTemplate);

router.post('/templates/preview', previewCalculation);

router.route('/templates/:id')
  .get(getTemplateById)
  .put(updateTemplate)
  .delete(deleteTemplate);

router.post('/templates/:id/duplicate', duplicateTemplate);

// ----------------------------------------------------
// Examination Records & Marks Entry Routes
// ----------------------------------------------------
router.route('/records')
  .get(getExamRecords)
  .post(createExamRecord);

router.route('/records/:id')
  .get(getExamRecordById)
  .put(updateExamRecord)
  .delete(deleteExamRecord);

router.post('/records/:id/finalize', finalizeExamRecord);
router.post('/records/:id/unlock', unlockExamRecord);

// ----------------------------------------------------
// Export & Report Card Routes
// ----------------------------------------------------
router.get('/records/:id/export/pdf', exportClassRegisterPdf);
router.post('/preview-register-pdf', previewClassRegisterPdf);
router.get('/records/:id/export/excel', exportClassRegisterExcel);
router.get('/records/:id/export/nsqf-excel', exportNsqfExcelFormat);
router.get('/records/:id/students/:studentId/report-card', exportStudentReportCardPdf);
router.get('/records/:id/export/bulk-report-cards', exportBulkReportCardsPdf);

// ----------------------------------------------------
// Excel Import & Formatted Template Routes
// ----------------------------------------------------
router.get('/template-excel', downloadExcelFormatTemplate);
router.post('/import-excel', uploadExcelMiddleware.single('file'), importExcelMarks);
router.post('/import-students-excel', uploadExcelMiddleware.single('file'), importStudentsFromExcel);

export default router;
