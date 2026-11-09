import express from 'express';
import {
  getInspectionReadiness,
  generateInspectionPackage,
  getInspectionPackages,
  downloadInspectionPackage,
  deleteInspectionPackage,
} from '../controllers/inspectionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/readiness', getInspectionReadiness);
router.post('/package/generate', generateInspectionPackage);
router.get('/packages', getInspectionPackages);
router.get('/packages/:id/download', downloadInspectionPackage);
router.delete('/packages/:id', deleteInspectionPackage);

export default router;
