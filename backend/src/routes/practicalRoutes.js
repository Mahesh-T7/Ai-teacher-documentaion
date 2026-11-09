import express from 'express';
import {
  createPracticalActivity,
  getPracticalActivities,
  getPracticalById,
  updatePracticalActivity,
  deletePracticalActivity,
} from '../controllers/practicalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createPracticalActivity)
  .get(getPracticalActivities);

router.route('/:id')
  .get(getPracticalById)
  .put(updatePracticalActivity)
  .delete(deletePracticalActivity);

export default router;
