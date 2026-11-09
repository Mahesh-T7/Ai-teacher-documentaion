import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Save,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
  X,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { attendanceApi } from '../../api/attendanceApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';

export const AttendancePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('rollcall'); // 'rollcall' | 'roster' | 'monthly'

  // Selection
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Roster & Attendance state
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [existingAttendanceId, setExistingAttendanceId] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentName: '',
    admissionNumber: '',
    rollNumber: '',
    contactNumber: '',
    parentName: '',
  });
  const [csvText, setCsvText] = useState('');

  // Monthly Summary State
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch Students & existing Attendance for selected Class & Date
  const loadClassData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch Students
      const stuRes = await attendanceApi.getStudents({
        className: selectedClass,
        section: selectedSection,
      });

      const roster = stuRes.students || [];
      setStudents(roster);

      // 2. Check if attendance already recorded on selectedDate
      const attRes = await attendanceApi.getAttendanceByDate({
        date: selectedDate,
        className: selectedClass,
        section: selectedSection,
      });

      if (attRes.success && attRes.found && attRes.attendance) {
        setExistingAttendanceId(attRes.attendance._id || attRes.attendance.id);
        setAuditHistory(attRes.attendance.auditHistory || []);
        // Map records
        const recordMap = new Map();
        (attRes.attendance.records || []).forEach((r) => {
          recordMap.set(Number(r.rollNumber), r);
        });

        const initial = roster.map((s) => {
          const rec = recordMap.get(Number(s.rollNumber));
          return {
            studentId: s._id || s.id,
            studentName: s.studentName,
            rollNumber: s.rollNumber,
            status: rec ? rec.status : 'Present',
            remarks: rec ? rec.remarks : '',
          };
        });
        setAttendanceRecords(initial);
      } else {
        setExistingAttendanceId(null);
        setAuditHistory([]);
        // Default all to Present
        const initial = roster.map((s) => ({
          studentId: s._id || s.id,
          studentName: s.studentName,
          rollNumber: s.rollNumber,
          status: 'Present',
          remarks: '',
        }));
        setAttendanceRecords(initial);
      }
    } catch (err) {
      showToast('Error loading class attendance data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, selectedDate, showToast]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Load Monthly Summary
  const loadMonthlySummary = useCallback(async () => {
    try {
      setMonthlyLoading(true);
      const res = await attendanceApi.getMonthlySummary({
        className: selectedClass,
        section: selectedSection,
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.success) {
        setMonthlyData(res);
      }
    } catch (err) {
      showToast('Failed to load monthly summary', 'error');
    } finally {
      setMonthlyLoading(false);
    }
  }, [selectedClass, selectedSection, selectedMonth, selectedYear, showToast]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlySummary();
    }
  }, [activeTab, loadMonthlySummary]);

  // Status Toggles
  const handleStatusChange = (rollNumber, status) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.rollNumber === rollNumber ? { ...r, status } : r))
    );
  };

  const handleRemarksChange = (rollNumber, remarks) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.rollNumber === rollNumber ? { ...r, remarks } : r))
    );
  };

  const handleMarkAllPresent = () => {
    setAttendanceRecords((prev) => prev.map((r) => ({ ...r, status: 'Present' })));
    showToast('All students marked Present', 'info');
  };

  // Submit Roll Call
  const handleSaveAttendance = async () => {
    if (attendanceRecords.length === 0) {
      showToast('No students to mark attendance for. Add students first.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await attendanceApi.recordAttendance({
        date: selectedDate,
        className: selectedClass,
        section: selectedSection,
        records: attendanceRecords,
        updateIfExisting: true,
      });

      if (res.success) {
        showToast(
          res.wasUpdated
            ? 'Attendance updated with audit history.'
            : 'Attendance recorded successfully!',
          'success'
        );
        loadClassData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add Single Student
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newStudent.studentName || !newStudent.rollNumber) {
      showToast('Name and Roll number are required.', 'warning');
      return;
    }
    try {
      const res = await attendanceApi.addStudent({
        ...newStudent,
        className: selectedClass,
        section: selectedSection,
        admissionNumber: newStudent.admissionNumber || `ADM-${selectedClass}-${newStudent.rollNumber}`,
      });
      if (res.success) {
        showToast('Student added successfully!', 'success');
        setShowAddStudentModal(false);
        setNewStudent({ studentName: '', admissionNumber: '', rollNumber: '', contactNumber: '', parentName: '' });
        loadClassData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add student', 'error');
    }
  };

  // Import CSV Students
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    // Parse CSV lines
    const lines = csvText.trim().split('\n');
    const parsedStudents = [];

    lines.forEach((line, index) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length > 0 && parts[0]) {
        // format: Name, Roll, AdmissionNo, Phone
        const name = parts[0];
        const roll = parts[1] ? Number(parts[1]) : index + 1;
        const adm = parts[2] || `ADM-${selectedClass}-${roll}`;
        const phone = parts[3] || '';
        parsedStudents.push({
          studentName: name,
          rollNumber: roll,
          admissionNumber: adm,
          contactNumber: phone,
        });
      }
    });

    try {
      const res = await attendanceApi.importStudents({
        className: selectedClass,
        section: selectedSection,
        students: parsedStudents,
      });
      if (res.success) {
        showToast(`Imported ${res.addedCount} students successfully!`, 'success');
        setShowImportModal(false);
        setCsvText('');
        loadClassData();
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    }
  };

  // Counters
  const total = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'Present').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'Absent').length;
  const leaveCount = attendanceRecords.filter((r) => r.status === 'Leave').length;
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Phase 4 Attendance & Student Roster
            </span>
            <span className="text-xs text-slate-500 font-medium">{students.length} Students in Roster</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" />
            Class Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quick 1-click roll-call, Excel/CSV student imports, automated percentage calculations, and monthly audit tracking.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('rollcall')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rollcall' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Roll Call
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'roster' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Student Roster
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Monthly Analytics
          </button>
        </div>
      </div>

      {/* Class & Date Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="Class 8">Class 8</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rollcall' && (
            <>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving || total === 0}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <LoadingSpinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
                {existingAttendanceId ? 'Update Attendance' : 'Submit Attendance'}
              </button>
            </>
          )}

          {activeTab === 'roster' && (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Import CSV
              </button>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Student
              </button>
            </>
          )}
        </div>
      </div>

      {/* ROLL CALL TAB */}
      {activeTab === 'rollcall' && (
        <div className="space-y-4">
          {/* Metrics summary card */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Roster</span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{total}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present</span>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">{presentCount}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-rose-600 uppercase">Absent</span>
              <p className="text-xl font-bold text-rose-700 mt-0.5">{absentCount}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">On Leave</span>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{leaveCount}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-blue-600 uppercase">Attendance %</span>
              <p className="text-xl font-bold text-blue-700 mt-0.5">{percentage}%</p>
            </div>
          </div>

          {existingAttendanceId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
              <span>
                ℹ️ Attendance for <strong>{selectedClass}-{selectedSection}</strong> on{' '}
                <strong>{new Date(selectedDate).toLocaleDateString()}</strong> is already recorded. Making changes will update the entry and append to audit history.
              </span>
              <span className="text-[11px] font-medium text-blue-600">
                Audits: {auditHistory.length}
              </span>
            </div>
          )}

          {/* Student Roll Call Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : total === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No students found in {selectedClass} Section {selectedSection}</p>
                <p className="text-xs text-slate-400">Add students or import from a spreadsheet to start taking daily attendance.</p>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Add First Student
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 w-16">Roll No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Attendance Status</th>
                      <th className="py-3 px-4">Remarks (Optional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map((r) => (
                      <tr key={r.rollNumber} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-700">{r.rollNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{r.studentName}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(r.rollNumber, 'Present')}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                                r.status === 'Present'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(r.rollNumber, 'Absent')}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                                r.status === 'Absent'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(r.rollNumber, 'Leave')}
                              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all ${
                                r.status === 'Leave'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="e.g. Fever, Sports competition..."
                            className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={r.remarks || ''}
                            onChange={(e) => handleRemarksChange(r.rollNumber, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT ROSTER TAB */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {selectedClass} - Section {selectedSection} Roster ({students.length} Students)
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No students enrolled in {selectedClass}-{selectedSection}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-16">Roll No</th>
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Parent / Guardian</th>
                    <th className="py-3 px-4">Contact Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s._id || s.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-700">{s.rollNumber}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{s.admissionNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{s.studentName}</td>
                      <td className="py-3 px-4 text-slate-600">{s.parentName || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{s.contactNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MONTHLY ANALYTICS TAB */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {monthlyLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : !monthlyData || monthlyData.totalDaysRecorded === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No attendance records logged for {selectedClass} in month {selectedMonth}/{selectedYear}.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Working Days Recorded</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{monthlyData.totalDaysRecorded} Days</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Class Average Attendance</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{monthlyData.overallPercentage}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Low Attendance Alert (&lt;75%)</span>
                  <p className="text-2xl font-bold text-rose-600 mt-1">
                    {monthlyData.studentSummaries.filter((s) => s.percentage < 75).length} Students
                  </p>
                </div>
              </div>

              {/* Student Wise Monthly Performance Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-xs">
                  Monthly Student Attendance Register
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4 w-16">Roll</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center">Present Days</th>
                        <th className="py-3 px-4 text-center">Absent Days</th>
                        <th className="py-3 px-4 text-center">Leave Days</th>
                        <th className="py-3 px-4 text-center">Monthly %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyData.studentSummaries.map((s) => (
                        <tr key={s.rollNumber} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-700">{s.rollNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{s.studentName}</td>
                          <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{s.present}</td>
                          <td className="py-3 px-4 text-center text-rose-700 font-semibold">{s.absent}</td>
                          <td className="py-3 px-4 text-center text-amber-700 font-semibold">{s.leave}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                                s.percentage >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {s.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Add Student to {selectedClass}-{selectedSection}</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={newStudent.studentName}
                  onChange={(e) => setNewStudent({ ...newStudent, studentName: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newStudent.rollNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Admission No</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newStudent.admissionNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, admissionNumber: e.target.value })}
                    placeholder="ADM-2026-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Parent Name</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newStudent.contactNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, contactNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Bulk Import Students ({selectedClass}-{selectedSection})</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste your student roster rows in CSV format (one student per line):<br />
              <code className="text-blue-600">Student Name, Roll Number, Admission Number, Phone</code>
            </p>

            <textarea
              rows={6}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`Aarav Patel, 1, ADM-9A-01, 9876543210\nBhavya Rao, 2, ADM-9A-02, 9876543211\nChetan Kumar, 3, ADM-9A-03, 9876543212`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                Import Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
