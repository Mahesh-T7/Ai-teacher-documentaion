import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  handleExportBackup,
  handlePreviewRestore,
  handleExecuteRestore,
  handleGetBackupLogs,
} from '../controllers/backupController.js';

const router = express.Router();

router.use(protect);

router.post('/export', handleExportBackup);
router.post('/preview', handlePreviewRestore);
router.post('/restore', handleExecuteRestore);
router.get('/logs', handleGetBackupLogs);

export default router;
