import express from 'express';
import {
  createLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  updateLessonPlan,
  deleteLessonPlan,
  updateLessonPlanApproval,
  duplicateLessonPlan,
  exportLessonPlanPdf,
  generatePreviewPdf,
} from '../controllers/lessonPlanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createLessonPlan)
  .get(getLessonPlans);

router.post('/preview-pdf', generatePreviewPdf);

router.route('/:id')
  .get(getLessonPlanById)
  .put(updateLessonPlan)
  .delete(deleteLessonPlan);

router.get('/:id/pdf', exportLessonPlanPdf);

router.route('/:id/approval')
  .patch(updateLessonPlanApproval);

router.route('/:id/duplicate')
  .post(duplicateLessonPlan);

export default router;
