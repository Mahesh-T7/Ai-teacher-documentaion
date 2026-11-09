import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';

export const ImportExcelModal = ({ isOpen, onClose, onImportSuccess, defaultSection = 'A', defaultClass = 'Class 9' }) => {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedSection, setSelectedSection] = useState(defaultSection);

  useEffect(() => {
    if (previewData) {
      if (previewData.availableSections && previewData.availableSections.includes(defaultSection)) {
        setSelectedSection(defaultSection);
      } else if (previewData.detectedSection) {
        setSelectedSection(previewData.detectedSection);
      } else if (previewData.availableSections && previewData.availableSections.length > 0) {
        setSelectedSection(previewData.availableSections[0]);
      }
    }
  }, [previewData, defaultSection]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.match(/\.(xlsx|xls)$/i)) {
        showToast('Please select a valid Excel workbook (.xlsx or .xls)', 'error');
        return;
      }
      if (selected.size < 50) {
        showToast(
          `This file appears to be empty or corrupted (only ${selected.size} bytes). Please re-download or choose a valid .xlsx workbook.`,
          'error'
        );
        return;
      }
      setFile(selected);
      setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showToast('Please select an Excel file first.', 'error');
      return;
    }

    if (file.size < 50) {
      showToast(
        `Cannot parse file: File size is only ${file.size} bytes (likely empty or corrupted). Please export a fresh Excel file.`,
        'error'
      );
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await examApi.importExcelMarks(formData);
      const data = res?.data || res;
      if (data?.success) {
        setPreviewData(data);
        const detectedSec = data.detectedSection || 'A';
        setSelectedSection(detectedSec);
        showToast(
          `Excel recognized! Detected ${data.detectedClass || 'Class 9'}, Section ${detectedSec}.`,
          'success'
        );
      } else {
        showToast(data?.message || 'Failed to parse Excel workbook.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to import Excel file.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeSectionData = previewData?.sections?.[selectedSection] || {
    students: previewData?.students || [],
    className: previewData?.detectedClass || 'Class 9',
    section: selectedSection,
    hasMarks: true,
  };

  const currentStudents = activeSectionData.students || [];

  const handleApply = () => {
    if (previewData) {
      onImportSuccess({
        students: currentStudents,
        className: activeSectionData.className || previewData.detectedClass || 'Class 9',
        section: selectedSection,
        allSections: previewData.sections || {},
        sheetName: activeSectionData.sheetNames?.join(', ') || previewData.sheetName || 'Sheet1',
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-200">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Smart Excel Marks & Roster Import</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                Universal Parser
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload any school marks Excel file. Class, Section, Student & Father Names are auto-detected.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* File Upload Box */}
          <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {file ? file.name : 'Click to select or drag & drop Excel workbook'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .xlsx workbooks (e.g. Copy of AI_NSQF marks entry format.xlsx)
            </p>
          </label>

          {/* Extracted Details & Section Picker */}
          {previewData && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 text-xs text-emerald-950 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Excel File Successfully Parsed!
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-800 px-2.5 py-1 rounded-lg font-bold text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  Auto-detected: {activeSectionData.className || previewData.detectedClass}
                </div>
              </div>

              {/* Section Selector if workbook has multiple sections */}
              {previewData.availableSections && previewData.availableSections.length > 1 && (
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    Select Section to Import:
                  </div>
                  <div className="flex items-center gap-2">
                    {previewData.availableSections.map((sec) => {
                      const secInfo = previewData.sections?.[sec];
                      const isSelected = selectedSection === sec;
                      const count = secInfo?.students?.length || 0;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSelectedSection(sec)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                              : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/50'
                          }`}
                        >
                          <span>Section {sec}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                              isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {count} {count === 1 ? 'student' : 'students'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-[11px] text-slate-500 font-medium">Extracted Students</div>
                  <div className="text-base font-black text-slate-800">
                    {currentStudents.length} {currentStudents.length === 1 ? 'Student' : 'Students'}
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-[11px] text-slate-500 font-medium">Auto-fill Target</div>
                  <div className="text-base font-black text-emerald-700">
                    {activeSectionData.className} – Sec {selectedSection}
                  </div>
                </div>
              </div>

              {/* Sample Students Extracted Preview */}
              {currentStudents.length > 0 ? (
                <div>
                  <div className="text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    Sample Extracted Student Records:
                  </div>
                  <div className="bg-white/90 rounded-xl border border-emerald-100 divide-y divide-emerald-50 max-h-36 overflow-y-auto">
                    {currentStudents.slice(0, 5).map((s, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            {s.rollNumber}
                          </span>
                          <span className="font-bold text-slate-800">{s.studentName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                          <span>Gender: {s.gender}</span>
                          <span>•</span>
                          <span>Caste: {s.caste}</span>
                          {Object.keys(s.componentMarks || {}).length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">Marks Included</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {currentStudents.length > 5 && (
                      <div className="p-1.5 text-center text-[10px] text-slate-500 italic bg-slate-50/50">
                        + {currentStudents.length - 5} more students ready to import
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Section {selectedSection} sheet currently has 0 student names. Select another section or apply to initialize blank roster.</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            {!previewData ? (
              <button
                type="button"
                onClick={handleUpload}
                disabled={loading || !file}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Reading Workbook...' : 'Upload & Parse Excel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <span>Auto-Fill {activeSectionData.className} (Sec {selectedSection})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExcelModal;
