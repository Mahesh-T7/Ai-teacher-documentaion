import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  School,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';
import { downloadBlob } from '../../utils/fileDownload';

export const ReportCardPreviewModal = ({ isOpen, onClose, examRecord, student }) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !examRecord || !student) return null;

  const template = examRecord.templateSnapshot || {};
  const components = template.components || [];

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const res = await examApi.downloadStudentReportCardPdf(
        examRecord._id || examRecord.id,
        student.studentId || student.rollNumber
      );
      downloadBlob(
        res,
        `ReportCard_Roll_${student.rollNumber}_${(student.studentName || 'Student').replace(/\s+/g, '_')}.pdf`,
        'application/pdf'
      );
      showToast('Report card downloaded successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download report card PDF.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Student Report Card</h2>
              <p className="text-xs text-slate-300">
                {examRecord.examTitle} • Class {examRecord.className} ({examRecord.section || 'A'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:p-0">
          {/* School Badge & Info */}
          <div className="text-center pb-4 border-b border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Department of Vocational Education & Skill Development
            </p>
            <h1 className="text-xl font-black text-slate-900 mt-1 uppercase">
              Official Examination Performance Card
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Academic Session {examRecord.academicYear || '2026-2027'} • Subject:{' '}
              <span className="font-semibold text-slate-700">{examRecord.subject}</span>
            </p>
          </div>

          {/* Student Profile Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{student.studentName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Roll Number</span>
              <span className="font-bold text-slate-900 text-sm">#{student.rollNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Admission No</span>
              <span className="font-bold text-slate-900 text-sm">{student.admissionNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Class & Section</span>
              <span className="font-bold text-slate-900 text-sm">
                {examRecord.className} - {examRecord.section || 'A'}
              </span>
            </div>
          </div>

          {/* Marks Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Assessment Component</th>
                  <th className="py-3 px-3 text-center">Max Raw</th>
                  <th className="py-3 px-3 text-center">Raw Marks</th>
                  <th className="py-3 px-3 text-center">Weightage</th>
                  <th className="py-3 px-3 text-center font-bold text-blue-900">Final Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {components.map((comp) => {
                  const compData = (student.componentMarks || {})[comp.code] || {};
                  const isAbsent = compData.isAbsent;
                  const isExempt = compData.isExempted;
                  const rawVal = compData.rawMarks;
                  const finalVal = compData.finalMarks !== undefined ? compData.finalMarks : '-';

                  return (
                    <tr key={comp.code} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{comp.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                          Code: {comp.code} • Method: {comp.calculationMethod}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                        {comp.maxRawMarks}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isAbsent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            ABSENT
                          </span>
                        ) : isExempt ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                            EXEMPT
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800">{rawVal ?? '-'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                        {comp.finalWeightage}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700 text-sm">
                        {finalVal}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td className="py-3 px-4 uppercase tracking-wider text-xs">Total Performance</td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {components.reduce((sum, c) => sum + (Number(c.maxRawMarks) || 0), 0)}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-800">{student.totalRaw ?? 0}</td>
                  <td className="py-3 px-3 text-center text-slate-600">
                    {template.totalFinalMarks || 100}
                  </td>
                  <td className="py-3 px-3 text-center text-base text-blue-700">
                    {student.totalFinal ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grand Results Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100">
            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">
                Grand Percentage
              </span>
              <span className="text-xl font-black text-blue-600 mt-0.5 block">
                {student.percentage ? `${student.percentage}%` : '0%'}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">
                Letter Grade
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {student.grade || 'F'}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">
                Result Status
              </span>
              <span
                className={`text-sm font-black mt-1 inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full ${
                  student.isPass
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {student.isPass ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PASSED
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    FAILED
                  </>
                )}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block uppercase">
                Distinction
              </span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">
                {student.isDistinction ? '🌟 Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Teacher Remarks & Verification Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Teacher Remarks:</p>
              <p className="italic text-slate-600 mt-0.5">
                {student.remarks ||
                  (student.isPass
                    ? 'Good performance. Consistently engaged during practical and theoretical sessions.'
                    : 'Needs additional practice and remedial coaching on core topics.')}
              </p>
            </div>
            <div className="text-right sm:self-end pt-4 sm:pt-0">
              <div className="w-40 border-b border-slate-400 pb-1 mb-1 text-center font-semibold text-slate-700">
                Verified Signatory
              </div>
              <p className="text-[10px] text-slate-400 text-center">Class / Subject Teacher</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCardPreviewModal;
