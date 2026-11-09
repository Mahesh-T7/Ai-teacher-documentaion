import express from 'express';
import {
  generateContent,
  generateDailyRecordDocumentation,
  getAIDrafts,
  getAIDraftById,
  updateAIDraft,
  approveAIDraft,
  deleteAIDraft,
  getSyllabusUnits,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateContent);
router.post('/generate-documentation', generateDailyRecordDocumentation);
router.get('/syllabus', getSyllabusUnits);

router.route('/drafts')
  .get(getAIDrafts);

router.route('/drafts/:id')
  .get(getAIDraftById)
  .put(updateAIDraft)
  .delete(deleteAIDraft);

router.post('/drafts/:id/approve', approveAIDraft);

export default router;
