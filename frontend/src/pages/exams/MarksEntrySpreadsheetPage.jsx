import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Lock,
  Unlock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Award,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ReportCardPreviewModal } from './ReportCardPreviewModal';
import {
  calculateStudentMarksResult,
  calculateExamStatistics,
} from '../../utils/marksCalculationEngine';
import { downloadBlob } from '../../utils/fileDownload';

export const MarksEntrySpreadsheetPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examRecord, setExamRecord] = useState(null);
  const [students, setStudents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmUnlockOpen, setConfirmUnlockOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [exportingType, setExportingType] = useState(null); // 'pdf' | 'excel' | 'bulk'

  // Input cell references for smooth keyboard navigation
  const cellRefs = useRef({});

  // Fetch record on mount
  const fetchRecord = useCallback(async () => {
    try {
      setLoading(true);
      const res = await examApi.getExamRecordById(id);
      if (res.data?.success && res.data?.data) {
        const record = res.data.data;
        setExamRecord(record);

        const initialStudents = record.studentMarks || [];
        setStudents(initialStudents);

        // Run client-side calculation to verify statistics
        const computed = initialStudents.map((s) =>
          calculateStudentMarksResult(s, record.templateSnapshot || {})
        );
        const stats = calculateExamStatistics(computed, record.templateSnapshot || {});
        setStatistics(stats);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to load exam record.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const template = examRecord?.templateSnapshot || {};
  const components = template.components || [];
  const isFinalized = examRecord?.status === 'Finalized';

  // Recalculate a student row immediately
  const handleMarkChange = (studentIndex, componentCode, rawValue) => {
    if (isFinalized) return;

    const updated = [...students];
    const student = { ...updated[studentIndex] };
    const compMarks = { ...(student.componentMarks || {}) };

    const upperVal = String(rawValue || '').trim().toUpperCase();

    if (upperVal === 'AB' || upperVal === 'ABSENT') {
      compMarks[componentCode] = {
        rawMarks: 0,
        finalMarks: 0,
        isAbsent: true,
        isExempted: false,
      };
    } else if (upperVal === 'EX' || upperVal === 'EXEMPT') {
      compMarks[componentCode] = {
        rawMarks: 0,
        finalMarks: 0,
        isAbsent: false,
        isExempted: true,
      };
    } else {
      const num = upperVal === '' ? '' : Number(upperVal);
      compMarks[componentCode] = {
        rawMarks: num,
        isAbsent: false,
        isExempted: false,
      };
    }

    student.componentMarks = compMarks;

    // Run calculation engine for this student
    const evaluated = calculateStudentMarksResult(student, template);
    updated[studentIndex] = evaluated;

    setStudents(updated);

    // Update global statistics
    const stats = calculateExamStatistics(updated, template);
    setStatistics(stats);
  };

  // Keyboard navigation handler
  const handleKeyDown = (e, rowIndex, compIndex) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      let targetRow = rowIndex;
      let targetComp = compIndex;

      if (e.key === 'ArrowUp') {
        targetRow = Math.max(0, rowIndex - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        targetRow = Math.min(students.length - 1, rowIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        targetComp = Math.max(0, compIndex - 1);
      } else if (e.key === 'ArrowRight') {
        targetComp = Math.min(components.length - 1, compIndex + 1);
      }

      const key = `${targetRow}_${targetComp}`;
      if (cellRefs.current[key]) {
        cellRefs.current[key].focus();
        cellRefs.current[key].select?.();
      }
    }
  };

  // Excel / CSV multi-cell paste handler
  const handlePaste = (e, startRowIndex, startCompIndex) => {
    if (isFinalized) return;
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    // Detect if multi-row or multi-cell paste (contains \n or \t)
    if (clipboardData.includes('\t') || clipboardData.includes('\n')) {
      e.preventDefault();

      const rows = clipboardData
        .split(/\r\n|\n|\r/)
        .map((r) => r.split('\t'))
        .filter((r) => r.length > 0 && r[0] !== '');

      const updated = [...students];

      rows.forEach((rowValues, rOffset) => {
        const targetRow = startRowIndex + rOffset;
        if (targetRow >= updated.length) return;

        const student = { ...updated[targetRow] };
        const compMarks = { ...(student.componentMarks || {}) };

        rowValues.forEach((val, cOffset) => {
          const targetCompIdx = startCompIndex + cOffset;
          if (targetCompIdx >= components.length) return;

          const comp = components[targetCompIdx];
          const upperVal = String(val || '').trim().toUpperCase();

          if (upperVal === 'AB' || upperVal === 'ABSENT') {
            compMarks[comp.code] = { rawMarks: 0, finalMarks: 0, isAbsent: true, isExempted: false };
          } else if (upperVal === 'EX' || upperVal === 'EXEMPT') {
            compMarks[comp.code] = { rawMarks: 0, finalMarks: 0, isAbsent: false, isExempted: true };
          } else {
            const num = upperVal === '' ? '' : Number(upperVal);
            compMarks[comp.code] = { rawMarks: num, isAbsent: false, isExempted: false };
          }
        });

        student.componentMarks = compMarks;
        updated[targetRow] = calculateStudentMarksResult(student, template);
      });

      setStudents(updated);
      const stats = calculateExamStatistics(updated, template);
      setStatistics(stats);
      showToast(`Pasted ${rows.length} rows from clipboard.`, 'info');
    }
  };

  // Add a new student row
  const handleAddStudentRow = () => {
    if (isFinalized) return;
    const nextRoll = students.length > 0 ? Math.max(...students.map((s) => Number(s.rollNumber) || 0)) + 1 : 1;
    const newStudent = {
      studentId: `stu_custom_${Date.now()}`,
      studentName: `Student ${nextRoll}`,
      admissionNumber: `ADM-${nextRoll}`,
      rollNumber: nextRoll,
      componentMarks: {},
      totalRaw: 0,
      totalFinal: 0,
      percentage: 0,
      grade: 'F',
      isPass: false,
    };
    const evaluated = calculateStudentMarksResult(newStudent, template);
    const updated = [...students, evaluated];
    setStudents(updated);
    setStatistics(calculateExamStatistics(updated, template));
  };

  // Delete student row
  const handleDeleteStudentRow = (index) => {
    if (isFinalized) return;
    const updated = students.filter((_, i) => i !== index);
    setStudents(updated);
    setStatistics(calculateExamStatistics(updated, template));
  };

  // Update student name / roll inline
  const handleStudentFieldChange = (index, field, value) => {
    if (isFinalized) return;
    const updated = [...students];
    updated[index] = { ...updated[index], [field]: value };
    setStudents(updated);
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const res = await examApi.updateExamRecord(id, {
        studentMarks: students,
      });
      if (res.data?.success || res.success) {
        showToast('Draft marks saved successfully!', 'success');
        const updatedRec = res.data?.data || res.data || res;
        if (updatedRec) {
          setExamRecord(updatedRec);
          if (updatedRec.studentMarks) setStudents(updatedRec.studentMarks);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Finalize Record
  const handleFinalize = async () => {
    try {
      setSaving(true);
      // Save first, then finalize
      await examApi.updateExamRecord(id, { studentMarks: students });
      const res = await examApi.finalizeExamRecord(id);
      if (res.data?.success || res.success) {
        showToast('Examination marks finalized and locked successfully!', 'success');
        setExamRecord(res.data?.data || res.data);
        setConfirmFinalizeOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to finalize marks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Unlock Record (Admin / correction)
  const handleUnlock = async () => {
    try {
      setSaving(true);
      const res = await examApi.unlockExamRecord(id);
      if (res.data?.success || res.success) {
        showToast('Examination unlocked for editing.', 'info');
        setExamRecord(res.data?.data || res.data);
        setConfirmUnlockOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to unlock marks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export Handlers
  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      const res = await examApi.downloadClassRegisterPdf(id);
      downloadBlob(
        res,
        `Class_Register_${(examRecord.examTitle || 'Exam').replace(/\s+/g, '_')}.pdf`,
        'application/pdf'
      );
      showToast('Class Register PDF downloaded.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export class register PDF.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportingType('excel');
      const res = await examApi.downloadClassRegisterExcel(id);
      downloadBlob(
        res,
        `Class_Register_${(examRecord.examTitle || 'Exam').replace(/\s+/g, '_')}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast('Class Register Excel (.xlsx) downloaded.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export class register Excel.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportBulkReportCards = async () => {
    try {
      setExportingType('bulk');
      const res = await examApi.downloadBulkReportCardsPdf(id);
      downloadBlob(
        res,
        `All_ReportCards_${(examRecord.examTitle || 'Exam').replace(/\s+/g, '_')}.pdf`,
        'application/pdf'
      );
      showToast('Combined Report Cards PDF downloaded.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export bulk report cards.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter(
    (s) =>
      (s.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.rollNumber).includes(searchQuery) ||
      (s.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Loading examination marks spreadsheet..." />
      </div>
    );
  }

  if (!examRecord) {
    return (
      <div className="text-center py-24 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Record Not Found</h2>
        <button
          onClick={() => navigate('/marks-entry')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
        >
          Return to Marks Entry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full pb-16">
      {/* 1. TOP HEADER & ACTIONS BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/marks-entry')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Back to Marks Entry"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">{examRecord.examTitle}</h1>
              <Badge variant={isFinalized ? 'success' : 'warning'}>
                {isFinalized ? (
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Finalized & Locked
                  </span>
                ) : (
                  'Draft (Editing)'
                )}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Class {examRecord.className} ({examRecord.section || 'A'}) • {examRecord.subject} •{' '}
              {template.templateName} (Max Final: {template.totalFinalMarks})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save Draft */}
          {!isFinalized && (
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          )}

          {/* Finalize Button */}
          {!isFinalized ? (
            <button
              onClick={() => setConfirmFinalizeOpen(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              Finalize & Lock
            </button>
          ) : (
            <button
              onClick={() => setConfirmUnlockOpen(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              Unlock for Editing
            </button>
          )}

          {/* Export Class Register (PDF / Excel) */}
          <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50 text-xs font-semibold">
            <button
              onClick={handleExportPdf}
              disabled={exportingType === 'pdf'}
              className="px-3 py-2 text-slate-700 hover:bg-slate-200 flex items-center gap-1 transition cursor-pointer"
              title="Download official landscape class register PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              PDF Register
            </button>
            <div className="w-[1px] h-5 bg-slate-300" />
            <button
              onClick={handleExportExcel}
              disabled={exportingType === 'excel'}
              className="px-3 py-2 text-slate-700 hover:bg-slate-200 flex items-center gap-1 transition cursor-pointer"
              title="Download formatted Excel (.xlsx) workbook"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel (.xlsx)
            </button>
            <div className="w-[1px] h-5 bg-slate-300" />
            <button
              onClick={handleExportBulkReportCards}
              disabled={exportingType === 'bulk'}
              className="px-3 py-2 text-blue-700 hover:bg-blue-100 flex items-center gap-1 transition cursor-pointer"
              title="Download all student report cards combined in one PDF"
            >
              <Award className="w-3.5 h-3.5 text-blue-600" />
              All Report Cards
            </button>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME CLASS PERFORMANCE METRICS BAR */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Enrolled
            </span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {statistics.totalStudents || students.length}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Appeared
            </span>
            <span className="text-lg font-black text-blue-600 mt-0.5 block">
              {statistics.appearedCount ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Absent
            </span>
            <span className="text-lg font-black text-amber-600 mt-0.5 block">
              {statistics.absentCount ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Passed
            </span>
            <span className="text-lg font-black text-emerald-600 mt-0.5 block">
              {statistics.passedCount ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Failed
            </span>
            <span className="text-lg font-black text-rose-600 mt-0.5 block">
              {statistics.failedCount ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pass Rate
            </span>
            <span className="text-lg font-black text-indigo-600 mt-0.5 block">
              {statistics.passPercentage ?? 0}%
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Class Average
            </span>
            <span className="text-lg font-black text-slate-800 mt-0.5 block">
              {statistics.classAverage ?? 0}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Highest / Lowest
            </span>
            <span className="text-sm font-bold text-slate-700 mt-1 block">
              {statistics.highestMarks ?? 0} / {statistics.lowestMarks ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* 3. SPREADSHEET TOOLBAR & INSTRUCTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or roll number..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-500 text-[11px] hidden md:inline">
            ⚡ <b>Pro Tip:</b> Paste Excel tables (Ctrl+V) directly into any cell. Enter 'AB' for
            absent, 'EX' for exempted.
          </span>
        </div>

        {!isFinalized && (
          <button
            onClick={handleAddStudentRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add Student Row
          </button>
        )}
      </div>

      {/* 4. SPREADSHEET DATA GRID TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse select-none">
          {/* Header Row */}
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-800 text-[11px] font-bold">
              <th className="py-3 px-3 w-12 text-center sticky left-0 bg-slate-900 z-20">#</th>
              <th className="py-3 px-3 w-16 text-center sticky left-12 bg-slate-900 z-20">Roll</th>
              <th className="py-3 px-4 min-w-[180px] sticky left-28 bg-slate-900 z-20">
                Student Name
              </th>
              <th className="py-3 px-3 w-28 text-slate-300">Admission No</th>

              {/* Dynamic Component Columns */}
              {components.map((comp, compIdx) => (
                <th
                  key={comp.code}
                  className="py-2.5 px-3 min-w-[130px] text-center border-l border-slate-800"
                >
                  <div className="font-bold text-white truncate max-w-[140px] mx-auto">
                    {comp.name}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-blue-300">[{comp.code}]</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded">
                      Raw: {comp.maxRawMarks}
                    </span>
                    <span className="text-[10px] bg-blue-900/60 text-blue-200 px-1 rounded font-bold">
                      Fin: {comp.finalWeightage}
                    </span>
                  </div>
                </th>
              ))}

              {/* Computed Totals Columns */}
              <th className="py-3 px-3 w-20 text-center border-l border-slate-800 bg-slate-950">
                Raw Tot.
              </th>
              <th className="py-3 px-3 w-24 text-center bg-blue-950 text-blue-200 font-bold border-l border-blue-900">
                Final ({template.totalFinalMarks || 100})
              </th>
              <th className="py-3 px-3 w-16 text-center bg-slate-950">%</th>
              <th className="py-3 px-3 w-16 text-center bg-slate-950">Grade</th>
              <th className="py-3 px-3 w-20 text-center bg-slate-950">Status</th>
              <th className="py-3 px-3 w-20 text-center bg-slate-950">Report</th>
              {!isFinalized && <th className="py-3 px-2 w-10 text-center bg-slate-950"></th>}
            </tr>
          </thead>

          {/* Table Body Rows */}
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={components.length + 10}
                  className="py-12 text-center text-slate-400 text-sm"
                >
                  No students in this examination sheet. Click "Add Student Row" to begin.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, rowIdx) => {
                // Find actual index in original students array for updates
                const realIndex = students.findIndex((s) => s.studentId === student.studentId);

                return (
                  <tr
                    key={student.studentId || rowIdx}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">
                      {rowIdx + 1}
                    </td>

                    {/* Roll No */}
                    <td className="py-2.5 px-3 text-center sticky left-12 bg-white group-hover:bg-blue-50/30 z-10">
                      {isFinalized ? (
                        <span className="font-bold text-slate-800">{student.rollNumber}</span>
                      ) : (
                        <input
                          type="number"
                          value={student.rollNumber}
                          onChange={(e) =>
                            handleStudentFieldChange(realIndex, 'rollNumber', Number(e.target.value))
                          }
                          className="w-12 text-center font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Student Name */}
                    <td className="py-2.5 px-4 sticky left-28 bg-white group-hover:bg-blue-50/30 z-10">
                      {isFinalized ? (
                        <span className="font-semibold text-slate-900">{student.studentName}</span>
                      ) : (
                        <input
                          type="text"
                          value={student.studentName}
                          onChange={(e) =>
                            handleStudentFieldChange(realIndex, 'studentName', e.target.value)
                          }
                          className="w-full font-semibold text-slate-900 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Admission No */}
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {isFinalized ? (
                        student.admissionNumber || '-'
                      ) : (
                        <input
                          type="text"
                          value={student.admissionNumber || ''}
                          onChange={(e) =>
                            handleStudentFieldChange(realIndex, 'admissionNumber', e.target.value)
                          }
                          placeholder="ADM#"
                          className="w-full text-slate-500 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </td>

                    {/* Assessment Components Marks Inputs */}
                    {components.map((comp, compIdx) => {
                      const compData = (student.componentMarks || {})[comp.code] || {};
                      const isAbsent = compData.isAbsent;
                      const isExempt = compData.isExempted;
                      let displayVal = compData.rawMarks;
                      if (isAbsent) displayVal = 'AB';
                      if (isExempt) displayVal = 'EX';
                      if (displayVal === undefined || displayVal === null) displayVal = '';

                      const finalVal = compData.finalMarks !== undefined ? compData.finalMarks : '-';

                      return (
                        <td
                          key={comp.code}
                          className="py-1.5 px-2.5 border-l border-slate-100 text-center"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <input
                              ref={(el) => (cellRefs.current[`${realIndex}_${compIdx}`] = el)}
                              type="text"
                              disabled={isFinalized}
                              value={displayVal}
                              onChange={(e) =>
                                handleMarkChange(realIndex, comp.code, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, realIndex, compIdx)}
                              onPaste={(e) => handlePaste(e, realIndex, compIdx)}
                              className={`w-14 px-1.5 py-1 text-center font-bold text-xs rounded-lg border transition ${
                                isAbsent
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : isExempt
                                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : Number(displayVal) > comp.maxRawMarks
                                  ? 'bg-red-50 border-red-500 text-red-600'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                              }`}
                              placeholder="-"
                            />

                            {/* Computed Final Contribution Badge */}
                            <span
                              className="text-[10px] font-mono text-blue-700 bg-blue-50/80 px-1 py-0.5 rounded font-semibold min-w-[28px] text-right"
                              title={`Computed final contribution: ${finalVal} / ${comp.finalWeightage}`}
                            >
                              {finalVal}
                            </span>
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Raw */}
                    <td className="py-2.5 px-3 text-center border-l border-slate-200 font-semibold text-slate-700 bg-slate-50/50">
                      {student.totalRaw ?? 0}
                    </td>

                    {/* Total Final */}
                    <td className="py-2.5 px-3 text-center border-l border-blue-100 font-bold text-sm text-blue-700 bg-blue-50/30">
                      {student.totalFinal ?? 0}
                    </td>

                    {/* Percentage */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {student.percentage ? `${student.percentage}%` : '0%'}
                    </td>

                    {/* Letter Grade */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                          ['A+', 'A', 'A1', 'A2'].includes(student.grade)
                            ? 'bg-emerald-100 text-emerald-800'
                            : ['B+', 'B', 'B1', 'B2'].includes(student.grade)
                            ? 'bg-blue-100 text-blue-800'
                            : ['C', 'C1', 'C2', 'D'].includes(student.grade)
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {student.grade || 'F'}
                      </span>
                    </td>

                    {/* Pass / Fail Status */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.isPass
                            ? 'bg-emerald-100 text-emerald-800'
                            : student.isEntirelyAbsent
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {student.isEntirelyAbsent ? 'ABSENT' : student.isPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>

                    {/* Individual Report Card Preview Trigger */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForReport(student);
                          setReportModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                        title="View & print student report card"
                      >
                        <FileText className="w-4 h-4 mx-auto" />
                      </button>
                    </td>

                    {/* Delete Row */}
                    {!isFinalized && (
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteStudentRow(realIndex)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Remove student row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. AUDIT HISTORY & FINALIZATION FOOTER */}
      {examRecord.auditHistory && examRecord.auditHistory.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-500">
          <span className="font-bold text-slate-700 block mb-1">Audit Trail & Data Integrity</span>
          <div className="space-y-1">
            {examRecord.auditHistory.slice(-3).map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(a.timestamp).toLocaleString()}:
                </span>
                <span className="font-semibold text-slate-700">[{a.action}]</span>
                <span>{a.details}</span>
                <span className="text-slate-400">({a.user})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      <ReportCardPreviewModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setSelectedStudentForReport(null);
        }}
        examRecord={examRecord}
        student={selectedStudentForReport}
      />

      {/* Confirm Finalize Modal */}
      <ConfirmModal
        isOpen={confirmFinalizeOpen}
        onClose={() => setConfirmFinalizeOpen(false)}
        onConfirm={handleFinalize}
        title="Finalize & Lock Examination Marks?"
        message="Finalizing will permanently lock these marks and generate official board-ready report cards and marks registers. Historical records will retain this exact configuration snapshot."
        confirmText="Finalize & Lock Marks"
        type="primary"
        loading={saving}
      />

      {/* Confirm Unlock Modal */}
      <ConfirmModal
        isOpen={confirmUnlockOpen}
        onClose={() => setConfirmUnlockOpen(false)}
        onConfirm={handleUnlock}
        title="Unlock Finalized Examination?"
        message="This examination was finalized. Unlocking allows you to make corrections or modify marks. The unlock action will be recorded in the official audit history."
        confirmText="Unlock for Editing"
        type="warning"
        loading={saving}
      />
    </div>
  );
};

export default MarksEntrySpreadsheetPage;
