import express from 'express';
import {
  uploadPhotos,
  uploadMiddleware,
  getTeacherPhotos,
  getPhotoById,
  updatePhoto,
  deletePhoto,
} from '../controllers/photoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post(
  '/upload',
  (req, res, next) => {
    uploadMiddleware.array('photos', 20)(req, res, (err) => {
      if (err) {
        console.error('[Multer Photo Upload Error]:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing uploaded photo(s). Ensure valid format and size under 25MB.',
        });
      }
      next();
    });
  },
  uploadPhotos
);

router.get('/', getTeacherPhotos);

router.route('/:id')
  .get(getPhotoById)
  .put(updatePhoto)
  .delete(deletePhoto);

export default router;
