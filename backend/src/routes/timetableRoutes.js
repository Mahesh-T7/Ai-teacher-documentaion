import express from 'express';
import {
  createTimetableEntry,
  getTimetable,
  getTimetableById,
  updateTimetableEntry,
  deleteTimetableEntry,
} from '../controllers/timetableController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createTimetableEntry)
  .get(getTimetable);

router.route('/:id')
  .get(getTimetableById)
  .put(updateTimetableEntry)
  .delete(deleteTimetableEntry);

export default router;
