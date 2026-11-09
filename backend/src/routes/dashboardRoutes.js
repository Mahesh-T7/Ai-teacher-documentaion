import express from 'express';
import { getDashboardStats, seedInitialData } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected dashboard routes
router.get('/stats', protect, getDashboardStats);
router.post('/seed', protect, seedInitialData);

export default router;
