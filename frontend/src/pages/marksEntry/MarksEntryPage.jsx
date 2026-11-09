import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Save,
  Lock,
  Unlock,
  Download,
  Upload,
  Printer,
  FileText,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ReportCardPreviewModal } from '../exams/ReportCardPreviewModal';
import { ImportExcelModal } from './ImportExcelModal';
import { ImportStudentsModal } from './ImportStudentsModal';
import { downloadBlob } from '../../utils/fileDownload';

// Lookup Grade based on Grade Ref sheet
export const getFaGrade = (mark) => {
  const m = Number(mark) || 0;
  if (m >= 45) return 'A+';
  if (m >= 40) return 'A';
  if (m >= 35) return 'B+';
  if (m >= 30) return 'B';
  if (m >= 25) return 'C+';
  if (m >= 18) return 'C';
  return 'NA';
};

export const getSaGrade = (mark) => {
  const m = Number(mark) || 0;
  if (m >= 90) return 'A+';
  if (m >= 80) return 'A';
  if (m >= 70) return 'B+';
  if (m >= 60) return 'B';
  if (m >= 50) return 'C+';
  if (m >= 35) return 'C';
  return 'NA';
};

// Initial sample 40 students matching workbook structure
export const generateDefaultStudents = (count = 40, section = 'A') => {
  return Array.from({ length: count }, (_, i) => {
    const roll = i + 1;
    const isSample = i === 0;
    return {
      studentId: `stu_${section}_${roll}`,
      rollNumber: roll,
      studentName: isSample ? 'Sample (abb / XYZ)' : `Student ${roll}`,
      gender: roll % 2 === 0 ? 'F' : 'M',
      caste: roll % 3 === 0 ? 'OBC' : roll % 4 === 0 ? 'SC/ST' : 'GEN',
      admissionNumber: `ADM-${roll}`,
      componentMarks: {
        FA1_ACT1: { rawMarks: isSample ? 12 : '' },
        FA1_ACT2: { rawMarks: isSample ? 15 : '' },
        FA1_TEST: { rawMarks: isSample ? 12 : '' },
        FA2_ACT1: { rawMarks: isSample ? 15 : '' },
        FA2_ACT2: { rawMarks: isSample ? 5 : '' },
        FA2_TEST: { rawMarks: isSample ? 5 : '' },
        SA1_TH_RAW: { rawMarks: isSample ? 35 : '' },
        SA1_PR_HANDS: { rawMarks: isSample ? 25 : '' },
        SA1_PR_PORT: { rawMarks: isSample ? 10 : '' },
        SA1_PR_VIVA: { rawMarks: isSample ? 10 : '' },
      },
      totalRaw: isSample ? 129 : 0,
      totalFinal: isSample ? 76 : 0,
      percentage: isSample ? 76 : 0,
      grade: isSample ? 'B+' : 'NA',
      isPass: isSample,
    };
  });
};

export const MarksEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Top Selector Controls
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [className, setClassName] = useState('Class 9');
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState('Artificial Intelligence');
  const [assessmentTerm, setAssessmentTerm] = useState('term1'); // 'term1' | 'fa1' | 'fa2' | 'sa1' | 'consolidated'
  const [selectedTemplateId, setSelectedTemplateId] = useState('preset_ai_nsqf_standard');

  // Application State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [existingRecord, setExistingRecord] = useState(null);
  const [students, setStudents] = useState(() => generateDefaultStudents(40, 'A'));
  const [searchQuery, setSearchQuery] = useState('');
  const [importedSectionsData, setImportedSectionsData] = useState(null);

  // Guard against loadExamRecord overwriting freshly imported Excel data
  const isImportingRef = useRef(false);

  // Modals & Export States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStudentsModalOpen, setImportStudentsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [exportingType, setExportingType] = useState(null);

  // References for keyboard cell navigation
  const cellRefs = useRef({});

  // 1. Fetch available templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await examApi.getTemplates();
        if (res.data?.data) {
          setTemplates(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  // 2. Load or initialize record when class/section/term changes
  const loadExamRecord = useCallback(async () => {
    if (isImportingRef.current) {
      isImportingRef.current = false;
      return;
    }
    try {
      setLoading(true);
      const res = await examApi.getExamRecords({
        className,
        section,
        subject,
        academicYear,
      });

      const records = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res) ? res : (res?.data?.data || []));

      if (records.length > 0) {
        // Prioritize the record with the most authentic student entries and latest updated
        const sorted = [...records].sort((a, b) => {
          const aCount = a.studentMarks?.length || 0;
          const bCount = b.studentMarks?.length || 0;
          if (aCount !== bCount) return bCount - aCount;
          return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });
        const record = sorted[0];
        setExistingRecord(record);
        if (record.studentMarks && record.studentMarks.length > 0) {
          setStudents(record.studentMarks.map(computeStudentRow));
        }
      } else {
        setExistingRecord(null);
        setStudents(generateDefaultStudents(40, section));
      }
      setIsDirty(false);
    } catch (err) {
      console.warn('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, [className, section, subject, academicYear]);

  useEffect(() => {
    loadExamRecord();
  }, [loadExamRecord]);

  // Warn on unsaved changes
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

  // Real-time calculation for a student row
  const computeStudentRow = (student) => {
    const cm = student.componentMarks || {};

    const getVal = (code) => {
      const entry = cm[code];
      if (!entry) return 0;
      if (entry.isAbsent || entry.status === 'ABSENT') return 'AB';
      if (entry.isExempted || entry.status === 'EXEMPTED') return 'EX';
      const num = Number(entry.rawMarks ?? entry.raw);
      return Number.isFinite(num) ? num : 0;
    };

    const numOnly = (v) => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const parsed = parseFloat(v);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    // FA1
    const fa1_1 = getVal('FA1_ACT1');
    const fa1_2 = getVal('FA1_ACT2');
    const fa1_test = getVal('FA1_TEST');
    const fa1_tot = numOnly(fa1_1) + numOnly(fa1_2) + numOnly(fa1_test);
    const fa1_grade = getFaGrade(fa1_tot);

    // FA2
    const fa2_1 = getVal('FA2_ACT1');
    const fa2_2 = getVal('FA2_ACT2');
    const fa2_test = getVal('FA2_TEST');
    const fa2_tot = numOnly(fa2_1) + numOnly(fa2_2) + numOnly(fa2_test);
    const fa2_grade = getFaGrade(fa2_tot);

    // FA Aggregate & IA 20%
    const fa_agg = fa1_tot + fa2_tot;
    const ia_20 = Math.round(fa_agg * 0.2);

    // SA1 Theory 60 -> 30
    const th_raw = getVal('SA1_TH_RAW');
    const th_30 = Math.round(numOnly(th_raw) / 2);

    // SA1 Practical 50
    const pr_hands = getVal('SA1_PR_HANDS');
    const pr_port = getVal('SA1_PR_PORT');
    const pr_viva = getVal('SA1_PR_VIVA');
    const pr_tot = numOnly(pr_hands) + numOnly(pr_port) + numOnly(pr_viva);

    // Theory + Practical 80
    const th_pr_80 = th_30 + pr_tot;

    // Grand Total 100
    const grand_tot = ia_20 + th_pr_80;
    const grand_grade = getSaGrade(grand_tot);
    const isPass = grand_tot >= 35;

    return {
      ...student,
      componentMarks: {
        ...cm,
        FA1_TOTAL: { rawMarks: fa1_tot, finalMarks: fa1_tot },
        FA2_TOTAL: { rawMarks: fa2_tot, finalMarks: fa2_tot },
        FA_AGG: { rawMarks: fa_agg, finalMarks: fa_agg },
        IA_20: { rawMarks: fa_agg, finalMarks: ia_20 },
        SA1_TH_30: { rawMarks: th_raw, finalMarks: th_30 },
        SA1_PR_TOTAL: { rawMarks: pr_tot, finalMarks: pr_tot },
        SA1_TH_PR_80: { rawMarks: th_pr_80, finalMarks: th_pr_80 },
      },
      fa1Total: Number.isFinite(fa1_tot) ? fa1_tot : 0,
      fa1Grade: fa1_grade,
      fa2Total: Number.isFinite(fa2_tot) ? fa2_tot : 0,
      fa2Grade: fa2_grade,
      faAggTotal: Number.isFinite(fa_agg) ? fa_agg : 0,
      ia20: Number.isFinite(ia_20) ? ia_20 : 0,
      th30: Number.isFinite(th_30) ? th_30 : 0,
      prTotal: Number.isFinite(pr_tot) ? pr_tot : 0,
      thPr80: Number.isFinite(th_pr_80) ? th_pr_80 : 0,
      totalRaw: numOnly(fa1_1) + numOnly(fa1_2) + numOnly(fa1_test) + numOnly(fa2_1) + numOnly(fa2_2) + numOnly(fa2_test) + numOnly(th_raw) + numOnly(pr_hands) + numOnly(pr_port) + numOnly(pr_viva),
      totalFinal: Number.isFinite(grand_tot) ? grand_tot : 0,
      percentage: Number.isFinite(grand_tot) ? grand_tot : 0,
      grade: grand_grade,
      isPass,
      isDistinction: grand_tot >= 75,
    };
  };

  // Editable Cell Change Handler
  const handleCellChange = (rowIndex, compCode, rawInput, maxAllowed) => {
    if (existingRecord?.status === 'Finalized') return;

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
      // Strip out 'nan' and non-numeric characters (allow numbers and single decimal dot)
      const clean = trimmed.replace(/nan/gi, '').replace(/[^0-9.]/g, '');
      if (clean === '') {
        cm[compCode] = {
          rawMarks: '',
          isAbsent: false,
          isExempted: false,
          isOverMax: false,
        };
      } else {
        const num = parseFloat(clean);
        const validNum = Number.isFinite(num) ? num : '';
        cm[compCode] = {
          rawMarks: validNum,
          isAbsent: false,
          isExempted: false,
          isOverMax: validNum !== '' && maxAllowed && validNum > maxAllowed,
        };
      }
    }

    student.componentMarks = cm;
    updated[rowIndex] = computeStudentRow(student);
    setStudents(updated);
    setIsDirty(true);
  };

  // Student field (Name, Roll, Gender, Caste) edit
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

  // Keyboard navigation
  const handleKeyDown = (e, rIdx, colKey, allKeys) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      const cIdx = allKeys.indexOf(colKey);
      let targetR = rIdx;
      let targetC = cIdx;

      if (e.key === 'ArrowUp') {
        targetR = Math.max(0, rIdx - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        targetR = Math.min(students.length - 1, rIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        targetC = Math.max(0, cIdx - 1);
      } else if (e.key === 'ArrowRight') {
        targetC = Math.min(allKeys.length - 1, cIdx + 1);
      }

      const nextKey = `${targetR}_${allKeys[targetC]}`;
      if (cellRefs.current[nextKey]) {
        cellRefs.current[nextKey].focus();
        cellRefs.current[nextKey].select?.();
      }
    }
  };

  // Excel Paste across multiple rows/columns
  const handlePaste = (e, startRowIdx, startColKey, allKeys) => {
    if (existingRecord?.status === 'Finalized') return;
    const clipboard = e.clipboardData.getData('text');
    if (!clipboard || (!clipboard.includes('\t') && !clipboard.includes('\n'))) return;

    e.preventDefault();
    const rows = clipboard.split(/\r\n|\n|\r/).filter((r) => r.length > 0);
    const startCIdx = allKeys.indexOf(startColKey);
    const updated = [...students];

    rows.forEach((rowStr, rOffset) => {
      const targetR = startRowIdx + rOffset;
      if (targetR >= updated.length) return;

      const cells = rowStr.split('\t');
      const student = { ...updated[targetR] };
      const cm = { ...(student.componentMarks || {}) };

      cells.forEach((cellVal, cOffset) => {
        const targetC = startCIdx + cOffset;
        if (targetC >= allKeys.length) return;

        const code = allKeys[targetC];
        const trimmed = (cellVal || '').trim();
        const upper = trimmed.toUpperCase();
        if (upper === 'AB') {
          cm[code] = { rawMarks: 0, isAbsent: true, isExempted: false };
        } else if (upper === 'EX') {
          cm[code] = { rawMarks: 0, isExempted: true, isAbsent: false };
        } else {
          const clean = trimmed.replace(/nan/gi, '').replace(/[^0-9.]/g, '');
          const num = clean === '' ? '' : parseFloat(clean);
          cm[code] = {
            rawMarks: Number.isFinite(num) ? num : '',
            isAbsent: false,
            isExempted: false,
          };
        }
      });

      student.componentMarks = cm;
      updated[targetR] = computeStudentRow(student);
    });

    setStudents(updated);
    setIsDirty(true);
    showToast(`Pasted ${rows.length} rows from Excel clipboard.`, 'info');
  };

  // Action: Add student row (allowing 60+ students)
  const handleAddStudentRow = () => {
    const nextRoll = students.length > 0 ? Math.max(...students.map((s) => Number(s.rollNumber) || 0)) + 1 : 1;
    const newStudent = {
      studentId: `stu_${section}_${nextRoll}_${Date.now()}`,
      rollNumber: nextRoll,
      studentName: `Student ${nextRoll}`,
      gender: nextRoll % 2 === 0 ? 'F' : 'M',
      caste: 'GEN',
      admissionNumber: `ADM-${nextRoll}`,
      componentMarks: {},
      totalRaw: 0,
      totalFinal: 0,
      percentage: 0,
      grade: 'NA',
      isPass: false,
    };
    setStudents([...students, computeStudentRow(newStudent)]);
    setIsDirty(true);
  };

  // Action: Add 20 rows (to easily test/handle 60 students)
  const handleAddTwentyRows = () => {
    const startRoll = students.length + 1;
    const newRows = Array.from({ length: 20 }, (_, i) => {
      const roll = startRoll + i;
      return computeStudentRow({
        studentId: `stu_${section}_${roll}_${Date.now()}`,
        rollNumber: roll,
        studentName: `Student ${roll}`,
        gender: roll % 2 === 0 ? 'F' : 'M',
        caste: 'GEN',
        admissionNumber: `ADM-${roll}`,
        componentMarks: {},
        totalRaw: 0,
        totalFinal: 0,
        percentage: 0,
        grade: 'NA',
        isPass: false,
      });
    });
    setStudents([...students, ...newRows]);
    setIsDirty(true);
    showToast(`Added 20 rows. Total students: ${students.length + 20}.`, 'info');
  };

  // Delete student row
  const handleDeleteRow = (index) => {
    if (existingRecord?.status === 'Finalized') return;
    setStudents(students.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Handle Section Change with Multi-Section Excel auto-switch
  const handleSectionChange = (newSec) => {
    if (importedSectionsData && importedSectionsData[newSec]?.students?.length > 0) {
      isImportingRef.current = true;
      setSection(newSec);
      setStudents(importedSectionsData[newSec].students.map(computeStudentRow));
      setIsDirty(true);
      showToast(
        `Auto-loaded ${importedSectionsData[newSec].students.length} student(s) from imported workbook for Section ${newSec}!`,
        'info'
      );
    } else {
      setSection(newSec);
    }
  };

  // Handle Universal Excel Import Result
  const handleImportSuccess = ({
    students: importedStudents,
    className: importedClass,
    section: importedSection,
    allSections,
    sheetName,
  }) => {
    isImportingRef.current = true;
    if (importedClass) setClassName(importedClass);
    if (importedSection) setSection(importedSection);
    if (allSections) setImportedSectionsData(allSections);

    if (importedStudents && importedStudents.length > 0) {
      setStudents(importedStudents.map(computeStudentRow));
    }
    setIsDirty(true);
    showToast(
      `Auto-filled ${importedClass || className} – Section ${importedSection || section} with ${importedStudents?.length || 0} student(s) from "${sheetName}"! Totals, IA 20%, and grades calculated automatically.`,
      'success'
    );
  };

  // Import Students from Excel handler (exact count roster population)
  const handleImportStudentsSuccess = ({ students: importedRoster, importedCount, mode, sheetName }) => {
    isImportingRef.current = true;
    if (importedRoster && importedRoster.length > 0) {
      setStudents(importedRoster.map(computeStudentRow));
      setIsDirty(true);
      showToast(
        `Populated student register with exactly ${importedRoster.length} students from "${sheetName}"!`,
        'success'
      );
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const computedStudents = students.map(computeStudentRow);

      if (existingRecord && existingRecord._id) {
        const updateRes = await examApi.updateExamRecord(existingRecord._id, {
          studentMarks: computedStudents,
        });
        const saved = updateRes?.data?.data || updateRes?.data || updateRes;
        setExistingRecord(saved);
        if (saved?.studentMarks && saved.studentMarks.length > 0) {
          setStudents(saved.studentMarks.map(computeStudentRow));
        }
        showToast('Marks draft updated successfully!', 'success');
      } else {
        const res = await examApi.createExamRecord({
          templateId: selectedTemplateId,
          examTitle: `${subject} - ${className} ${section} (AI/NSQF Official Sheet)`,
          academicYear,
          className,
          section,
          subject,
          initialStudents: computedStudents,
        });
        const saved = res?.data?.data || res?.data || res;
        setExistingRecord(saved);
        if (saved?.studentMarks && saved.studentMarks.length > 0) {
          setStudents(saved.studentMarks.map(computeStudentRow));
        }
        showToast('Marks record initialized and saved!', 'success');
      }
      setIsDirty(false);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save marks draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Finalize & Lock Marks
  const handleFinalizeMarks = async () => {
    try {
      setSaving(true);
      const computedStudents = students.map(computeStudentRow);

      let recordId = existingRecord?._id;
      if (!recordId) {
        const res = await examApi.createExamRecord({
          templateId: selectedTemplateId,
          examTitle: `${subject} - ${className} ${section} (AI/NSQF Official Sheet)`,
          academicYear,
          className,
          section,
          subject,
          initialStudents: computedStudents,
        });
        const saved = res?.data?.data || res?.data || res;
        recordId = saved?._id;
        setExistingRecord(saved);
      } else {
        const updateRes = await examApi.updateExamRecord(recordId, { studentMarks: computedStudents });
        const saved = updateRes?.data?.data || updateRes?.data || updateRes;
        setExistingRecord(saved);
      }

      const finRes = await examApi.finalizeExamRecord(recordId);
      const finalized = finRes?.data?.data || finRes?.data || finRes;
      setExistingRecord(finalized);
      if (finalized?.studentMarks && finalized.studentMarks.length > 0) {
        setStudents(finalized.studentMarks.map(computeStudentRow));
      }
      showToast('Examination marks officially finalized and locked!', 'success');
      setConfirmFinalizeOpen(false);
      setIsDirty(false);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to finalize marks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export Excel matching format
  const handleExportExcel = async () => {
    try {
      setExportingType('excel');
      let recId = existingRecord?._id;
      if (!recId || isDirty) {
        // Save first so export matches current screen
        await handleSaveDraft();
        recId = existingRecord?._id;
      }

      let res;
      if (recId) {
        res = await examApi.downloadNsqfExcelFormat(recId);
      } else {
        res = await examApi.downloadExcelFormatTemplate({ className, section });
      }

      downloadBlob(
        res,
        `AI_NSQF_Marks_Entry_${className}_Section_${section}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast('Excel workbook downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export Excel workbook.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  // Download Blank Excel Format Template
  const handleDownloadBlankTemplate = async () => {
    try {
      setExportingType('template');
      const res = await examApi.downloadExcelFormatTemplate({ className, section });
      downloadBlob(
        res,
        'AI_NSQF_Marks_Entry_Template.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast('Excel template downloaded.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download Excel template.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.studentName || '').toLowerCase().includes(q) ||
        String(s.rollNumber).includes(q)
    );
  }, [students, searchQuery]);

  // Compute Class Summary Statistics
  const totalStudentsCount = students.length;
  const computedList = useMemo(() => students.map(computeStudentRow), [students]);
  const appearedStudents = useMemo(() => computedList.filter((s) => s.totalRaw > 0), [computedList]);
  const passedStudents = useMemo(() => computedList.filter((s) => s.isPass), [computedList]);
  const failedStudents = useMemo(() => computedList.filter((s) => s.totalRaw > 0 && !s.isPass), [computedList]);
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

  // Grade Counts
  const gradeCounts = useMemo(() => {
    const counts = { 'A+': 0, A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, NA: 0 };
    computedList.forEach((s) => {
      if (counts[s.grade] !== undefined) counts[s.grade]++;
    });
    return counts;
  }, [computedList]);

  // Export Landscape Register PDF
  const handleExportPdf = async () => {
    try {
      setExportingType('pdf');
      const liveRecord = {
        ...(existingRecord || {}),
        className,
        section,
        subject,
        examTitle: existingRecord?.examTitle || `${subject} - ${className} ${section} (Class Tabulation Sheet)`,
        academicYear,
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

      let res;
      if (existingRecord?._id && !isDirty) {
        res = await examApi.downloadClassRegisterPdf(existingRecord._id);
      } else {
        res = await examApi.downloadLiveRegisterPdf({ examRecord: liveRecord });
      }

      downloadBlob(
        res,
        `Class_Register_${className.replace(/\s+/g, '_')}_Section_${section}.pdf`,
        'application/pdf'
      );
      showToast('Class Marks Register PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export PDF register.', 'error');
    } finally {
      setExportingType(null);
    }
  };

  // Ordered list of editable input keys for keyboard navigation
  const editableKeys = [
    'FA1_ACT1',
    'FA1_ACT2',
    'FA1_TEST',
    'FA2_ACT1',
    'FA2_ACT2',
    'FA2_TEST',
    'SA1_TH_RAW',
    'SA1_PR_HANDS',
    'SA1_PR_PORT',
    'SA1_PR_VIVA',
  ];

  return (
    <div className="space-y-4 max-w-full pb-20 select-none">
      {/* 1. TOP SELECTOR & CONFIGURATION BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Marks Entry Spreadsheet
                </h1>
                <Badge variant={existingRecord?.status === 'Finalized' ? 'success' : 'warning'}>
                  {existingRecord?.status === 'Finalized' ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Finalized & Locked
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
                Exact Department AI/NSQF Karnataka & CBSE format • Yellow cells = editable marks, Grey cells = automatic formulas
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={saving || existingRecord?.status === 'Finalized'}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Save draft marks"
            >
              <Save className="w-4 h-4 text-slate-500" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>

            {existingRecord?.status !== 'Finalized' ? (
              <button
                onClick={() => setConfirmFinalizeOpen(true)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition cursor-pointer"
                title="Lock and finalize marks officially"
              >
                <Lock className="w-4 h-4" />
                Save & Lock Marks
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await examApi.unlockExamRecord(existingRecord._id);
                    showToast('Unlocked for editing.', 'info');
                    loadExamRecord();
                  } catch (e) {
                    showToast('Failed to unlock record.', 'error');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition cursor-pointer"
              >
                <Unlock className="w-4 h-4" /> Unlock
              </button>
            )}

            {/* Excel Import / Export Tools */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              title="Upload your AI_NSQF Excel file to auto-populate marks"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Import Excel
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exportingType === 'excel'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              title="Export exact workbook matching Copy of AI_NSQF format"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Export Excel (.xlsx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingType === 'pdf'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              title="Download landscape PDF class register"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              PDF Register
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Print spreadsheet"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters & Dropdown Selectors */}
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
              <option value="Class 9">Class 9 (9th)</option>
              <option value="Class 10">Class 10 (10th)</option>
              <option value="Class 11">Class 11 (11th)</option>
              <option value="Class 12">Class 12 (12th)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => handleSectionChange(e.target.value)}
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-blue-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Assessment Term
            </label>
            <select
              value={assessmentTerm}
              onChange={(e) => setAssessmentTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value="term1">Term 1 (FA1+FA2+SA1)</option>
              <option value="fa1">FA 1 Only (50)</option>
              <option value="fa2">FA 2 Only (50)</option>
              <option value="sa1">SA 1 Only (100)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Template Engine
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-700 truncate"
            >
              <option value="preset_ai_nsqf_standard">AI / NSQF Official (Default)</option>
              {templates.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.templateName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY KPI & EXCEL COLOR LEGEND BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 text-xs">
        {/* KPI Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Students: <span className="text-blue-700">{totalStudentsCount}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold text-emerald-800 border border-emerald-200">
            Passed: {passedStudents.length}
          </div>

          <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl font-bold text-rose-800 border border-rose-200">
            Failed: {failedStudents.length}
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl font-bold text-indigo-800 border border-indigo-200">
            Pass Rate: {passRate}%
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl font-bold text-blue-900 border border-blue-200">
            Class Average: {classAvg} / 100
          </div>
        </div>

        {/* Excel Color Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-400 inline-block" />
            <span>Yellow = Editable (Teacher Input)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block" />
            <span>Grey = Auto Formula</span>
          </div>
          <button
            onClick={handleAddTwentyRows}
            className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 font-bold transition cursor-pointer"
            title="Expand roster with 20 rows up to 60+ students"
          >
            + Add 20 Rows (Up to 60)
          </button>
        </div>
      </div>

      {/* 3. SEARCH & TABLE QUICK CONTROLS */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or roll..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportStudentsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 font-bold text-blue-800 transition cursor-pointer shadow-2xs"
            title="Import student roster from Excel (.xlsx, .xls) or CSV"
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

          <button
            onClick={handleDownloadBlankTemplate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 font-semibold text-slate-600 cursor-pointer"
            title="Download offline template"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Template
          </button>
        </div>
      </div>

      {/* 4. EXCEL-STYLE FULL DATA GRID */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-x-auto max-h-[75vh]">
        <table className="w-full text-xs text-left border-collapse select-none">
          {/* Header Level 1: Main Groups */}
          <thead className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
            <tr>
              <th colSpan={4} className="py-2.5 px-3 text-center border-r border-slate-700 font-bold bg-slate-900">
                Student Details (ವಿದ್ಯಾರ್ಥಿ ವಿವರ)
              </th>
              <th colSpan={5} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-blue-950 text-blue-200">
                FA 1 (Formative Assessment 1 - Max 50)
              </th>
              <th colSpan={5} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-indigo-950 text-indigo-200">
                FA 2 (Formative Assessment 2 - Max 50)
              </th>
              <th colSpan={2} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-amber-950 text-amber-200">
                FA1+FA2 (IA 20%)
              </th>
              <th colSpan={9} className="py-2.5 px-2 text-center border-r border-slate-700 font-bold bg-emerald-950 text-emerald-200">
                SA 1 (Summative Assessment 1 - Theory 30 + Practical 50 = 80)
              </th>
              <th colSpan={3} className="py-2.5 px-2 text-center font-bold bg-slate-950 text-white">
                Final Assessment (100)
              </th>
              <th className="py-2.5 px-2 text-center bg-slate-950"></th>
            </tr>

            {/* Header Level 2: Component Names & Max Marks */}
            <tr className="bg-slate-800 text-slate-200 text-[11px] font-bold border-b border-slate-700">
              {/* Frozen Left Columns */}
              <th className="py-2 px-2 w-12 text-center sticky left-0 bg-slate-800 z-30">Sl</th>
              <th className="py-2 px-3 min-w-[180px] sticky left-12 bg-slate-800 z-30">Student Name</th>
              <th className="py-2 px-2 w-16 text-center">Gender</th>
              <th className="py-2 px-2 w-16 text-center border-r border-slate-700">Caste</th>

              {/* FA1 Columns */}
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Act 1<div className="text-[10px] text-amber-300 font-normal">[15]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Act 2<div className="text-[10px] text-amber-300 font-normal">[15]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                ಸಾ.ಪ<div className="text-[10px] text-amber-300 font-normal">[20]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-slate-800 text-white">
                ಒಟ್ಟು<div className="text-[10px] text-slate-400 font-normal">[50]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[60px] text-center border-r border-slate-700 bg-slate-800">
                ಶ್ರೇಣಿ
              </th>

              {/* FA2 Columns */}
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Act 3<div className="text-[10px] text-amber-300 font-normal">[15]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Act 4<div className="text-[10px] text-amber-300 font-normal">[15]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                ಸಾ.ಪ<div className="text-[10px] text-amber-300 font-normal">[20]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-slate-800 text-white">
                ಒಟ್ಟು<div className="text-[10px] text-slate-400 font-normal">[50]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[60px] text-center border-r border-slate-700 bg-slate-800">
                ಶ್ರೇಣಿ
              </th>

              {/* FA Agg & IA */}
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-slate-800">
                FA1+2<div className="text-[10px] text-slate-400 font-normal">[100]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center border-r border-slate-700 bg-amber-900/40 text-amber-200">
                IA 20%<div className="text-[10px] text-amber-300 font-normal">[20]</div>
              </th>

              {/* SA1 Columns */}
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Theory<div className="text-[10px] text-amber-300 font-normal">[60]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-slate-800">
                Th (30)<div className="text-[10px] text-slate-400 font-normal">[30]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-amber-900/40 text-amber-200">
                Hands-on<div className="text-[10px] text-amber-300 font-normal">[30]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-amber-900/40 text-amber-200">
                Portfolio<div className="text-[10px] text-amber-300 font-normal">[10]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-amber-900/40 text-amber-200">
                Viva<div className="text-[10px] text-amber-300 font-normal">[10]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[65px] text-center bg-slate-800">
                Prac.<div className="text-[10px] text-slate-400 font-normal">[50]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[70px] text-center bg-slate-800">
                Th+Pr<div className="text-[10px] text-slate-400 font-normal">[80]</div>
              </th>

              {/* Final Totals */}
              <th className="py-1.5 px-2 min-w-[75px] text-center bg-blue-950 text-blue-200 font-bold border-l border-slate-700">
                Grand Tot.<div className="text-[10px] text-blue-300 font-normal">[100]</div>
              </th>
              <th className="py-1.5 px-1.5 min-w-[55px] text-center bg-slate-900">Grade</th>
              <th className="py-1.5 px-2 min-w-[70px] text-center bg-slate-900">Result</th>
              <th className="py-1.5 px-2 min-w-[40px] text-center bg-slate-900">Card</th>
              <th className="py-1.5 px-2 w-10 text-center bg-slate-900"></th>
            </tr>
          </thead>

          {/* Table Body: Student Rows */}
          <tbody className="divide-y divide-slate-200 font-medium">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={27} className="py-12 text-center text-slate-400">
                  No students found matching search.
                </td>
              </tr>
            ) : (
              filteredStudents.map((stu, rIdx) => {
                const realIdx = students.findIndex(
                  (s) => (stu.studentId && s.studentId === stu.studentId) || s.rollNumber === stu.rollNumber
                );
                const targetIdx = realIdx >= 0 ? realIdx : rIdx;
                const computed = computeStudentRow(stu);
                const cm = stu.componentMarks || {};

                const renderEditableCell = (compCode, maxAllowed) => {
                  const entry = cm[compCode] || {};
                  let val = entry.rawMarks;
                  if (entry.isAbsent) val = 'AB';
                  else if (entry.isExempted) val = 'EX';
                  if (val === undefined || val === null || val === '' || Number.isNaN(val) || String(val) === 'NaN') {
                    val = '';
                  }

                  const isOver = entry.isOverMax;

                  return (
                    <input
                      ref={(el) => (cellRefs.current[`${targetIdx}_${compCode}`] = el)}
                      type="text"
                      disabled={existingRecord?.status === 'Finalized'}
                      value={val}
                      onChange={(e) => handleCellChange(targetIdx, compCode, e.target.value, maxAllowed)}
                      onKeyDown={(e) => handleKeyDown(e, targetIdx, compCode, editableKeys)}
                      onPaste={(e) => handlePaste(e, targetIdx, compCode, editableKeys)}
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
                      title={isOver ? `Warning: Exceeds maximum of ${maxAllowed}` : undefined}
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
                    {/* 1. Sl No */}
                    <td className="py-1 px-2 text-center text-slate-500 font-bold sticky left-0 bg-inherit z-10 border-r border-slate-200">
                      {stu.rollNumber}
                    </td>

                    {/* 2. Student / Father Name */}
                    <td className="py-1 px-3 sticky left-12 bg-inherit z-10 border-r border-slate-200">
                      <input
                        type="text"
                        disabled={existingRecord?.status === 'Finalized'}
                        value={stu.studentName}
                        onChange={(e) => handleStudentFieldChange(targetIdx, 'studentName', e.target.value)}
                        className="w-full font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      />
                    </td>

                    {/* 3. Gender */}
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

                    {/* 4. Caste */}
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

                    {/* 5-9. FA1 Columns */}
                    <td className="p-1">{renderEditableCell('FA1_ACT1', 15)}</td>
                    <td className="p-1">{renderEditableCell('FA1_ACT2', 15)}</td>
                    <td className="p-1">{renderEditableCell('FA1_TEST', 20)}</td>
                    <td className="p-1 text-center font-bold text-slate-800 bg-slate-100/70 border-x border-slate-200">
                      {Number.isFinite(computed.fa1Total) ? computed.fa1Total : '-'}
                    </td>
                    <td className="p-1 text-center border-r border-slate-200 bg-slate-100/70">
                      <span className="font-bold text-[11px] text-slate-700">{computed.fa1Grade || 'NA'}</span>
                    </td>

                    {/* 10-14. FA2 Columns */}
                    <td className="p-1">{renderEditableCell('FA2_ACT1', 15)}</td>
                    <td className="p-1">{renderEditableCell('FA2_ACT2', 15)}</td>
                    <td className="p-1">{renderEditableCell('FA2_TEST', 20)}</td>
                    <td className="p-1 text-center font-bold text-slate-800 bg-slate-100/70 border-x border-slate-200">
                      {Number.isFinite(computed.fa2Total) ? computed.fa2Total : '-'}
                    </td>
                    <td className="p-1 text-center border-r border-slate-200 bg-slate-100/70">
                      <span className="font-bold text-[11px] text-slate-700">{computed.fa2Grade || 'NA'}</span>
                    </td>

                    {/* 15-16. FA1+FA2 & IA 20% */}
                    <td className="p-1 text-center font-bold text-slate-700 bg-slate-100/70">
                      {Number.isFinite(computed.faAggTotal) ? computed.faAggTotal : '-'}
                    </td>
                    <td className="p-1 text-center font-black text-amber-900 bg-amber-50/60 border-r border-slate-200">
                      {Number.isFinite(computed.ia20) ? computed.ia20 : '-'}
                    </td>

                    {/* 17-23. SA1 Theory & Practical */}
                    <td className="p-1">{renderEditableCell('SA1_TH_RAW', 60)}</td>
                    <td className="p-1 text-center font-bold text-blue-900 bg-blue-50/50">
                      {Number.isFinite(computed.th30) ? computed.th30 : '-'}
                    </td>
                    <td className="p-1">{renderEditableCell('SA1_PR_HANDS', 30)}</td>
                    <td className="p-1">{renderEditableCell('SA1_PR_PORT', 10)}</td>
                    <td className="p-1">{renderEditableCell('SA1_PR_VIVA', 10)}</td>
                    <td className="p-1 text-center font-bold text-slate-800 bg-slate-100/70">
                      {Number.isFinite(computed.prTotal) ? computed.prTotal : '-'}
                    </td>
                    <td className="p-1 text-center font-bold text-slate-700 bg-slate-100/70 border-r border-slate-200">
                      {Number.isFinite(computed.thPr80) ? computed.thPr80 : '-'}
                    </td>

                    {/* 24-26. Grand Total, Grade & Result */}
                    <td className="p-1 text-center font-black text-sm text-blue-700 bg-blue-100/50 border-r border-blue-200">
                      {Number.isFinite(computed.totalFinal) ? computed.totalFinal : 0}
                    </td>
                    <td className="p-1 text-center font-black">
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
                        {computed.isPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>

                    {/* Report Card Modal Trigger */}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => {
                          setSelectedStudentForReport(computed);
                          setReportModalOpen(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                        title="View printable report card"
                      >
                        <Eye className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>

                    {/* Delete row */}
                    {existingRecord?.status !== 'Finalized' && (
                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleDeleteRow(targetIdx)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer: Class Totals and Averages Summary Row */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
              <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider sticky left-0 bg-slate-900 z-20">
                Class Summary & Averages
              </td>
              <td colSpan={3} className="py-2 px-1 text-center text-slate-300">
                FA1 Avg: {Math.round(computedList.reduce((acc, s) => acc + (s.fa1Total || 0), 0) / (totalStudentsCount || 1))}
              </td>
              <td colSpan={2} className="py-2 px-1 text-center text-blue-200">
                Grade: {gradeCounts['A+'] + gradeCounts['A']} A/A+
              </td>
              <td colSpan={3} className="py-2 px-1 text-center text-slate-300">
                FA2 Avg: {Math.round(computedList.reduce((acc, s) => acc + (s.fa2Total || 0), 0) / (totalStudentsCount || 1))}
              </td>
              <td colSpan={2} className="py-2 px-1 text-center text-blue-200">
                Grade: {gradeCounts['B+'] + gradeCounts['B']} B/B+
              </td>
              <td colSpan={2} className="py-2 px-1 text-center text-amber-200">
                IA Avg: {Math.round(computedList.reduce((acc, s) => acc + (s.ia20 || 0), 0) / (totalStudentsCount || 1))} / 20
              </td>
              <td colSpan={7} className="py-2 px-1 text-center text-emerald-200">
                SA1 Th+Pr Avg: {Math.round(computedList.reduce((acc, s) => acc + (s.thPr80 || 0), 0) / (totalStudentsCount || 1))} / 80
              </td>
              <td className="py-2 px-1 text-center text-blue-400 font-black text-sm">
                {classAvg}
              </td>
              <td colSpan={2} className="py-2 px-1 text-center text-emerald-400">
                {Math.round((passedStudents.length / (totalStudentsCount || 1)) * 100)}% Pass
              </td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Import Excel Modal (Full marksheet) */}
      <ImportExcelModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        defaultSection={section}
        defaultClass={className}
        onImportSuccess={handleImportSuccess}
      />

      {/* Import Students Roster Modal (.xlsx, .xls, .csv) */}
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
        examRecord={existingRecord || {
          examTitle: `${subject} Official Term Assessment`,
          className,
          section,
          subject,
          academicYear,
          templateSnapshot: {
            totalFinalMarks: 100,
            components: [
              { code: 'FA1_TOTAL', name: 'Formative Assessment 1', maxRawMarks: 50, finalWeightage: 50, calculationMethod: 'direct' },
              { code: 'FA2_TOTAL', name: 'Formative Assessment 2', maxRawMarks: 50, finalWeightage: 50, calculationMethod: 'direct' },
              { code: 'IA_20', name: 'Internal Assessment (20%)', maxRawMarks: 20, finalWeightage: 20, calculationMethod: 'direct' },
              { code: 'SA1_TH_30', name: 'Theory Paper (Scaled to 30)', maxRawMarks: 60, finalWeightage: 30, calculationMethod: 'proportional' },
              { code: 'SA1_PR_TOTAL', name: 'Practical Lab, Hands-on, Portfolio & Viva', maxRawMarks: 50, finalWeightage: 50, calculationMethod: 'direct' },
            ],
          },
        }}
        student={selectedStudentForReport}
      />

      {/* Finalize Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmFinalizeOpen}
        onClose={() => setConfirmFinalizeOpen(false)}
        onConfirm={handleFinalizeMarks}
        title="Lock & Finalize Examination Marks?"
        message="This will officially lock these marks and generate permanent board-ready records and reports. Historical records will retain this exact configuration."
        confirmText="Lock Marks"
        type="primary"
        loading={saving}
      />
    </div>
  );
};

export default MarksEntryPage;
