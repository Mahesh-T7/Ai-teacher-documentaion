import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Save,
  Lock,
  Unlock,
  Download,
  Printer,
  FileText,
  Search,
  Plus,
  Trash2,
  Users,
  Eye,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { attendanceApi } from '../../api/attendanceApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ReportCardPreviewModal } from '../exams/ReportCardPreviewModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { downloadBlob } from '../../utils/fileDownload';

const NORMAL_TEMPLATE_ID = 'preset_normal_fa_sa_annual';

const DEFAULT_MAX_MARKS = {
  FA1: 50,
  FA2: 50,
  SA1: 100,
  FA3: 50,
  FA4: 50,
  SA2: 100,
};

const SUBJECT_SUGGESTIONS = [
  'Mathematics',
  'Science',
  'Social Science',
  'English',
  'Kannada',
  'Hindi',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
];

const getGradeFromPercent = (pct) => {
  const p = Number(pct) || 0;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C+';
  if (p >= 35) return 'C';
  return 'NA';
};

const generateDefaultNormalStudents = (count = 20, section = 'A') => {
  return Array.from({ length: count }, (_, i) => {
    const roll = i + 1;
    return {
      studentId: `stu_${section}_${roll}`,
      rollNumber: roll,
      studentName: `Student ${roll}`,
      gender: roll % 2 === 0 ? 'F' : 'M',
      caste: 'GEN',
      admissionNumber: '',
      componentMarks: {
        FA1: { rawMarks: '' },
        FA2: { rawMarks: '' },
        SA1: { rawMarks: '' },
        FA3: { rawMarks: '' },
        FA4: { rawMarks: '' },
        SA2: { rawMarks: '' },
      },
      totalRaw: 0,
      totalFinal: 0,
      percentage: 0,
      grade: 'NA',
      isPass: false,
    };
  });
};

export const NormalMarksEntryPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [className, setClassName] = useState('Class 9');
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState('Mathematics');
  const [termView, setTermView] = useState('all'); // 'all' | 'term1' | 'term2'
  const [maxMarks, setMaxMarks] = useState(DEFAULT_MAX_MARKS);
  const [showMaxConfig, setShowMaxConfig] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [students, setStudents] = useState(() => generateDefaultNormalStudents(20, 'A'));
  const [searchQuery, setSearchQuery] = useState('');

  const [importStudentsModalOpen, setImportStudentsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [exportingType, setExportingType] = useState(null);

  const cellRefs = useRef({});

  const term1Max = (Number(maxMarks.FA1) || 0) + (Number(maxMarks.FA2) || 0) + (Number(maxMarks.SA1) || 0);
  const term2Max = (Number(maxMarks.FA3) || 0) + (Number(maxMarks.FA4) || 0) + (Number(maxMarks.SA2) || 0);
  const activeMaxTotal =
    termView === 'term1' ? term1Max : termView === 'term2' ? term2Max : term1Max + term2Max;

  const buildCustomTemplateSnapshot = useCallback(
    () => ({
      _id: NORMAL_TEMPLATE_ID,
      templateName: 'Normal Marks Entry (FA1, FA2, SA1 & FA3, FA4, SA2)',
      academicYear,
      className,
      subject,
      totalFinalMarks: term1Max + term2Max,
      components: [
        { code: 'FA1', name: 'FA 1', maxRaw: Number(maxMarks.FA1) || 50, finalMarks: Number(maxMarks.FA1) || 50, calculationMethod: 'direct', includeInTotal: false, group: 'Term 1', order: 1 },
        { code: 'FA2', name: 'FA 2', maxRaw: Number(maxMarks.FA2) || 50, finalMarks: Number(maxMarks.FA2) || 50, calculationMethod: 'direct', includeInTotal: false, group: 'Term 1', order: 2 },
        { code: 'SA1', name: 'SA 1', maxRaw: Number(maxMarks.SA1) || 100, finalMarks: Number(maxMarks.SA1) || 100, calculationMethod: 'direct', includeInTotal: false, group: 'Term 1', order: 3 },
        { code: 'TERM1_TOTAL', name: 'T1 Total', maxRaw: term1Max, finalMarks: term1Max, calculationMethod: 'sum', dependencies: ['FA1', 'FA2', 'SA1'], includeInTotal: true, isTotal: true, group: 'Term 1', order: 4 },
        { code: 'FA3', name: 'FA 3', maxRaw: Number(maxMarks.FA3) || 50, finalMarks: Number(maxMarks.FA3) || 50, calculationMethod: 'direct', includeInTotal: false, group: 'Term 2', order: 5 },
        { code: 'FA4', name: 'FA 4', maxRaw: Number(maxMarks.FA4) || 50, finalMarks: Number(maxMarks.FA4) || 50, calculationMethod: 'direct', includeInTotal: false, group: 'Term 2', order: 6 },
        { code: 'SA2', name: 'SA 2', maxRaw: Number(maxMarks.SA2) || 100, finalMarks: Number(maxMarks.SA2) || 100, calculationMethod: 'direct', includeInTotal: false, group: 'Term 2', order: 7 },
        { code: 'TERM2_TOTAL', name: 'T2 Total', maxRaw: term2Max, finalMarks: term2Max, calculationMethod: 'sum', dependencies: ['FA3', 'FA4', 'SA2'], includeInTotal: true, isTotal: true, group: 'Term 2', order: 8 },
      ],
      gradingRules: {
        minPassPercentage: 35,
        distinctionPercentage: 75,
        roundingRule: 'round',
        gradeBoundaries: [
          { grade: 'A+', minPercentage: 90 },
          { grade: 'A', minPercentage: 80 },
          { grade: 'B+', minPercentage: 70 },
          { grade: 'B', minPercentage: 60 },
          { grade: 'C+', minPercentage: 50 },
          { grade: 'C', minPercentage: 35 },
          { grade: 'NA', minPercentage: 0 },
        ],
      },
    }),
    [academicYear, className, subject, maxMarks, term1Max, term2Max]
  );

  const computeNormalRow = useCallback(
    (student) => {
      const cm = student.componentMarks || {};
      const readNum = (code) => {
        const entry = cm[code];
        if (!entry || entry.isAbsent || entry.isExempted || entry.status === 'ABSENT' || entry.status === 'EXEMPTED') {
          return 0;
        }
        const v = entry.rawMarks ?? entry.raw;
        if (v === '' || v === undefined || v === null) return 0;
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      };
      const hasAnyInput = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].some((code) => {
        const e = cm[code];
        if (!e) return false;
        if (e.isAbsent || e.isExempted) return true;
        const v = e.rawMarks ?? e.raw;
        return v !== '' && v !== undefined && v !== null;
      });

      const fa1 = readNum('FA1');
      const fa2 = readNum('FA2');
      const sa1 = readNum('SA1');
      const term1Total = fa1 + fa2 + sa1;
      const term1Pct = term1Max > 0 ? Math.round((term1Total / term1Max) * 1000) / 10 : 0;
      const term1Grade = hasAnyInput ? getGradeFromPercent(term1Pct) : 'NA';

      const fa3 = readNum('FA3');
      const fa4 = readNum('FA4');
      const sa2 = readNum('SA2');
      const term2Total = fa3 + fa4 + sa2;
      const term2Pct = term2Max > 0 ? Math.round((term2Total / term2Max) * 1000) / 10 : 0;
      const term2Grade = hasAnyInput ? getGradeFromPercent(term2Pct) : 'NA';

      const grandTotal =
        termView === 'term1' ? term1Total : termView === 'term2' ? term2Total : term1Total + term2Total;
      const pct = activeMaxTotal > 0 ? Math.round((grandTotal / activeMaxTotal) * 1000) / 10 : 0;
      const grade = hasAnyInput ? getGradeFromPercent(pct) : 'NA';
      const isPass = hasAnyInput && pct >= 35;

      return {
        ...student,
        componentMarks: {
          ...cm,
          TERM1_TOTAL: { rawMarks: term1Total, finalMarks: term1Total },
          TERM2_TOTAL: { rawMarks: term2Total, finalMarks: term2Total },
        },
        term1Total,
        term1Pct,
        term1Grade,
        term2Total,
        term2Pct,
        term2Grade,
        hasAnyInput,
        totalRaw: term1Total + term2Total,
        totalFinal: grandTotal,
        percentage: pct,
        grade,
        isPass,
        isDistinction: pct >= 75,
      };
    },
    [term1Max, term2Max, activeMaxTotal, termView]
  );

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      const res = await examApi.getExamRecords({
        className,
        section,
        subject,
        academicYear,
        templateId: NORMAL_TEMPLATE_ID,
      });

      const records = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (records.length > 0) {
        const rec = records[0];
        setExistingRecord(rec);
        const snapComps = rec.templateSnapshot?.components || [];
        if (snapComps.length > 0) {
          const restoredMax = { ...DEFAULT_MAX_MARKS };
          ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].forEach((code) => {
            const c = snapComps.find((item) => String(item.code).toUpperCase() === code);
            if (c && Number(c.maxRaw) > 0) restoredMax[code] = Number(c.maxRaw);
          });
          setMaxMarks(restoredMax);
        }
        if (rec.studentMarks && rec.studentMarks.length > 0) {
          setStudents(rec.studentMarks);
        }
      } else {
        setExistingRecord(null);
        // Load previously imported/saved students for this Class & Section if available
        try {
          const stuRes = await attendanceApi.getStudents({ className, section });
          const roster = stuRes?.students || stuRes?.data || [];
          if (Array.isArray(roster) && roster.length > 0) {
            setStudents(
              roster.map((s, idx) => ({
                studentId: s._id || s.id || `stu_${section}_${s.rollNumber || idx + 1}`,
                rollNumber: s.rollNumber || idx + 1,
                studentName: s.studentName,
                gender: s.gender || 'M',
                caste: s.caste || 'GEN',
                admissionNumber: s.admissionNumber || '',
                componentMarks: {},
              }))
            );
          } else {
            setStudents(generateDefaultNormalStudents(20, section));
          }
        } catch {
          setStudents(generateDefaultNormalStudents(20, section));
        }
      }
      setIsDirty(false);
    } catch (err) {
      console.warn('Failed to load normal marks record:', err);
    } finally {
      setLoading(false);
    }
  }, [className, section, subject, academicYear]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const editableKeys = useMemo(() => {
    if (termView === 'term1') return ['FA1', 'FA2', 'SA1'];
    if (termView === 'term2') return ['FA3', 'FA4', 'SA2'];
    return ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'];
  }, [termView]);

  const handleCellChange = (rowIndex, compCode, rawInput) => {
    if (existingRecord?.status === 'Finalized') return;
    const maxAllowed = Number(maxMarks[compCode]) || 100;
    const trimmed = String(rawInput ?? '').trim();
    const upper = trimmed.toUpperCase();
    const updated = [...students];
    const student = { ...updated[rowIndex] };
    const cm = { ...(student.componentMarks || {}) };

    if (upper === 'AB' || upper === 'ABSENT') {
      cm[compCode] = { rawMarks: 0, isAbsent: true, isExempted: false, isOverMax: false };
    } else if (upper === 'EX' || upper === 'EXEMPT') {
      cm[compCode] = { rawMarks: 0, isAbsent: false, isExempted: true, isOverMax: false };
    } else {
      const clean = trimmed.replace(/nan/gi, '').replace(/[^0-9.]/g, '');
      if (clean === '') {
        cm[compCode] = { rawMarks: '', isAbsent: false, isExempted: false, isOverMax: false };
      } else {
        const num = parseFloat(clean);
        const validNum = Number.isFinite(num) ? num : '';
        cm[compCode] = {
          rawMarks: validNum,
          isAbsent: false,
          isExempted: false,
          isOverMax: validNum !== '' && validNum > maxAllowed,
        };
      }
    }

    student.componentMarks = cm;
    updated[rowIndex] = student;
    setStudents(updated);
    setIsDirty(true);
  };

  const handleStudentFieldChange = (rowIndex, field, val) => {
    if (existingRecord?.status === 'Finalized') return;
    setStudents((prev) => {
      const updated = [...prev];
      if (updated[rowIndex]) {
        updated[rowIndex] = { ...updated[rowIndex], [field]: val };
      }
      return updated;
    });
    setIsDirty(true);
  };

  const handleKeyDown = (e, rIdx, colKey) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      const cIdx = editableKeys.indexOf(colKey);
      let targetR = rIdx;
      let targetC = cIdx;

      if (e.key === 'ArrowUp') targetR = Math.max(0, rIdx - 1);
      else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        targetR = Math.min(students.length - 1, rIdx + 1);
      } else if (e.key === 'ArrowLeft') targetC = Math.max(0, cIdx - 1);
      else if (e.key === 'ArrowRight') targetC = Math.min(editableKeys.length - 1, cIdx + 1);

      const nextKey = `${targetR}_${editableKeys[targetC]}`;
      if (cellRefs.current[nextKey]) {
        cellRefs.current[nextKey].focus();
        cellRefs.current[nextKey].select?.();
      }
    }
  };

  const handlePaste = (e, startRowIdx, startColKey) => {
    if (existingRecord?.status === 'Finalized') return;
    const clipboard = e.clipboardData.getData('text');
    if (!clipboard || (!clipboard.includes('\t') && !clipboard.includes('\n'))) return;

    e.preventDefault();
    const rows = clipboard.split(/\r\n|\n|\r/).filter((r) => r.length > 0);
    const startCIdx = editableKeys.indexOf(startColKey);
    const updated = [...students];

    rows.forEach((rowStr, rOffset) => {
      const targetR = startRowIdx + rOffset;
      if (targetR >= updated.length) return;
      const cells = rowStr.split('\t');
      const student = { ...updated[targetR] };
      const cm = { ...(student.componentMarks || {}) };

      cells.forEach((cellVal, cOffset) => {
        const targetC = startCIdx + cOffset;
        if (targetC >= editableKeys.length) return;
        const code = editableKeys[targetC];
        const trimmed = (cellVal || '').trim();
        const upper = trimmed.toUpperCase();
        if (upper === 'AB') {
          cm[code] = { rawMarks: 0, isAbsent: true, isExempted: false };
        } else if (upper === 'EX') {
          cm[code] = { rawMarks: 0, isExempted: true, isAbsent: false };
        } else {
          const clean = trimmed.replace(/nan/gi, '').replace(/[^0-9.]/g, '');
          const num = clean === '' ? '' : parseFloat(clean);
          cm[code] = { rawMarks: Number.isFinite(num) ? num : '', isAbsent: false, isExempted: false };
        }
      });

      student.componentMarks = cm;
      updated[targetR] = student;
    });

    setStudents(updated);
    setIsDirty(true);
    showToast(`Pasted ${rows.length} row(s) from clipboard.`, 'info');
  };

  const persistNormalRecord = async (targetStudents, syncMode = 'replace') => {
    const computedStudents = targetStudents.map(computeNormalRow);
    const templateSnapshot = buildCustomTemplateSnapshot();

    try {
      await examApi.syncStudents({
        className,
        section,
        students: computedStudents,
        mode: syncMode,
      });
    } catch (syncErr) {
      console.warn('Student roster sync warning:', syncErr);
    }

    let saved;
    if (existingRecord && existingRecord._id && existingRecord.status !== 'Finalized') {
      const updateRes = await examApi.updateExamRecord(existingRecord._id, {
        studentMarks: computedStudents,
        templateSnapshot,
      });
      saved = updateRes?.data?.data || updateRes?.data || updateRes;
    } else if (!existingRecord?._id) {
      const res = await examApi.createExamRecord({
        templateId: NORMAL_TEMPLATE_ID,
        examTitle: `${subject} - ${className} ${section} (Normal FA1-SA2 Register)`,
        academicYear,
        className,
        section,
        subject,
        initialStudents: computedStudents,
        customTemplateSnapshot: templateSnapshot,
      });
      saved = res?.data?.data || res?.data || res;
    } else {
      saved = existingRecord;
    }
    return saved;
  };

  const handleImportStudentsSuccess = async ({ students: importedRoster, mode, sheetName }) => {
    if (!importedRoster || importedRoster.length === 0) return;
    setStudents(importedRoster);
    try {
      setSaving(true);
      const saved = await persistNormalRecord(importedRoster, mode || 'replace');
      setExistingRecord(saved);
      if (saved?.studentMarks?.length > 0) setStudents(saved.studentMarks);
      setIsDirty(false);
      showToast(`Imported & saved ${importedRoster.length} student(s) from "${sheetName}"!`, 'success');
    } catch (err) {
      setIsDirty(true);
      showToast(`Imported students into table, but save failed: ${err.message}`, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const saved = await persistNormalRecord(students, 'replace');
      setExistingRecord(saved);
      if (saved?.studentMarks?.length > 0) setStudents(saved.studentMarks);
      setIsDirty(false);
      showToast('Normal marks register saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save normal marks register.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeMarks = async () => {
    try {
      setSaving(true);
      const saved = await persistNormalRecord(students, 'replace');
      const recId = saved?._id;
      const finRes = await examApi.finalizeExamRecord(recId);
      const finalized = finRes?.data?.data || finRes?.data || finRes;
      setExistingRecord(finalized);
      if (finalized?.studentMarks?.length > 0) setStudents(finalized.studentMarks);
      setConfirmFinalizeOpen(false);
      setIsDirty(false);
      showToast('Marks officially finalized and locked!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to finalize marks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudentRow = () => {
    const nextRoll = students.length > 0 ? Math.max(...students.map((s) => Number(s.rollNumber) || 0)) + 1 : 1;
    setStudents([
      ...students,
      {
        studentId: `stu_${section}_${nextRoll}_${Date.now()}`,
        rollNumber: nextRoll,
        studentName: `Student ${nextRoll}`,
        gender: nextRoll % 2 === 0 ? 'F' : 'M',
        caste: 'GEN',
        admissionNumber: '',
        componentMarks: {},
      },
    ]);
    setIsDirty(true);
  };

  const handleAddTwentyRows = () => {
    const startRoll = students.length > 0 ? Math.max(...students.map((s) => Number(s.rollNumber) || 0)) + 1 : 1;
    const newRows = Array.from({ length: 20 }, (_, i) => ({
      studentId: `stu_${section}_${startRoll + i}_${Date.now()}`,
      rollNumber: startRoll + i,
      studentName: `Student ${startRoll + i}`,
      gender: (startRoll + i) % 2 === 0 ? 'F' : 'M',
      caste: 'GEN',
      admissionNumber: '',
      componentMarks: {},
    }));
    setStudents([...students, ...newRows]);
    setIsDirty(true);
    showToast(`Added 20 rows. Total students: ${students.length + 20}.`, 'info');
  };

  const handleDeleteRow = (idx) => {
    if (existingRecord?.status === 'Finalized') return;
    setStudents(students.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const computedList = useMemo(() => students.map(computeNormalRow), [students, computeNormalRow]);
  const appearedStudents = useMemo(() => computedList.filter((s) => s.hasAnyInput), [computedList]);
  const passedStudents = useMemo(() => computedList.filter((s) => s.isPass), [computedList]);
  const failedStudents = useMemo(() => computedList.filter((s) => s.hasAnyInput && !s.isPass), [computedList]);
  const classAvg = useMemo(() => {
    return appearedStudents.length > 0
      ? Math.round((appearedStudents.reduce((acc, s) => acc + s.totalFinal, 0) / appearedStudents.length) * 10) / 10
      : 0;
  }, [appearedStudents]);
  const passRate = useMemo(() => {
    return appearedStudents.length > 0
      ? Math.round((passedStudents.length / appearedStudents.length) * 1000) / 10
      : 0;
  }, [appearedStudents, passedStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.studentName || '').toLowerCase().includes(q) ||
        String(s.rollNumber).includes(q) ||
        (s.admissionNumber || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const handleExportExcel = async () => {
    try {
      setExportingType('excel');
      let recId = existingRecord?._id;
      if (!recId || isDirty) {
        const saved = await persistNormalRecord(students, 'replace');
        setExistingRecord(saved);
        setIsDirty(false);
        recId = saved?._id;
      }
      const res = await examApi.downloadNormalExcelFormat(recId);
      downloadBlob(
        res,
        `Normal_Marks_${subject.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}_${section}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast('Normal marks Excel workbook downloaded!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export Excel workbook.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      const liveRecord = {
        ...(existingRecord || {}),
        className,
        section,
        subject,
        examTitle: `${subject} - ${className} ${section} (FA1, FA2, SA1 & FA3, FA4, SA2)`,
        academicYear,
        templateSnapshot: buildCustomTemplateSnapshot(),
        studentMarks: computedList,
        statistics: {
          totalStudents: computedList.length,
          appearedCount: appearedStudents.length,
          passedCount: passedStudents.length,
          failedCount: failedStudents.length,
          passPercentage: passRate,
          classAverage: classAvg,
        },
      };
      const res =
        existingRecord?._id && !isDirty
          ? await examApi.downloadClassRegisterPdf(existingRecord._id)
          : await examApi.downloadLiveRegisterPdf({ examRecord: liveRecord });
      downloadBlob(
        res,
        `Normal_Marks_Register_${subject.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}_${section}.pdf`,
        'application/pdf'
      );
      showToast('Class Marks Register PDF downloaded!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export PDF register.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const showTerm1 = termView === 'all' || termView === 'term1';
  const showTerm2 = termView === 'all' || termView === 'term2';

  return (
    <div className="space-y-4 max-w-full pb-20 select-none">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Normal Marks Entry (FA1, FA2, SA1 &amp; FA3, FA4, SA2)
                </h1>
                <Badge variant={existingRecord?.status === 'Finalized' ? 'success' : 'warning'}>
                  {existingRecord?.status === 'Finalized' ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Finalized &amp; Locked
                    </span>
                  ) : (
                    'Draft (Live Editing)'
                  )}
                </Badge>
                {isDirty && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                    ● Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Regular subject marks register • Term 1 (FA1, FA2, SA1) &amp; Term 2 (FA3, FA4, SA2 / S2) with auto totals &amp; grades
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/marks-entry')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition cursor-pointer"
              title="Switch to AI / NSQF Official Marks Entry"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              AI / NSQF Marks Entry
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={saving || existingRecord?.status === 'Finalized'}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>

            {existingRecord?.status !== 'Finalized' ? (
              <button
                onClick={() => setConfirmFinalizeOpen(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Save &amp; Lock Marks
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await examApi.unlockExamRecord(existingRecord._id);
                    showToast('Unlocked for editing.', 'info');
                    loadRecord();
                  } catch {
                    showToast('Failed to unlock record.', 'error');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition cursor-pointer"
              >
                <Unlock className="w-4 h-4" /> Unlock
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={exportingType === 'excel'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Export Excel (.xlsx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingType === 'pdf'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              PDF Register
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Print register"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-semibold">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Class
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
            >
              {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Subject
            </label>
            <input
              type="text"
              list="normal-subject-list"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-700"
            />
            <datalist id="normal-subject-list">
              {SUBJECT_SUGGESTIONS.map((sub) => (
                <option key={sub} value={sub} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Assessment View
            </label>
            <select
              value={termView}
              onChange={(e) => setTermView(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value="all">Full Year (FA1, FA2, SA1 &amp; FA3, FA4, SA2)</option>
              <option value="term1">Term 1 Only (FA1, FA2, SA1)</option>
              <option value="term2">Term 2 Only (FA3, FA4, SA2)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setShowMaxConfig((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              {showMaxConfig ? 'Hide Max Marks' : 'Edit Max Marks'}
            </button>
          </div>
        </div>

        {/* Optional Max Marks Configuration Row */}
        {showMaxConfig && (
          <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            {['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'].map((code) => (
              <div key={code}>
                <label className="text-[10px] font-bold text-indigo-900 uppercase block mb-1">
                  {code === 'SA2' ? 'SA2 (S2)' : code} Max Marks
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  disabled={existingRecord?.status === 'Finalized'}
                  value={maxMarks[code]}
                  onChange={(e) => {
                    setMaxMarks((prev) => ({ ...prev, [code]: Math.max(1, Number(e.target.value) || 1) }));
                    setIsDirty(true);
                  }}
                  className="w-full px-2.5 py-1 rounded-lg border border-indigo-300 bg-white font-bold text-indigo-950"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SUMMARY KPI BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Students: <span className="text-blue-700">{students.length}</span>
          </div>
          <div className="bg-emerald-50 px-3 py-1.5 rounded-xl font-bold text-emerald-800 border border-emerald-200">
            Passed: {passedStudents.length}
          </div>
          <div className="bg-rose-50 px-3 py-1.5 rounded-xl font-bold text-rose-800 border border-rose-200">
            Failed: {failedStudents.length}
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-xl font-bold text-indigo-800 border border-indigo-200">
            Pass Rate: {passRate}%
          </div>
          <div className="bg-blue-50 px-3 py-1.5 rounded-xl font-bold text-blue-900 border border-blue-200">
            Class Avg: {classAvg} / {activeMaxTotal}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 inline-block" />
            <span>Yellow = Editable Marks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block" />
            <span>Grey = Auto Total</span>
          </div>
          <button
            onClick={handleAddTwentyRows}
            className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 font-bold transition cursor-pointer"
          >
            + Add 20 Rows
          </button>
        </div>
      </div>

      {/* 3. SEARCH & ROSTER TOOLS */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="relative w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, roll, or adm no..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportStudentsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 font-bold text-blue-800 transition cursor-pointer shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Import Students from Excel
          </button>

          <button
            onClick={handleAddStudentRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Add Row
          </button>
        </div>
      </div>

      {/* 4. NORMAL MARKS ENTRY GRID (FA1, FA2, SA1 & FA3, FA4, SA2) */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-x-auto max-h-[75vh]">
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500">
            Loading marks register...
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse select-none">
            <thead className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
              <tr>
                <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-700 font-bold bg-slate-900">
                  Student Details
                </th>
                {showTerm1 && (
                  <th colSpan={5} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-blue-950 text-blue-200">
                    Term 1 (FA1 + FA2 + SA1 = {term1Max})
                  </th>
                )}
                {showTerm2 && (
                  <th colSpan={5} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-indigo-950 text-indigo-200">
                    Term 2 (FA3 + FA4 + SA2 = {term2Max})
                  </th>
                )}
                <th colSpan={4} className="py-2.5 px-2 text-center font-bold bg-slate-950 text-white">
                  Final Result ({activeMaxTotal})
                </th>
                <th className="py-2.5 px-2 bg-slate-950"></th>
              </tr>

              <tr className="bg-slate-800 text-slate-200 text-[11px] font-bold border-b border-slate-700">
                <th className="py-2 px-2 w-12 text-center sticky left-0 bg-slate-800 z-30">Sl</th>
                <th className="py-2 px-3 min-w-[180px] sticky left-12 bg-slate-800 z-30">Student Name</th>
                <th className="py-2 px-2 min-w-[90px] text-center">Adm No</th>
                <th className="py-2 px-2 w-14 text-center">Gender</th>
                <th className="py-2 px-2 w-16 text-center border-r border-slate-700">Caste</th>

                {showTerm1 && (
                  <>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      FA 1<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.FA1}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      FA 2<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.FA2}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      SA 1<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.SA1}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[75px] text-center bg-slate-800 text-white">
                      T1 Tot<div className="text-[10px] text-slate-400 font-normal">[{term1Max}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[60px] text-center border-r border-slate-700 bg-slate-800">
                      T1 Grd
                    </th>
                  </>
                )}

                {showTerm2 && (
                  <>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      FA 3<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.FA3}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      FA 4<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.FA4}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[78px] text-center bg-amber-900/40 text-amber-200">
                      SA 2 (S2)<div className="text-[10px] text-amber-300 font-normal">[{maxMarks.SA2}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[75px] text-center bg-slate-800 text-white">
                      T2 Tot<div className="text-[10px] text-slate-400 font-normal">[{term2Max}]</div>
                    </th>
                    <th className="py-1.5 px-2 min-w-[60px] text-center border-r border-slate-700 bg-slate-800">
                      T2 Grd
                    </th>
                  </>
                )}

                <th className="py-1.5 px-2 min-w-[80px] text-center bg-blue-950 text-blue-200">
                  Grand Tot.<div className="text-[10px] text-blue-300 font-normal">[{activeMaxTotal}]</div>
                </th>
                <th className="py-1.5 px-2 min-w-[65px] text-center bg-slate-900">%</th>
                <th className="py-1.5 px-2 min-w-[60px] text-center bg-slate-900">Grade</th>
                <th className="py-1.5 px-2 min-w-[65px] text-center bg-slate-900">Result</th>
                <th className="py-1.5 px-2 min-w-[65px] text-center bg-slate-900">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-400">
                    No students found matching search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, rIdx) => {
                  const realIdx = students.findIndex(
                    (s) => (stu.studentId && s.studentId === stu.studentId) || s.rollNumber === stu.rollNumber
                  );
                  const targetIdx = realIdx >= 0 ? realIdx : rIdx;
                  const computed = computeNormalRow(stu);
                  const cm = stu.componentMarks || {};

                  const renderEditableCell = (compCode) => {
                    const entry = cm[compCode] || {};
                    let val = entry.rawMarks;
                    if (entry.isAbsent) val = 'AB';
                    else if (entry.isExempted) val = 'EX';
                    if (val === undefined || val === null || val === '' || Number.isNaN(val) || String(val) === 'NaN') {
                      val = '';
                    }
                    const maxAllowed = Number(maxMarks[compCode]) || 100;
                    const isOver = entry.isOverMax || (val !== '' && !entry.isAbsent && !entry.isExempted && Number(val) > maxAllowed);

                    return (
                      <input
                        ref={(el) => (cellRefs.current[`${targetIdx}_${compCode}`] = el)}
                        type="text"
                        disabled={existingRecord?.status === 'Finalized'}
                        value={val}
                        onChange={(e) => handleCellChange(targetIdx, compCode, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, targetIdx, compCode)}
                        onPaste={(e) => handlePaste(e, targetIdx, compCode)}
                        placeholder="-"
                        className={`w-full h-8 text-center font-bold text-xs rounded border transition ${
                          entry.isAbsent
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : entry.isExempted
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : isOver
                            ? 'bg-red-100 text-red-700 border-red-500 ring-1 ring-red-400'
                            : 'bg-amber-50/70 hover:bg-amber-100/50 focus:bg-white text-blue-900 border-amber-300/80 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        }`}
                        title={isOver ? `Warning: Exceeds max of ${maxAllowed}` : undefined}
                      />
                    );
                  };

                  return (
                    <tr
                      key={stu.studentId || targetIdx}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-1 px-2 text-center text-slate-500 font-bold sticky left-0 bg-inherit z-10 border-r border-slate-200">
                        {stu.rollNumber}
                      </td>
                      <td className="py-1 px-3 sticky left-12 bg-inherit z-10 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={existingRecord?.status === 'Finalized'}
                          value={stu.studentName}
                          onChange={(e) => handleStudentFieldChange(targetIdx, 'studentName', e.target.value)}
                          className="w-full font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                        />
                      </td>
                      <td className="py-1 px-2 text-center">
                        <input
                          type="text"
                          disabled={existingRecord?.status === 'Finalized'}
                          value={stu.admissionNumber || ''}
                          placeholder="-"
                          onChange={(e) => handleStudentFieldChange(targetIdx, 'admissionNumber', e.target.value)}
                          className="w-full text-center text-[11px] text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-1 px-1 text-center">
                        <select
                          disabled={existingRecord?.status === 'Finalized'}
                          value={stu.gender || 'M'}
                          onChange={(e) => handleStudentFieldChange(targetIdx, 'gender', e.target.value)}
                          className="bg-transparent text-[11px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <select
                          disabled={existingRecord?.status === 'Finalized'}
                          value={stu.caste || 'GEN'}
                          onChange={(e) => handleStudentFieldChange(targetIdx, 'caste', e.target.value)}
                          className="bg-transparent text-[10px] font-bold text-slate-600 focus:outline-none cursor-pointer"
                        >
                          <option value="GEN">GEN</option>
                          <option value="OBC">OBC</option>
                          <option value="SC">SC</option>
                          <option value="ST">ST</option>
                        </select>
                      </td>

                      {showTerm1 && (
                        <>
                          <td className="p-1">{renderEditableCell('FA1')}</td>
                          <td className="p-1">{renderEditableCell('FA2')}</td>
                          <td className="p-1">{renderEditableCell('SA1')}</td>
                          <td className="p-1 text-center font-bold text-slate-800 bg-slate-100/70 border-x border-slate-200">
                            {computed.term1Total}
                          </td>
                          <td className="p-1 text-center font-bold text-slate-700 bg-slate-100/70 border-r border-slate-200">
                            {computed.term1Grade}
                          </td>
                        </>
                      )}

                      {showTerm2 && (
                        <>
                          <td className="p-1">{renderEditableCell('FA3')}</td>
                          <td className="p-1">{renderEditableCell('FA4')}</td>
                          <td className="p-1">{renderEditableCell('SA2')}</td>
                          <td className="p-1 text-center font-bold text-slate-800 bg-slate-100/70 border-x border-slate-200">
                            {computed.term2Total}
                          </td>
                          <td className="p-1 text-center font-bold text-slate-700 bg-slate-100/70 border-r border-slate-200">
                            {computed.term2Grade}
                          </td>
                        </>
                      )}

                      <td className="p-1 text-center font-black text-sm text-blue-700 bg-blue-100/50 border-r border-blue-200">
                        {computed.totalFinal}
                      </td>
                      <td className="p-1 text-center font-bold text-slate-700">
                        {computed.percentage}%
                      </td>
                      <td className="p-1 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black ${
                            ['A+', 'A'].includes(computed.grade)
                              ? 'bg-emerald-100 text-emerald-800'
                              : ['B+', 'B'].includes(computed.grade)
                              ? 'bg-blue-100 text-blue-800'
                              : ['C+', 'C'].includes(computed.grade)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {computed.grade}
                        </span>
                      </td>
                      <td className="p-1 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            computed.isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {computed.hasAnyInput ? (computed.isPass ? 'PASS' : 'FAIL') : '—'}
                        </span>
                      </td>
                      <td className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedStudentForReport(computed);
                              setReportModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                            title="View report card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {existingRecord?.status !== 'Finalized' && (
                            <button
                              onClick={() => handleDeleteRow(targetIdx)}
                              className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Import Students Roster Modal */}
      <ImportStudentsModal
        isOpen={importStudentsModalOpen}
        onClose={() => setImportStudentsModalOpen(false)}
        onImportSuccess={handleImportStudentsSuccess}
        currentStudents={students}
        className={className}
        section={section}
      />

      {/* Report Card Modal */}
      <ReportCardPreviewModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setSelectedStudentForReport(null);
        }}
        examRecord={
          existingRecord || {
            examTitle: `${subject} Normal Assessment (FA1-SA2)`,
            className,
            section,
            subject,
            academicYear,
            templateSnapshot: buildCustomTemplateSnapshot(),
          }
        }
        student={selectedStudentForReport}
      />

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmFinalizeOpen}
        onClose={() => setConfirmFinalizeOpen(false)}
        onConfirm={handleFinalizeMarks}
        title="Lock & Finalize Examination Marks?"
        message="This will officially lock these FA1, FA2, SA1 & FA3, FA4, SA2 marks and generate permanent board-ready records."
        confirmText="Lock Marks"
        type="primary"
        loading={saving}
      />
    </div>
  );
};

export default NormalMarksEntryPage;
