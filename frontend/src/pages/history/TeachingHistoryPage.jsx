import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  Calendar,
  BookMarked,
  FileText,
  Trash2,
  Edit2,
  Eye,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Layers,
  X,
  School,
  ArrowRight,
} from 'lucide-react';
import { diaryApi } from '../../api/diaryApi';
import { photoApi } from '../../api/photoApi';
import { reportApi } from '../../api/reportApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const TeachingHistoryPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals
  const [viewRecord, setViewRecord] = useState(null);
  const [recordPhotos, setRecordPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await diaryApi.getDiaryEntries();
      if (res.success && res.data) {
        setEntries(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load teaching records', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Derived filter options
  const availableClasses = useMemo(() => {
    const set = new Set(user?.classesHandled || []);
    entries.forEach((e) => {
      if (e.classHandled) set.add(e.classHandled);
      else if (e.className) set.add(e.className);
    });
    return Array.from(set);
  }, [user, entries]);

  const availableSubjects = useMemo(() => {
    const set = new Set(user?.subjectsTaught || []);
    entries.forEach((e) => {
      if (e.subject) set.add(e.subject);
    });
    return Array.from(set);
  }, [user, entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (classFilter && (e.classHandled !== classFilter && e.className !== classFilter)) return false;
      if (subjectFilter && e.subject?.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      if (dateFilter) {
        const eDateStr = new Date(e.date).toISOString().split('T')[0];
        if (eDateStr !== dateFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.topic?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.className?.toLowerCase().includes(q) ||
          e.learningObjectives?.toLowerCase().includes(q) ||
          e.detailedContent?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [entries, statusFilter, classFilter, subjectFilter, dateFilter, searchQuery]);

  // Open Record Details modal & load associated photos
  const handleOpenRecordDetails = async (record) => {
    setViewRecord(record);
    const recId = record._id || record.id;
    try {
      setLoadingPhotos(true);
      const res = await photoApi.getPhotos({ teachingEntryId: recId });
      if (res.success && res.data) {
        setRecordPhotos(res.data);
      } else {
        setRecordPhotos([]);
      }
    } catch (err) {
      setRecordPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Delete Record
  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await diaryApi.deleteDiaryEntry(deleteTargetId);
      showToast('Teaching record deleted successfully.', 'success');
      setEntries((prev) => prev.filter((e) => (e._id || e.id) !== deleteTargetId));
      if (viewRecord && (viewRecord._id || viewRecord.id) === deleteTargetId) {
        setViewRecord(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete record', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Download PDF for this record
  const handleDownloadPdf = async (record) => {
    const recId = record._id || record.id;
    try {
      setDownloadingId(recId);
      showToast('Preparing official PDF download...', 'info');

      // Generate report for this entry
      const res = await reportApi.generateReport({
        reportType: 'daily',
        outputFormat: 'pdf',
        entryId: recId,
        startDate: record.date,
        endDate: record.date,
        className: record.className,
        subject: record.subject,
        title: `Teaching_Record_${record.className}_${record.subject}`,
      });

      if (res.success && res.report) {
        const repId = res.report._id || res.report.id;
        const blobRes = await reportApi.downloadReport(repId);
        const blob =
          blobRes instanceof Blob
            ? blobRes
            : blobRes?.data instanceof Blob
            ? blobRes.data
            : new Blob([blobRes?.data || blobRes], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.report.fileName || `Teaching_Record_${recId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        showToast('Official PDF downloaded successfully.', 'success');
      } else {
        showToast('PDF generated. Check Reports section for archive.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to download PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Teaching History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, search, filter, and export all past teaching sessions and inspection records.
          </p>
        </div>

        <button
          onClick={() => navigate('/create-record')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Daily Record</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, learning objective, keyword..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Filter by Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Filter by Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Class
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button if active */}
        {(dateFilter || classFilter || subjectFilter || statusFilter || searchQuery) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setDateFilter('');
                setClassFilter('');
                setSubjectFilter('');
                setStatusFilter('');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Records Content */}
      {loading ? (
        <div className="py-20 bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner message="Fetching teaching records..." />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookMarked className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No teaching records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || classFilter || subjectFilter || dateFilter || statusFilter
              ? 'Try adjusting your search query or filters to find records.'
              : 'Start logging daily records using the simple 3-step creation flow.'}
          </p>
          <button
            onClick={() => navigate('/create-record')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Daily Record</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const entryId = entry._id || entry.id;
            const recordDate = new Date(entry.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const isCompleted = entry.status === 'Completed';

            return (
              <div
                key={entryId}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {entry.status || 'Draft'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {recordDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <span>{entry.classHandled || entry.className}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-blue-600">{entry.subject}</span>
                    {entry.period && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-sm ml-auto">
                        P{entry.period}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mt-1">
                    {entry.topic || 'Classroom Teaching'}
                  </h3>

                  {entry.learningObjectives && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-2">
                      {entry.learningObjectives}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenRecordDetails(entry)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadPdf(entry)}
                      disabled={downloadingId === entryId}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/create-record?edit=${entryId}`)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit Record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(entryId)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Date & Period</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Topic Covered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const entryId = entry._id || entry.id;
                  const recordDate = new Date(entry.date).toLocaleDateString('en-GB');
                  const isCompleted = entry.status === 'Completed';

                  return (
                    <tr key={entryId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {recordDate}
                        {entry.period && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Period {entry.period}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {entry.classHandled || entry.className}
                      </td>
                      <td className="py-3 px-4 text-blue-600 font-medium">
                        {entry.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold max-w-xs truncate">
                        {entry.topic || 'Classroom Instruction'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {entry.status || 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenRecordDetails(entry)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(entry)}
                            disabled={downloadingId === entryId}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/create-record?edit=${entryId}`)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(entryId)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD DETAILS MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Teaching Record Details
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {viewRecord.topic || 'Classroom Teaching Session'}
                </h3>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">DATE</span>
                  <span className="font-bold">
                    {new Date(viewRecord.date).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">CLASS</span>
                  <span className="font-bold">
                    {viewRecord.classHandled || viewRecord.className}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">SUBJECT</span>
                  <span className="font-bold text-blue-600">{viewRecord.subject}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">PERIOD</span>
                  <span className="font-bold">Period {viewRecord.period || 1}</span>
                </div>
              </div>

              {/* 9 Fields Details */}
              <div className="space-y-4">
                {viewRecord.learningObjectives && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Learning Objectives
                    </h4>
                    <p className="text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.learningObjectives}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Methodology
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {viewRecord.teachingMethodology || 'Interactive Explanation'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Teaching Aids
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {viewRecord.teachingAids || 'Blackboard, Textbooks'}
                    </p>
                  </div>
                </div>

                {(viewRecord.classroomActivities || viewRecord.activitiesConducted) && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Classroom Activities
                    </h4>
                    <p className="text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.classroomActivities || viewRecord.activitiesConducted}
                    </p>
                  </div>
                )}

                {viewRecord.learningOutcomes && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Learning Outcomes
                    </h4>
                    <p className="text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.learningOutcomes}
                    </p>
                  </div>
                )}

                {viewRecord.studentParticipation && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Student Participation
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.studentParticipation}
                    </p>
                  </div>
                )}

                {viewRecord.assessment && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Assessment Conducted
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.assessment}
                    </p>
                  </div>
                )}

                {viewRecord.homeworkAssigned && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                      Homework / Follow-up
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {viewRecord.homeworkAssigned}
                    </p>
                  </div>
                )}

                {/* Attached Photographs */}
                {recordPhotos.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Attached Photographic Evidence ({recordPhotos.length})</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {recordPhotos.map((photo, pIdx) => (
                        <div
                          key={photo._id || photo.id || pIdx}
                          className="rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img
                            src={photo.url || `/uploads/${photo.storageKey}`}
                            alt={photo.caption || 'Evidence'}
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/200x150?text=Photo';
                            }}
                          />
                          <p className="p-1 text-[10px] text-slate-500 truncate bg-white">
                            {photo.caption || photo.originalFileName || `Photo #${pIdx + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleDownloadPdf(viewRecord)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>

              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Teaching Record?"
        message="Are you sure you want to delete this teaching diary entry? This action cannot be undone."
        confirmText="Delete Record"
        confirmVariant="danger"
      />
    </div>
  );
};

export default TeachingHistoryPage;
