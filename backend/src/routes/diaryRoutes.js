import express from 'express';
import {
  createDiaryEntry,
  getDiaryEntries,
  getDiaryEntryById,
  updateDiaryEntry,
  deleteDiaryEntry,
  updateDiaryStatus,
} from '../controllers/diaryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createDiaryEntry)
  .get(getDiaryEntries);

router.route('/:id')
  .get(getDiaryEntryById)
  .put(updateDiaryEntry)
  .delete(deleteDiaryEntry);

router.route('/:id/status')
  .patch(updateDiaryStatus);

export default router;
