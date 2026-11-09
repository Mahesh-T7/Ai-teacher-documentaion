import express from 'express';
import {
  addStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  importStudents,
  recordAttendance,
  getAttendanceByDateAndClass,
  getAttendanceHistory,
  updateAttendanceById,
  getMonthlyAttendanceSummary,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Student Roster
router.post('/students', addStudent);
router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/import', importStudents);

// Roll Call & History
router.post('/', recordAttendance);
router.get('/', getAttendanceHistory);
router.get('/by-date', getAttendanceByDateAndClass);
router.get('/summary/monthly', getMonthlyAttendanceSummary);
router.put('/:id', updateAttendanceById);

export default router;
