import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookMarked,
  Plus,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Layers,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { diaryApi } from '../../api/diaryApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { DiaryEntryForm } from './DiaryEntryForm';

export const DailyDiaryPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Modals
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [completeTargetEntry, setCompleteTargetEntry] = useState(null);
  const [previewEntry, setPreviewEntry] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await diaryApi.getDiaryEntries();
      if (res.success && res.data) {
        setEntries(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch diary entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Derived available filter choices
  const availableClasses = useMemo(() => {
    const list = new Set(user?.classesHandled || []);
    entries.forEach((e) => e.classHandled && list.add(e.classHandled));
    return Array.from(list);
  }, [user, entries]);

  const availableSubjects = useMemo(() => {
    const list = new Set(user?.subjectsTaught || []);
    entries.forEach((e) => e.subject && list.add(e.subject));
    return Array.from(list);
  }, [user, entries]);

  // Filtering
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false;
      if (classFilter && e.classHandled !== classFilter) return false;
      if (subjectFilter && !e.subject.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
      if (dateFilter) {
        const eDateStr = new Date(e.date).toISOString().split('T')[0];
        if (eDateStr !== dateFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.topic?.toLowerCase().includes(q) ||
          e.subtopic?.toLowerCase().includes(q) ||
          e.unit?.toLowerCase().includes(q) ||
          e.chapter?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.detailedContent?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [entries, statusFilter, classFilter, subjectFilter, dateFilter, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await diaryApi.deleteDiaryEntry(deleteTargetId);
      showToast('Teaching diary entry deleted.', 'info');
      setDeleteTargetId(null);
      await fetchEntries();
    } catch (err) {
      showToast(err.message || 'Failed to delete diary record', 'error');
    }
  };

  const handleMarkComplete = async () => {
    if (!completeTargetEntry) return;
    try {
      const id = completeTargetEntry._id || completeTargetEntry.id;
      await diaryApi.updateDiaryStatus(id, 'Completed', true);
      showToast('Teaching diary entry marked Completed.', 'success');
      setCompleteTargetEntry(null);
      await fetchEntries();
    } catch (err) {
      showToast(err.message || 'Failed to complete entry', 'error');
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <DiaryEntryForm
        entry={selectedEntry}
        onSaved={async () => {
          setViewMode('list');
          setSelectedEntry(null);
          await fetchEntries();
        }}
        onCancel={() => {
          setViewMode('list');
          setSelectedEntry(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Legal Documentation
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Daily Period Register</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Daily Teaching Diary
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Log period-by-period covered topics, rich classroom transactions, lab work, and inspection notes.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedEntry(null);
            setViewMode('create');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Diary Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search box */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search topic, unit, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Partially Completed">Partially Completed</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Class filter */}
          {availableClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Subject filter */}
          {availableSubjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {(searchQuery || statusFilter || classFilter || subjectFilter || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setClassFilter('');
                setSubjectFilter('');
                setDateFilter('');
              }}
              className="text-xs text-rose-600 hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Records: <strong className="text-slate-800">{filteredEntries.length}</strong>
        </div>
      </div>

      {/* Diary Entries List */}
      {loading ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner message="Loading teaching diary records from database..." />
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No daily teaching diary records found"
          description="Start logging your daily classroom teaching transactions, learning objectives, homework, and student outcomes."
          actionLabel="Log Today's Teaching Session"
          onAction={() => {
            setSelectedEntry(null);
            setViewMode('create');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((record) => {
            const dateStr = new Date(record.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={record._id || record.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left block: Date, period & details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/70 text-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">
                      Period
                    </span>
                    <span className="text-lg font-extrabold text-slate-800 leading-none">
                      {record.period}
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {record.topic}
                      </h3>
                      <Badge
                        variant={
                          record.status === 'Completed'
                            ? 'emerald'
                            : record.status === 'Partially Completed'
                            ? 'amber'
                            : 'slate'
                        }
                      >
                        {record.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{dateStr}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-600">{record.classHandled}</span>
                      <span>•</span>
                      <span>{record.subject}</span>
                      {record.unit && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{record.unit}</span>
                        </>
                      )}
                    </div>

                    {record.learningObjectives && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        🎯 {record.learningObjectives}
                      </p>
                    )}

                    {record.homeworkAssigned && (
                      <p className="text-[11px] text-slate-600 font-medium italic">
                        📝 HW: {record.homeworkAssigned}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right block: Action buttons */}
                <div className="flex items-center gap-1.5 self-end md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <button
                    onClick={() => setPreviewEntry(record)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                    title="View Inspection Record Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {record.status !== 'Completed' && (
                    <button
                      onClick={() => setCompleteTargetEntry(record)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
                      title="Mark Completed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedEntry(record);
                      setViewMode('edit');
                    }}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                    title="Edit Record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteTargetId(record._id || record.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Teaching Diary Record?"
        message="Are you sure you want to permanently remove this daily teaching entry? This action cannot be undone."
        confirmText="Delete Record"
        type="danger"
      />

      {/* Mark Completed Confirmation Modal */}
      <ConfirmModal
        isOpen={!!completeTargetEntry}
        onClose={() => setCompleteTargetEntry(null)}
        onConfirm={handleMarkComplete}
        title="Confirm Completed Classroom Session"
        message={`I confirm that I conducted Period ${completeTargetEntry?.period} for ${completeTargetEntry?.classHandled} (${completeTargetEntry?.subject}) on ${completeTargetEntry?.date?.split('T')[0]}, covering "${completeTargetEntry?.topic}".`}
        confirmText="Confirm & Mark Completed"
        type="success"
      />

      {/* Formatted Preview Modal */}
      {previewEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Inspection Record
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {previewEntry.topic}
                </h3>
              </div>
              <button
                onClick={() => setPreviewEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl">
              <div>
                <span className="text-slate-400 block text-[10px]">Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date(previewEntry.date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Class & Section</span>
                <span className="font-semibold text-slate-800">{previewEntry.classHandled}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Subject</span>
                <span className="font-semibold text-slate-800">{previewEntry.subject}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Period</span>
                <span className="font-semibold text-slate-800">Period {previewEntry.period}</span>
              </div>
            </div>

            {previewEntry.learningObjectives && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Learning Objectives
                </h4>
                <p className="text-xs text-slate-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  {previewEntry.learningObjectives}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Detailed Teaching Content & Notes
              </h4>
              <div
                className="text-xs text-slate-700 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 leading-relaxed space-y-2"
                dangerouslySetInnerHTML={{
                  __html: previewEntry.detailedContent || '<p class="italic text-slate-400">No content entered.</p>',
                }}
              />
            </div>

            {previewEntry.homeworkAssigned && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Homework Assigned
                </h4>
                <p className="text-xs text-slate-700 font-medium">{previewEntry.homeworkAssigned}</p>
              </div>
            )}

            {previewEntry.teacherRemarks && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teacher Remarks
                </h4>
                <p className="text-xs text-slate-600 italic">{previewEntry.teacherRemarks}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400">
                Status: <strong className="text-slate-700">{previewEntry.status}</strong>
              </span>
              <button
                onClick={() => setPreviewEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
