import express from 'express';
import {
  previewReport,
  generateReport,
  approveReport,
  getReportHistory,
  getReportById,
  downloadReportFile,
  deleteReport,
  createSchedule,
  getSchedules,
  triggerScheduleRun,
  deleteSchedule,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Previews & Direct Generation
router.post('/preview', previewReport);
router.post('/generate', generateReport);

// Approval & Downloads
router.post('/:id/approve', approveReport);
router.get('/:id/download', downloadReportFile);

// Schedules
router.post('/schedules', createSchedule);
router.get('/schedules', getSchedules);
router.post('/schedules/:id/run', triggerScheduleRun);
router.delete('/schedules/:id', deleteSchedule);

// CRUD
router.route('/')
  .get(getReportHistory);

router.route('/:id')
  .get(getReportById)
  .delete(deleteReport);

export default router;
