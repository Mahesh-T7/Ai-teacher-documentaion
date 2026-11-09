import express from 'express';
import {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getAssessmentSummary,
} from '../controllers/assessmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/summary/overview', getAssessmentSummary);

router.route('/')
  .post(createAssessment)
  .get(getAssessments);

router.route('/:id')
  .get(getAssessmentById)
  .put(updateAssessment)
  .delete(deleteAssessment);

export default router;
