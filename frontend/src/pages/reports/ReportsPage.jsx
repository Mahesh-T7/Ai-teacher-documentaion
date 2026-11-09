import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Image as ImageIcon,
  School,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  FileCheck2,
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { photoApi } from '../../api/photoApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const REPORT_TYPES = [
  { id: 'daily', name: 'Daily Teaching Report', desc: 'Single-day detailed lesson log, outcomes, and photo evidence' },
  { id: 'weekly', name: 'Weekly Teaching Report', desc: 'Summary of Monday to Saturday lessons and syllabus progress' },
  { id: 'monthly', name: 'Monthly Teaching Report', desc: 'Monthly teaching records, classes conducted, and attendance' },
  { id: 'class', name: 'Class-wise Report', desc: 'Complete teaching dossier for a specific class cohort' },
  { id: 'subject', name: 'Subject-wise Report', desc: 'Chronological syllabus topics and learning outcomes for a subject' },
];

const STANDARD_CLASSES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const STANDARD_SUBJECTS = ['General Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Social Science'];

export const ReportsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Report Configuration
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);

  // Preview & Generation State
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Past Generated Reports History
  const [pastReports, setPastReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Auto-adjust date ranges based on reportType
  const handleReportTypeChange = (type) => {
    setReportType(type);
    const now = new Date();
    if (type === 'daily') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'weekly') {
      const pastWeek = new Date(now.getTime() - 6 * 86400000);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const fetchPastReports = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await reportApi.getReportHistory();
      if (res.success && res.reports) {
        setPastReports(res.reports);
      }
    } catch (err) {
      showToast('Failed to load past reports archive', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPastReports();
  }, [fetchPastReports]);

  // Generate Interactive PDF Preview
  const handleGeneratePreview = async () => {
    try {
      setPreviewing(true);
      const payload = {
        reportType,
        startDate,
        endDate,
        className: className || undefined,
        subject: subject || undefined,
        includePhotos,
        title: `${REPORT_TYPES.find((r) => r.id === reportType)?.name || 'Teaching Report'} - ${startDate}`,
      };

      const res = await reportApi.previewReport(payload);
      if (res.success && res.reportData) {
        setPreviewData(res.reportData);
        showToast('Report preview generated successfully.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to assemble preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  // Generate & Download Official PDF
  const handleDownloadPdf = async () => {
    try {
      setGenerating(true);
      showToast('Generating official A4 PDF report...', 'info');

      const payload = {
        reportType,
        outputFormat: 'pdf',
        startDate,
        endDate,
        className: className || undefined,
        subject: subject || undefined,
        includePhotos,
        title: `${REPORT_TYPES.find((r) => r.id === reportType)?.name || 'Teaching Report'}_${startDate}`,
      };

      const res = await reportApi.generateReport(payload);
      if (res.success && res.report) {
        const repId = res.report._id || res.report.id;
        const blobRes = await reportApi.downloadReport(repId);
        const blob =
          blobRes instanceof Blob
            ? blobRes
            : blobRes?.data instanceof Blob
            ? blobRes.data
            : new Blob([blobRes?.data || blobRes], { type: 'application/pdf' });
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = res.report.fileName || `Official_Report_${reportType}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
        showToast('Official PDF downloaded successfully!', 'success');
        await fetchPastReports();
      } else {
        showToast('Report created in archive.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate PDF report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Download past report with authentic binary blob
  const handleDownloadPastReport = async (report) => {
    const repId = report._id || report.id;
    try {
      showToast('Downloading official report...', 'info');
      const blobRes = await reportApi.downloadReport(repId);
      const blob =
        blobRes instanceof Blob
          ? blobRes
          : blobRes?.data instanceof Blob
          ? blobRes.data
          : new Blob([blobRes?.data || blobRes], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = report.fileName || `Official_Report_${report.reportType || 'academic'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(fileUrl);
      showToast('Report downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download report file', 'error');
    }
  };

  // Delete past report
  const handleDeleteReport = async () => {
    if (!deleteTargetId) return;
    try {
      await reportApi.deleteReport(deleteTargetId);
      showToast('Report deleted from history.', 'success');
      setPastReports((prev) => prev.filter((r) => (r._id || r.id) !== deleteTargetId));
    } catch (err) {
      showToast('Failed to delete report', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Reports & PDF Generation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and download standardized A4 academic reports for daily, weekly, and monthly inspections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {previewData && (
            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Controls (1/3), Right Preview (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* REPORT GENERATOR CONTROLS (Left Column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5 h-fit">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Select Report Type
            </h2>
          </div>

          {/* Report Type Selector */}
          <div className="space-y-2">
            {REPORT_TYPES.map((type) => (
              <label
                key={type.id}
                onClick={() => handleReportTypeChange(type.id)}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  reportType === type.id
                    ? 'border-blue-500 bg-blue-50/50 text-blue-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={type.id}
                  checked={reportType === type.id}
                  onChange={() => handleReportTypeChange(type.id)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{type.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{type.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="border-b border-slate-100 pb-3 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              2. Scope & Filters
            </h2>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Class <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
            >
              <option value="">All Classes</option>
              {STANDARD_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Subject <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
            >
              <option value="">All Subjects</option>
              {STANDARD_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Evidence Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="rounded-md text-blue-600 focus:ring-blue-500"
              />
              <span>Include Authenticated Photo Evidence</span>
            </label>
          </div>

          {/* Action Button: Preview */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={handleGeneratePreview}
              disabled={previewing}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {previewing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading Preview...</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Generate Report Preview</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* INTERACTIVE A4 REPORT PREVIEW (Right Column - 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Official A4 Document Preview
                </h2>
              </div>
              {previewData && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Ready to Download
                </span>
              )}
            </div>

            {!previewData ? (
              <div className="text-center py-20 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  No preview generated yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Select your desired report type and date range on the left, then click "Generate Report Preview".
                </p>
                <button
                  onClick={handleGeneratePreview}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Today's Report</span>
                </button>
              </div>
            ) : (
              /* THE A4 DOCUMENT PREVIEW CANVAS */
              <div className="border border-slate-300 rounded-xl p-6 md:p-8 bg-white shadow-sm space-y-6 text-xs text-slate-800 font-sans max-w-2xl mx-auto">
                {/* Official Crest & School Title */}
                <div className="text-center pb-4 border-b-2 border-blue-900 space-y-1">
                  <h3 className="text-base font-bold text-blue-950 uppercase tracking-wide">
                    {previewData.teacher?.schoolName || user?.schoolName || 'Government / Model Secondary School'}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Central Board of Secondary Education & Department of Public Instruction
                  </p>
                  <div className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-900 text-xs font-bold rounded-md border border-blue-200 uppercase">
                    {previewData.meta?.reportType === 'daily'
                      ? 'DAILY CLASSROOM TEACHING DIARY & INSPECTION DOSSIER'
                      : previewData.meta?.reportType === 'weekly'
                      ? 'WEEKLY ACADEMIC TEACHING & PROGRESS REPORT'
                      : 'MONTHLY TEACHING DOCUMENTATION & SYLLABUS AUDIT'}
                  </div>
                </div>

                {/* Section 1: Teacher & Metadata Table */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="space-y-1">
                    <p>
                      <span className="font-bold text-slate-900">Teacher Name:</span>{' '}
                      {previewData.teacher?.fullName || user?.fullName}
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">Designation:</span>{' '}
                      {previewData.teacher?.designation || user?.designation || 'Teacher'}
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">Academic Year:</span>{' '}
                      {previewData.meta?.academicYear || '2026-2027'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>
                      <span className="font-bold text-slate-900">Report Date:</span>{' '}
                      {new Date(previewData.meta?.startDate).toLocaleDateString('en-GB')}{' '}
                      {startDate !== endDate && ` to ${new Date(previewData.meta?.endDate).toLocaleDateString('en-GB')}`}
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">Sessions Conducted:</span>{' '}
                      {previewData.diaryEntries?.length || 0} Classrooms
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">Language:</span> English / Bilingual (ಕನ್ನಡ)
                    </p>
                  </div>
                </div>

                {/* Section 2: Teaching Entries List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs border-b border-slate-200 pb-1">
                    Documented Classroom Records ({previewData.diaryEntries?.length || 0})
                  </h4>

                  {previewData.diaryEntries?.length === 0 ? (
                    <p className="text-slate-400 italic py-4 text-center">
                      No teaching diary records logged for this selected date scope.
                    </p>
                  ) : (
                    previewData.diaryEntries?.map((entry, idx) => (
                      <div
                        key={entry._id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                      >
                        <div className="flex items-center justify-between font-bold text-xs text-blue-900 border-b border-slate-200 pb-1.5">
                          <span>
                            #{idx + 1}. {entry.className} ({entry.section || 'A'}) - {entry.subject}
                          </span>
                          <span className="text-slate-500 text-[11px] font-normal">
                            Period {entry.period || 1} • {new Date(entry.date).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <div>
                          <span className="font-bold text-slate-900">Topic Covered: </span>
                          <span className="font-semibold text-slate-800">{entry.topic}</span>
                        </div>

                        {entry.learningObjectives && (
                          <div>
                            <span className="font-bold text-slate-900">Learning Objectives: </span>
                            <span className="text-slate-700 whitespace-pre-line">
                              {entry.learningObjectives}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="font-bold text-slate-900">Methodology: </span>
                            <span>{entry.teachingMethodology || 'Interactive Model'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Teaching Aids: </span>
                            <span>{entry.teachingAids || 'Blackboard, Textbooks'}</span>
                          </div>
                        </div>

                        {(entry.classroomActivities || entry.activitiesConducted) && (
                          <div>
                            <span className="font-bold text-slate-900">Activities & Participation: </span>
                            <span className="text-slate-700">
                              {entry.classroomActivities || entry.activitiesConducted}
                            </span>
                          </div>
                        )}

                        {entry.learningOutcomes && (
                          <div>
                            <span className="font-bold text-slate-900">Outcomes Achieved: </span>
                            <span className="text-slate-700">{entry.learningOutcomes}</span>
                          </div>
                        )}

                        {entry.homeworkAssigned && (
                          <div>
                            <span className="font-bold text-slate-900">Homework Assigned: </span>
                            <span className="text-slate-700">{entry.homeworkAssigned}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Section 3: Photo Evidence in Preview */}
                {includePhotos && previewData.photos?.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <h4 className="font-bold text-blue-950 uppercase tracking-wider text-xs">
                      Photographic Classroom Evidence ({previewData.photos.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {previewData.photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                        >
                          <img
                            src={photo.url || `/uploads/${photo.storageKey}`}
                            alt={photo.caption || 'Evidence'}
                            className="w-full h-28 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/300x200?text=Photo';
                            }}
                          />
                          <p className="p-1.5 text-[10px] text-slate-600 truncate bg-white">
                            {photo.caption || photo.originalFileName || `Photo #${pIdx + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Signature Blocks */}
                <div className="pt-8 flex items-center justify-between text-center text-xs">
                  <div className="space-y-1">
                    <div className="w-36 border-t border-slate-800 mx-auto" />
                    <p className="font-bold text-slate-800">Teacher's Signature</p>
                    <p className="text-[10px] text-slate-400">Date: {todayStr}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="w-36 border-t border-slate-800 mx-auto" />
                    <p className="font-bold text-slate-800">Headmaster / Principal</p>
                    <p className="text-[10px] text-slate-400">School Seal & Signature</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Download CTA Bar */}
          {previewData && (
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
              <span className="text-xs text-slate-500">
                Official PDF format with consistent A4 margins, pagination, and school header.
              </span>
              <button
                onClick={handleDownloadPdf}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PAST GENERATED REPORTS ARCHIVE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Generated Reports Archive
            </h3>
            <p className="text-xs text-slate-500">
              Download previously compiled official dossiers
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {pastReports.length} Document(s)
          </span>
        </div>

        {loadingHistory ? (
          <div className="py-8">
            <LoadingSpinner message="Loading archives..." />
          </div>
        ) : pastReports.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No previously generated reports. Generate your first report above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pastReports.map((report) => {
              const repId = report._id || report.id;
              const repDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB') : '';
              const fileUrl = report.storageKey ? `/uploads/${report.storageKey}` : report.fileUrl;

              return (
                <div
                  key={repId}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {report.title || 'Official Academic Report'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="uppercase font-semibold text-blue-600">
                        {report.outputFormat || 'PDF'}
                      </span>
                      <span>•</span>
                      <span>{repDate}</span>
                      <span>•</span>
                      <span>{report.reportType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPastReport(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(repId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteReport}
        title="Delete Report from Archive?"
        message="Are you sure you want to delete this generated report? The file will be permanently removed."
        confirmText="Delete Report"
        confirmVariant="danger"
      />
    </div>
  );
};

export default ReportsPage;
