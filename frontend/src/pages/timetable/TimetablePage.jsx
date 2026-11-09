import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  BookOpen,
  MapPin,
  Trash2,
  Edit2,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { timetableApi } from '../../api/timetableApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const DEFAULT_TIMINGS = {
  1: { start: '09:00', end: '09:45' },
  2: { start: '09:45', end: '10:30' },
  3: { start: '10:45', end: '11:30' },
  4: { start: '11:30', end: '12:15' },
  5: { start: '13:00', end: '13:45' },
  6: { start: '13:45', end: '14:30' },
  7: { start: '14:35', end: '15:20' },
  8: { start: '15:20', end: '16:00' },
};

export const TimetablePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    dayOfWeek: 'Monday',
    period: 1,
    startTime: '09:00',
    endTime: '09:45',
    className: 'Class 10',
    section: 'A',
    subject: '',
    room: 'Room 101',
    remarks: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      const res = await timetableApi.getTimetable();
      if (res.success && res.data) {
        setEntries(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch timetable', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Available subjects and classes derived from teacher profile + entries
  const availableSubjects = useMemo(() => {
    const list = new Set(user?.subjectsTaught || []);
    entries.forEach((e) => e.subject && list.add(e.subject));
    if (list.size === 0) {
      list.add('Physics');
      list.add('Chemistry');
      list.add('Mathematics');
      list.add('General Science');
    }
    return Array.from(list);
  }, [user, entries]);

  const availableClasses = useMemo(() => {
    const list = new Set(user?.classesHandled || []);
    entries.forEach((e) => e.classHandled && list.add(e.classHandled));
    if (list.size === 0) {
      list.add('Class 9-A');
      list.add('Class 10-A');
      list.add('Class 11-A');
      list.add('Class 12-A');
    }
    return Array.from(list);
  }, [user, entries]);

  const handleOpenAddModal = (defaultDay = 'Monday', defaultPeriod = 1) => {
    setEditingEntry(null);
    setFormError('');
    const timing = DEFAULT_TIMINGS[defaultPeriod] || { start: '09:00', end: '09:45' };

    setFormData({
      dayOfWeek: defaultDay,
      period: defaultPeriod,
      startTime: timing.start,
      endTime: timing.end,
      className: 'Class 10',
      section: 'A',
      subject: availableSubjects[0] || 'Physics',
      room: 'Room 101',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setFormError('');
    setFormData({
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      startTime: entry.startTime,
      endTime: entry.endTime,
      className: entry.className,
      section: entry.section || 'A',
      subject: entry.subject,
      room: entry.room || 'Main Classroom',
      remarks: entry.remarks || '',
    });
    setModalOpen(true);
  };

  const handlePeriodChange = (p) => {
    const num = Number(p);
    const timing = DEFAULT_TIMINGS[num];
    setFormData((prev) => ({
      ...prev,
      period: num,
      startTime: timing ? timing.start : prev.startTime,
      endTime: timing ? timing.end : prev.endTime,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.subject.trim()) {
      setFormError('Please select or specify a subject.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEntry) {
        const id = editingEntry._id || editingEntry.id;
        await timetableApi.updateTimetable(id, formData);
        showToast('Timetable period updated successfully!', 'success');
      } else {
        await timetableApi.createTimetable(formData);
        showToast('Period added to your weekly schedule!', 'success');
      }
      setModalOpen(false);
      await fetchTimetable();
    } catch (err) {
      setFormError(err.message || 'Failed to save timetable entry');
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await timetableApi.deleteTimetable(deleteTargetId);
      showToast('Timetable period removed.', 'info');
      setDeleteTargetId(null);
      await fetchTimetable();
    } catch (err) {
      showToast(err.message || 'Failed to delete period', 'error');
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedDayFilter && entry.dayOfWeek !== selectedDayFilter) return false;
      if (selectedClassFilter && entry.classHandled !== selectedClassFilter) return false;
      if (
        selectedSubjectFilter &&
        !entry.subject.toLowerCase().includes(selectedSubjectFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [entries, selectedDayFilter, selectedClassFilter, selectedSubjectFilter]);

  // Lookup map: `${day}_${period}` -> entry
  const gridMap = useMemo(() => {
    const map = {};
    filteredEntries.forEach((e) => {
      map[`${e.dayOfWeek}_${e.period}`] = e;
    });
    return map;
  }, [filteredEntries]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Academic Schedule
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Monday to Saturday Grid</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Weekly Timetable Manager
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Configure period allocations, room assignments, and bell schedule transitions.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timetable Period</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Weekday filter */}
          <select
            value={selectedDayFilter}
            onChange={(e) => setSelectedDayFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Working Days (Mon - Sat)</option>
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Class filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {availableClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Subject filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Subjects</option>
            {availableSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {(selectedDayFilter || selectedClassFilter || selectedSubjectFilter) && (
            <button
              onClick={() => {
                setSelectedDayFilter('');
                setSelectedClassFilter('');
                setSelectedSubjectFilter('');
              }}
              className="text-xs text-rose-600 hover:underline px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Scheduled Periods: <strong className="text-slate-800">{entries.length}</strong>
        </div>
      </div>

      {/* Main Weekly Grid */}
      {loading ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner message="Loading weekly timetable grid from database..." />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No timetable periods configured yet"
          description="Build your weekly period schedule to track classroom sessions and auto-populate your daily teaching diaries."
          actionLabel="Add First Period Slot"
          onAction={() => handleOpenAddModal('Monday', 1)}
        />
      ) : (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Table Header: Days */}
            <div className="grid grid-cols-7 gap-2 pb-3 mb-2 border-b border-slate-100 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
                Period / Time
              </div>
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className={`text-xs font-bold py-1 px-2 rounded-xl transition ${
                    selectedDayFilter === day
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 bg-slate-50'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Rows: Period by Period */}
            <div className="space-y-2">
              {PERIOD_NUMBERS.map((p) => {
                const defaultTime = DEFAULT_TIMINGS[p];
                return (
                  <div key={p} className="grid grid-cols-7 gap-2 items-stretch">
                    {/* Time Column */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-center">
                      <span className="text-xs font-extrabold text-blue-600">Period {p}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {defaultTime ? `${defaultTime.start} - ${defaultTime.end}` : ''}
                      </span>
                    </div>

                    {/* Day Cells */}
                    {WEEKDAYS.map((day) => {
                      const entry = gridMap[`${day}_${p}`];
                      return (
                        <div
                          key={`${day}_${p}`}
                          className={`min-h-[92px] p-2.5 rounded-xl border transition group relative flex flex-col justify-between ${
                            entry
                              ? 'bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-blue-200/70 hover:shadow-md'
                              : 'bg-slate-50/30 border-dashed border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {entry ? (
                            <>
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {entry.subject}
                                  </span>
                                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">
                                    {entry.classHandled}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{entry.room}</span>
                                </div>
                                {entry.remarks && (
                                  <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                                    {entry.remarks}
                                  </p>
                                )}
                              </div>

                              {/* Hover action toolbar */}
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition mt-1 pt-1 border-t border-blue-100">
                                <button
                                  onClick={() => handleOpenEditModal(entry)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                                  title="Edit Period"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setDeleteTargetId(entry._id || entry.id)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded transition"
                                  title="Delete Period"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenAddModal(day, p)}
                              className="w-full h-full flex flex-col items-center justify-center text-slate-300 hover:text-blue-600 transition"
                              title={`Schedule ${day} Period ${p}`}
                            >
                              <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                              <span className="text-[10px] opacity-0 group-hover:opacity-100 font-medium">
                                Add
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Period Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingEntry ? 'Edit Scheduled Period' : 'Add Period to Timetable'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure weekday, period timing, class section, and room assignment.
                </p>
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2.5 p-3 mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Day & Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Weekday *
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Period Number *
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {PERIOD_NUMBERS.map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Class & Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g. Class 10"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Subject & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Physics"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g. Room 204 / Physics Lab"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Optional Remarks / Notes
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Lab demonstration period, zero hour, etc."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEntry ? 'Save Changes' : 'Add Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Timetable Period?"
        message="Are you sure you want to remove this period from your weekly timetable? Historical diary records will retain their original period information."
        confirmText="Delete Period"
        type="danger"
      />
    </div>
  );
};
