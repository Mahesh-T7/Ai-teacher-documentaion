import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Users,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';

export const ImportStudentsModal = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentStudents = [],
  className = 'Class 9',
  section = 'A',
}) => {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [mapping, setMapping] = useState({ rollIndex: -1, nameIndex: -1, admIndex: -1 });
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'append'

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast('Please select a valid Excel workbook (.xlsx, .xls) or CSV file.', 'error');
      return;
    }

    if (selected.size < 50) {
      showToast(`Selected file is too small or empty (${selected.size} bytes).`, 'error');
      return;
    }

    setFile(selected);
    await uploadAndParseFile(selected);
  };

  const uploadAndParseFile = async (targetFile, chosenSheet = '', customMapping = null) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', targetFile || file);
      if (chosenSheet) {
        formData.append('sheetName', chosenSheet);
      }
      if (customMapping) {
        formData.append('mapping', JSON.stringify(customMapping));
      }

      const res = await examApi.importStudentsExcel(formData);
      const data = res?.data || res;

      if (data?.success) {
        setSheetData(data);
        setSelectedSheet(data.selectedSheet || '');
        setMapping(data.detectedMapping || { rollIndex: -1, nameIndex: -1, admIndex: -1 });
        showToast(
          `Detected ${data.stats?.validStudents || data.students?.length || 0} student(s) from sheet "${data.selectedSheet}"!`,
          'success'
        );
      } else {
        showToast(data?.message || 'Failed to parse student roster.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to parse student roster.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = async (newSheet) => {
    setSelectedSheet(newSheet);
    if (file) {
      await uploadAndParseFile(file, newSheet);
    }
  };

  const handleMappingChange = async (field, indexVal) => {
    const newMapping = {
      ...mapping,
      [field]: Number(indexVal),
    };
    setMapping(newMapping);
    if (file) {
      await uploadAndParseFile(file, selectedSheet, newMapping);
    }
  };

  const studentsToImport = sheetData?.students || [];
  const stats = sheetData?.stats || {
    totalDetected: studentsToImport.length,
    validStudents: studentsToImport.length,
    missingNames: 0,
    duplicateRolls: 0,
    duplicateAdmissions: 0,
  };

  // Determine existing student overlap
  const existingAdmMap = new Map();
  const existingRollMap = new Map();
  currentStudents.forEach((s) => {
    if (s.admissionNumber) existingAdmMap.set(String(s.admissionNumber).trim().toLowerCase(), s);
    if (s.rollNumber) existingRollMap.set(Number(s.rollNumber), s);
  });

  const studentRowsWithStatus = studentsToImport.map((s) => {
    const admKey = s.admissionNumber ? String(s.admissionNumber).trim().toLowerCase() : '';
    const existing = (admKey && existingAdmMap.get(admKey)) || existingRollMap.get(Number(s.rollNumber));
    const hasExistingMarks = existing && existing.componentMarks && Object.keys(existing.componentMarks).length > 0;

    return {
      ...s,
      isExisting: !!existing,
      hasMarks: hasExistingMarks,
      existingData: existing,
    };
  });

  const existingCount = studentRowsWithStatus.filter((s) => s.isExisting).length;
  const newCount = studentRowsWithStatus.length - existingCount;

  const handleConfirmImport = () => {
    if (!studentsToImport || studentsToImport.length === 0) {
      showToast('No valid students to import.', 'error');
      return;
    }

    let finalStudents = [];

    if (importMode === 'replace') {
      // EXACT number of students matching Excel!
      finalStudents = studentRowsWithStatus.map((s, idx) => {
        // If matched an existing student, PRESERVE their existing marks and calculations!
        const existingMarks = s.existingData?.componentMarks || {};
        const roll = s.rollNumber || idx + 1;
        return {
          studentId: s.existingData?.studentId || `stu_${section}_${roll}_${idx}`,
          rollNumber: roll,
          studentName: s.studentName,
          admissionNumber: s.admissionNumber || '',
          gender: s.gender || 'M',
          caste: s.caste || 'GEN',
          componentMarks: { ...existingMarks },
          totalRaw: s.existingData?.totalRaw || 0,
          totalFinal: s.existingData?.totalFinal || 0,
          percentage: s.existingData?.percentage || 0,
          grade: s.existingData?.grade || 'NA',
          isPass: s.existingData?.isPass || false,
          isEntirelyAbsent: s.existingData?.isEntirelyAbsent || false,
          remarks: s.existingData?.remarks || '',
        };
      });
    } else {
      // Append mode: keep existing students, append only new students
      const currentCopy = [...currentStudents];
      const highestRoll = currentCopy.reduce((max, s) => Math.max(max, Number(s.rollNumber) || 0), 0);

      studentsToImport.forEach((s, idx) => {
        const isDuplicate = currentCopy.some(
          (c) =>
            (s.admissionNumber && c.admissionNumber && String(c.admissionNumber).trim().toLowerCase() === String(s.admissionNumber).trim().toLowerCase()) ||
            Number(c.rollNumber) === Number(s.rollNumber)
        );

        if (!isDuplicate) {
          const newRoll = highestRoll + idx + 1;
          currentCopy.push({
            studentId: `stu_${section}_${newRoll}_${Date.now()}_${idx}`,
            rollNumber: newRoll,
            studentName: s.studentName,
            admissionNumber: s.admissionNumber || '',
            gender: s.gender || 'M',
            caste: s.caste || 'GEN',
            componentMarks: {},
            totalRaw: 0,
            totalFinal: 0,
            percentage: 0,
            grade: 'NA',
            isPass: false,
            isEntirelyAbsent: false,
            remarks: '',
          });
        }
      });
      finalStudents = currentCopy;
    }

    onImportSuccess({
      students: finalStudents,
      importedCount: studentsToImport.length,
      mode: importMode,
      sheetName: selectedSheet,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Import Students from Excel / CSV</h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  Universal Roster Extractor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically detects student names, roll numbers, and admission numbers from any school format (.xlsx, .xls, .csv).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Box */}
          <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/50 hover:bg-blue-50/30">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 shadow-xs flex items-center justify-center border border-slate-200">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Choose or drop your student register file (.xlsx, .xls, .csv)'}
              </p>
              <p className="text-[11px] text-slate-500">
                Supports State Board, SATS, CBSE, and custom school class rosters
              </p>
            </div>
          </div>

          {loading && (
            <div className="py-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Analyzing workbook and detecting student columns...</p>
            </div>
          )}

          {sheetData && !loading && (
            <div className="space-y-4">
              {/* Worksheet & Column Mapping Controls */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Target Worksheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800"
                    >
                      {sheetData.sheetNames?.map((sName) => (
                        <option key={sName} value={sName}>
                          {sName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Header detected at row #{sheetData.headerRowIndex !== undefined ? sheetData.headerRowIndex + 1 : 1}
                  </span>
                </div>

                {/* Column Mapping Selector */}
                <div>
                  <p className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider">
                    Confirm Column Mappings
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Roll Number Column
                      </label>
                      <select
                        value={mapping.rollIndex}
                        onChange={(e) => handleMappingChange('rollIndex', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value={-1}>-- Auto Sequential (1, 2, 3...) --</option>
                        {sheetData.availableColumns?.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.name} {col.sample ? `(e.g. ${col.sample})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Student Name Column <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={mapping.nameIndex}
                        onChange={(e) => handleMappingChange('nameIndex', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-blue-400 bg-blue-50/50 font-bold text-blue-900"
                      >
                        {sheetData.availableColumns?.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.name} {col.sample ? `(e.g. ${col.sample})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Admission / STS No Column
                      </label>
                      <select
                        value={mapping.admIndex}
                        onChange={(e) => handleMappingChange('admIndex', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value={-1}>-- None / Leave Blank --</option>
                        {sheetData.availableColumns?.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.name} {col.sample ? `(e.g. ${col.sample})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extraction Audit Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 bg-blue-50 text-blue-800 font-bold rounded-xl border border-blue-200">
                  Total Detected: {stats.validStudents} Student(s)
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200">
                  Valid Records: {stats.validStudents}
                </span>
                {stats.missingNames > 0 && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200">
                    Missing Names (Skipped): {stats.missingNames}
                  </span>
                )}
                {stats.duplicateRolls > 0 && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200">
                    Duplicate Roll Nos: {stats.duplicateRolls}
                  </span>
                )}
                {existingCount > 0 && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-800 font-bold rounded-xl border border-purple-200">
                    Existing in Roster: {existingCount} (Marks Preserved)
                  </span>
                )}
              </div>

              {/* Import Mode Selection */}
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2 text-xs">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Roster Size & Marks Protection Policy
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-300/80 bg-white cursor-pointer hover:bg-amber-50/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={(e) => setImportMode(e.target.value)}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">
                        Exact Count Roster ({stats.validStudents} Students)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Roster will contain exactly {stats.validStudents} rows matching the Excel file. Existing student marks are preserved.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-300/80 bg-white cursor-pointer hover:bg-amber-50/50">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={(e) => setImportMode(e.target.value)}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="font-bold text-slate-800">
                        Add New Students Only (Append)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Retains all existing students in the table and adds {newCount} new students to the bottom.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Student Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 flex justify-between items-center">
                  <span>Student Roster Preview ({studentsToImport.length} Records)</span>
                  <span className="text-[11px] text-slate-500 font-medium">Scroll to view all</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-16 text-center">Roll No</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Admission No</th>
                        <th className="py-2 px-3 w-28 text-center">Roster Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentRowsWithStatus.map((s, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition">
                          <td className="py-2 px-3 text-center font-bold text-slate-700">{s.rollNumber}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{s.studentName}</td>
                          <td className="py-2 px-3 text-slate-600">{s.admissionNumber || '—'}</td>
                          <td className="py-2 px-3 text-center">
                            {s.isExisting ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                Existing {s.hasMarks ? '(Marks Kept)' : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                New Student
                              </span>
                            )}
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

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={!studentsToImport || studentsToImport.length === 0 || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Populate Roster ({studentsToImport.length} Students)
          </button>
        </div>
      </div>
    </div>
  );
};
