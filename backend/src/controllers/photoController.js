import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { UploadedPhoto } from '../models/UploadedPhoto.js';
import { DailyTeachingEntry } from '../models/DailyTeachingEntry.js';

// Resolve uploads directory
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/x-png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ];
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.heic', '.heif'];

  if (file.mimetype?.startsWith('image/') || allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload valid image files (JPG, PNG, WebP, GIF, BMP).'), false);
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file for high-resolution classroom snapshots
    files: 20,
  },
  fileFilter,
});

/**
 * @desc Upload single or multiple classroom photos
 * @route POST /api/photos/upload
 * @access Private
 */
export const uploadPhotos = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one image file.' });
    }

    const {
      className,
      section = 'A',
      subject = '',
      unit = '',
      topic = '',
      caption = '',
      teachingEntryId,
      date,
      policyConsent = true,
    } = req.body;

    const consentVal = policyConsent === true || policyConsent === 'true';

    const uploadedRecords = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const photoCaption = files.length > 1 && !caption
        ? `Classroom documentation - ${file.originalname}`
        : (caption || file.originalname);

      const record = await UploadedPhoto.create({
        teacherId: req.user._id,
        schoolId: req.user.schoolName || '',
        teachingEntryId: teachingEntryId || null,
        date: date ? new Date(date) : new Date(),
        className: className || '',
        section: section || 'A',
        classHandled: section ? `${className}-${section}` : className,
        subject: subject || '',
        unit: unit || '',
        topic: topic || '',
        caption: photoCaption,
        originalFileName: file.originalname,
        storageKey: file.filename,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        fileSize: file.size,
        policyConsent: consentVal,
      });

      // If associated with a daily teaching diary entry, update the entry's photo count/links
      if (teachingEntryId) {
        try {
          const entry = await DailyTeachingEntry.findById(teachingEntryId);
          if (entry && String(entry.teacherId) === String(req.user._id)) {
            const currentPhotos = entry.classroomPhotographs || [];
            currentPhotos.push(`/uploads/${file.filename}`);
            await DailyTeachingEntry.updateById(teachingEntryId, req.user._id, {
              classroomPhotographs: currentPhotos,
            });
          }
        } catch (linkErr) {
          console.warn('[Photo Link Warn]', linkErr.message);
        }
      }

      uploadedRecords.push(record);
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedRecords.length} photo(s).`,
      count: uploadedRecords.length,
      data: uploadedRecords,
      photos: uploadedRecords,
    });
  } catch (error) {
    console.error('[Upload Photos Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload photos.' });
  }
};

/**
 * @desc Get all photos for the authenticated teacher with filters
 * @route GET /api/photos
 * @access Private
 */
export const getTeacherPhotos = async (req, res) => {
  try {
    const { className, classHandled, subject, date, startDate, endDate, teachingEntryId, unit, topic } = req.query;

    const photos = await UploadedPhoto.findForTeacher(req.user._id, {
      className,
      classHandled,
      subject,
      date,
      startDate,
      endDate,
      teachingEntryId,
      unit,
      topic,
    });

    res.status(200).json({
      success: true,
      count: photos.length,
      data: photos,
      photos,
    });
  } catch (error) {
    console.error('[Get Photos Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch photos.' });
  }
};

/**
 * @desc Get photo by ID
 * @route GET /api/photos/:id
 * @access Private
 */
export const getPhotoById = async (req, res) => {
  try {
    const photo = await UploadedPhoto.findById(req.params.id);
    if (!photo || String(photo.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Photo not found or unauthorized.' });
    }

    res.status(200).json({ success: true, data: photo, photo });
  } catch (error) {
    console.error('[Get Photo By ID Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch photo.' });
  }
};

/**
 * @desc Update photo metadata (caption, class, subject, topic, diary link)
 * @route PUT /api/photos/:id
 * @access Private
 */
export const updatePhoto = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const existing = await UploadedPhoto.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Photo not found or unauthorized.' });
    }

    const { caption, className, section, subject, unit, topic, teachingEntryId, date } = req.body;
    const updateData = {};
    if (caption !== undefined) updateData.caption = caption;
    if (className !== undefined) updateData.className = className;
    if (section !== undefined) updateData.section = section;
    if (className && section) updateData.classHandled = `${className}-${section}`;
    if (subject !== undefined) updateData.subject = subject;
    if (unit !== undefined) updateData.unit = unit;
    if (topic !== undefined) updateData.topic = topic;
    if (teachingEntryId !== undefined) updateData.teachingEntryId = teachingEntryId || null;
    if (date !== undefined) updateData.date = new Date(date);

    const updated = await UploadedPhoto.updateById(req.params.id, teacherId, updateData);

    res.status(200).json({
      success: true,
      message: 'Photo documentation updated successfully.',
      data: updated,
      photo: updated,
    });
  } catch (error) {
    console.error('[Update Photo Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update photo.' });
  }
};

/**
 * @desc Delete photo (database record + disk file)
 * @route DELETE /api/photos/:id
 * @access Private
 */
export const deletePhoto = async (req, res) => {
  try {
    const existing = await UploadedPhoto.findById(req.params.id);
    if (!existing || String(existing.teacherId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Photo not found or unauthorized.' });
    }

    // Try deleting physical file from disk
    if (existing.storageKey) {
      const filePath = path.resolve(uploadsDir, existing.storageKey);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsErr) {
          console.warn('[File unlink warning]:', fsErr.message);
        }
      }
    }

    await UploadedPhoto.deleteById(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully.',
    });
  } catch (error) {
    console.error('[Delete Photo Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete photo.' });
  }
};
