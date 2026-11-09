import {
  exportTeacherBackup,
  previewRestoreBackup,
  executeRestoreBackup,
  getBackupLogs,
} from '../services/backupService.js';

// @desc    Export full teacher data backup
// @route   POST /api/backup/export
// @access  Private (Teacher)
export const handleExportBackup = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const reqMeta = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    const backup = await exportTeacherBackup(teacherId, reqMeta);

    res.status(200).json({
      success: true,
      message: 'Teacher backup exported successfully',
      backup,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Preview / Dry-run restore before executing
// @route   POST /api/backup/preview
// @access  Private (Teacher)
export const handlePreviewRestore = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { backupData } = req.body;

    if (!backupData) {
      return res.status(400).json({
        success: false,
        message: 'No backup data provided for restore preview',
      });
    }

    const reqMeta = {
      ip: req.ip || req.connection?.remoteAddress,
    };

    const preview = await previewRestoreBackup(teacherId, backupData, reqMeta);

    res.status(200).json({
      success: true,
      preview,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Execute restore with selected strategy
// @route   POST /api/backup/restore
// @access  Private (Teacher)
export const handleExecuteRestore = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { backupData, strategy = 'merge', confirmed } = req.body;

    if (!backupData) {
      return res.status(400).json({
        success: false,
        message: 'No backup data provided for restore',
      });
    }

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Restore requires explicit teacher confirmation before modifying records.',
      });
    }

    const reqMeta = {
      ip: req.ip || req.connection?.remoteAddress,
    };

    const result = await executeRestoreBackup(teacherId, backupData, strategy, reqMeta);

    res.status(200).json({
      success: true,
      message: `Restore completed successfully. Restored ${result.recordsRestored} records.`,
      result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get backup audit logs for teacher
// @route   GET /api/backup/logs
// @access  Private (Teacher)
export const handleGetBackupLogs = async (req, res, next) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const logs = await getBackupLogs(teacherId);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    next(err);
  }
};
