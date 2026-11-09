import express from 'express';
import { updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateProfileUpdate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Protected profile update route
router.put('/profile', protect, validateProfileUpdate, updateProfile);

export default router;
