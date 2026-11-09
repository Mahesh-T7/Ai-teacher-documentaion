import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  uploadDocuments,
  getDocuments,
  getDocumentById,
  previewDocument,
  updateDocument,
  replaceDocument,
  deleteDocument,
  processDocumentJob,
  getJobStatus,
  retryJob,
  generateDocumentation,
  getMaterialById,
  updateMaterial,
  regenerateSection,
  approveMaterial,
  convertToLessonPlan,
  createDiaryDraft,
  exportMaterialWord,
  exportMaterialPdf,
} from '../controllers/documentIntelligenceController.js';
import { MAX_FILE_SIZE_BYTES } from '../utils/documentSecurity.js';

const router = express.Router();

// Configure Multer for in-memory upload buffers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 50MB limit
    files: 10, // Allow up to 10 files in a single batch
  },
});

// All document intelligence routes are protected for authenticated teachers
router.use(protect);

// 1. Document Management & Upload Centre
router.post('/upload', upload.array('files', 10), uploadDocuments);
router.get('/documents', getDocuments);
router.get('/documents/:id', getDocumentById);
router.get('/documents/:id/preview', previewDocument);
router.put('/documents/:id', updateDocument);
router.post('/documents/:id/replace', upload.single('file'), replaceDocument);
router.delete('/documents/:id', deleteDocument);

// 2. Extraction & Analysis Jobs
router.post('/jobs/process', processDocumentJob);
router.get('/jobs/:id/status', getJobStatus);
router.post('/jobs/:id/retry', retryJob);

// 3. Teaching Documentation Generation & Review Workspace
router.post('/generate', generateDocumentation);
router.get('/materials/:id', getMaterialById);
router.put('/materials/:id', updateMaterial);
router.post('/materials/:id/regenerate-section', regenerateSection);
router.post('/materials/:id/approve', approveMaterial);

// 4. Module Integrations & Conversions
router.post('/materials/:id/convert-to-lesson-plan', convertToLessonPlan);
router.post('/materials/:id/create-diary-draft', createDiaryDraft);

// 5. Word & PDF Multi-format Exports
router.get('/materials/:id/export/word', exportMaterialWord);
router.get('/materials/:id/export/pdf', exportMaterialPdf);

export default router;
