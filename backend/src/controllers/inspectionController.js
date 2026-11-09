import fs from 'fs';
import path from 'path';
import { InspectionPackage } from '../models/InspectionPackage.js';
import {
  calculateInspectionReadiness,
  generateInspectionPackageZip,
} from '../services/inspectionService.js';

const inspectionDir = path.resolve(process.cwd(), 'uploads', 'inspection');
if (!fs.existsSync(inspectionDir)) {
  fs.mkdirSync(inspectionDir, { recursive: true });
}

/**
 * @desc Get honest inspection readiness score, coverage breakdown & missing documentation checklist
 * @route GET /api/inspection/readiness
 * @access Private
 */
export const getInspectionReadiness = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { academicYear, startDate, endDate, className, subject } = req.query;

    const data = await calculateInspectionReadiness(teacherId, {
      academicYear,
      startDate,
      endDate,
      className,
      subject,
    });

    res.status(200).json({
      success: true,
      readiness: data,
    });
  } catch (error) {
    console.error('[Inspection Readiness Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to calculate inspection readiness.' });
  }
};

/**
 * @desc Generate complete 12-folder Academic-Year Inspection ZIP Package
 * @route POST /api/inspection/package/generate
 * @access Private
 */
export const generateInspectionPackage = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { academicYear = '2026-2027', startDate, endDate, className, subject } = req.body;

    const { buffer, readiness } = await generateInspectionPackageZip(teacherId, {
      academicYear,
      startDate,
      endDate,
      className,
      subject,
    });

    const safeYear = academicYear.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Inspection_Package_${safeYear}_${Date.now()}.zip`;
    const storageKey = `inspection/${fileName}`;
    const filePath = path.resolve(inspectionDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const packageRecord = await InspectionPackage.create({
      teacherId,
      schoolId: req.user.schoolName || '',
      academicYear,
      title: `Official Inspection Dossier - Academic Year ${academicYear}`,
      fileName,
      storageKey,
      fileUrl: `/uploads/${storageKey}`,
      fileSize: buffer.length,
      readinessScore: readiness.readinessScore,
      breakdown: readiness.breakdown,
      missingItemsCount: readiness.checklist.filter((c) => c.status === 'Missing').length,
      checklistSummary: readiness.checklist.map((c) => ({
        category: c.category,
        status: c.status,
        details: c.details,
      })),
    });

    res.status(201).json({
      success: true,
      message: `Inspection package for ${academicYear} generated successfully. Ready for download.`,
      package: packageRecord,
    });
  } catch (error) {
    console.error('[Generate Inspection Package Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate inspection package.' });
  }
};

/**
 * @desc Get list of generated inspection packages
 * @route GET /api/inspection/packages
 * @access Private
 */
export const getInspectionPackages = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const { academicYear } = req.query;

    const packages = await InspectionPackage.findForTeacher(teacherId, academicYear);

    res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    console.error('[Get Packages Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch packages.' });
  }
};

/**
 * @desc Download inspection package ZIP
 * @route GET /api/inspection/packages/:id/download
 * @access Private
 */
export const downloadInspectionPackage = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const pkg = await InspectionPackage.findById(req.params.id);

    if (!pkg || String(pkg.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Inspection package not found or unauthorized.' });
    }

    const filePath = path.resolve(process.cwd(), 'uploads', pkg.storageKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Inspection package physical file not found.' });
    }

    res.download(filePath, pkg.fileName);
  } catch (error) {
    console.error('[Download Package Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to download package.' });
  }
};

/**
 * @desc Delete inspection package
 * @route DELETE /api/inspection/packages/:id
 * @access Private
 */
export const deleteInspectionPackage = async (req, res) => {
  try {
    const teacherId = req.user._id || req.user.id;
    const pkg = await InspectionPackage.findById(req.params.id);

    if (!pkg || String(pkg.teacherId) !== String(teacherId)) {
      return res.status(404).json({ success: false, message: 'Inspection package not found or unauthorized.' });
    }

    if (pkg.storageKey) {
      const filePath = path.resolve(process.cwd(), 'uploads', pkg.storageKey);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fErr) {
          console.warn('[Unlink package warning]:', fErr.message);
        }
      }
    }

    await InspectionPackage.deleteById(req.params.id, teacherId);

    res.status(200).json({
      success: true,
      message: 'Inspection package removed successfully.',
    });
  } catch (error) {
    console.error('[Delete Package Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete package.' });
  }
};
