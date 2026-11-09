import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Users,
  Award,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { diaryApi } from '../../api/diaryApi';
import { timetableApi } from '../../api/timetableApi';
import { lessonPlanApi } from '../../api/lessonPlanApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DiaryEntryForm = ({ entry = null, onSaved, onCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const getTodayKolkata = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  };

  const getWeekdayKolkata = (dateStr) => {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
    }).format(new Date(dateStr));
  };

  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'lesson' | 'content' | 'activities' | 'outcomes' | 'completion'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmCompleteModalOpen, setConfirmCompleteModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Timetable and Lesson Plans dropdown options
  const [timetableOptions, setTimetableOptions] = useState([]);
  const [lessonPlanOptions, setLessonPlanOptions] = useState([]);

  const [formData, setFormData] = useState({
    date: entry?.date ? new Date(entry.date).toISOString().split('T')[0] : getTodayKolkata(),
    dayOfWeek: entry?.dayOfWeek || getWeekdayKolkata(getTodayKolkata()),
    className: entry?.className || 'Class 10',
    section: entry?.section || 'A',
    classHandled: entry?.classHandled || 'Class 10-A',
    subject: entry?.subject || (user?.subjectsTaught?.[0] || 'Physics'),
    period: entry?.period || 1,
    startTime: entry?.startTime || '09:00',
    endTime: entry?.endTime || '09:45',
    timetableEntryId: entry?.timetableEntryId || '',
    lessonPlanId: entry?.lessonPlanId || '',

    // Lesson info
    unit: entry?.unit || '',
    chapter: entry?.chapter || '',
    topic: entry?.topic || '',
    subtopic: entry?.subtopic || '',
    learningObjectives: entry?.learningObjectives || '',
    previousKnowledge: entry?.previousKnowledge || '',
    introduction: entry?.introduction || '',
    teachingMethodology: entry?.teachingMethodology || 'Interactive Explanation',
    teachingAids: entry?.teachingAids || '',

    // Rich Detailed Content
    detailedContent: entry?.detailedContent || '',

    // Activities
    activitiesConducted: entry?.activitiesConducted || '',
    studentParticipation: entry?.studentParticipation || '',
    groupDiscussions: entry?.groupDiscussions || '',
    practicalDemonstrations: entry?.practicalDemonstrations || '',
    teachingMaterialsUsed: entry?.teachingMaterialsUsed || '',

    // Outcomes
    learningOutcomes: entry?.learningOutcomes || '',
    skillsDeveloped: entry?.skillsDeveloped || '',
    learningDifficultiesObserved: entry?.learningDifficultiesObserved || '',
    studentsRequiringSupport: entry?.studentsRequiringSupport || '',

    // Completion
    homeworkAssigned: entry?.homeworkAssigned || '',
    teacherRemarks: entry?.teacherRemarks || '',
    nextClassPlan: entry?.nextClassPlan || '',
    status: entry?.status || 'Draft',
    teacherConfirmed: entry?.teacherConfirmed || false,
  });

  // Fetch teacher's timetable and approved lesson plans
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [ttRes, lpRes] = await Promise.all([
          timetableApi.getTimetable(),
          lessonPlanApi.getLessonPlans({ status: 'Approved' }),
        ]);
        if (ttRes.success && ttRes.data) setTimetableOptions(ttRes.data);
        if (lpRes.success && lpRes.data) setLessonPlanOptions(lpRes.data);
      } catch (err) {
        console.warn('Prerequisites fetch failed:', err.message);
      }
    };
    loadPrerequisites();
  }, []);

  const handleDateChange = (newDate) => {
    const weekday = getWeekdayKolkata(newDate);
    setFormData((prev) => ({
      ...prev,
      date: newDate,
      dayOfWeek: weekday,
    }));
  };

  // Populate from Timetable selection
  const handleSelectTimetable = (ttId) => {
    if (!ttId) return;
    const found = timetableOptions.find((t) => String(t._id || t.id) === String(ttId));
    if (found) {
      setFormData((prev) => ({
        ...prev,
        timetableEntryId: found._id || found.id,
        period: found.period,
        startTime: found.startTime,
        endTime: found.endTime,
        className: found.className,
        section: found.section,
        classHandled: found.classHandled,
        subject: found.subject,
      }));
      showToast(`Period details loaded from Timetable (${found.dayOfWeek}, Period ${found.period}).`, 'info');
    }
  };

  // Populate from Approved Lesson Plan selection
  const handleSelectLessonPlan = (lpId) => {
    if (!lpId) return;
    const found = lessonPlanOptions.find((p) => String(p._id || p.id) === String(lpId));
    if (found) {
      setFormData((prev) => ({
        ...prev,
        lessonPlanId: found._id || found.id,
        className: found.className || prev.className,
        section: found.section || prev.section,
        classHandled: found.classHandled || prev.classHandled,
        subject: found.subject || prev.subject,
        unit: found.unit || prev.unit,
        chapter: found.chapter || prev.chapter,
        topic: found.topic || found.title || prev.topic,
        learningObjectives: found.learningObjectives || prev.learningObjectives,
        previousKnowledge: found.previousKnowledge || prev.previousKnowledge,
        introduction: found.introduction || prev.introduction,
        teachingMethodology: found.teachingMethodology || prev.teachingMethodology,
        teachingAids: found.teachingAids || prev.teachingAids,
        activitiesConducted: found.classroomActivities || prev.activitiesConducted,
        homeworkAssigned: found.homework || prev.homeworkAssigned,
        // Notice: Approved lesson plan does NOT change status to Completed. Teacher must confirm!
      }));
      showToast(`Linked Lesson Plan "${found.title}". Objectives and topic imported.`, 'info');
    }
  };

  const handleSave = async (targetStatus, isConfirmed = false) => {
    setError('');

    if (!formData.date || !formData.className.trim() || !formData.subject.trim() || !formData.topic.trim()) {
      setError('Please provide date, class, subject, period, and topic covered in Section A & B.');
      setActiveTab('basic');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: targetStatus,
        teacherConfirmed: isConfirmed,
      };

      let result;
      if (entry) {
        const id = entry._id || entry.id;
        result = await diaryApi.updateDiaryEntry(id, payload);
      } else {
        result = await diaryApi.createDiaryEntry(payload);
      }

      if (result.warning) {
        showToast(result.warning, 'warning', 6000);
      }

      showToast(
        targetStatus === 'Completed'
          ? 'Teaching Diary session verified and marked Completed!'
          : 'Teaching Diary saved as Draft.',
        'success'
      );

      if (onSaved) onSaved(result.data);
    } catch (err) {
      setError(err.message || 'Failed to save daily diary entry');
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSubmitting(false);
      setConfirmCompleteModalOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Return to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {entry ? 'Edit Daily Teaching Diary Entry' : 'New Daily Teaching Diary Record'}
              </h2>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                  formData.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {formData.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Institutional teaching diary documenting classroom transactions and student learning.
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Entry</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('Draft', false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmCompleteModalOpen(true)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Completed</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Logical Section Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'basic' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>A. Basic Period Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lesson')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'lesson' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>B. Lesson Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'content' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>C. Detailed Teaching Content</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activities')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'activities' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>D. Activities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outcomes')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'outcomes' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>E. Outcomes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completion')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'completion' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>F. Completion & Notes</span>
        </button>
      </div>

      {/* SECTION A: Basic Information */}
      {activeTab === 'basic' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Quick autofill helpers */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                📅 Auto-populate from Timetable Slot
              </label>
              <select
                onChange={(e) => handleSelectTimetable(e.target.value)}
                value={formData.timetableEntryId}
                className="w-full text-xs bg-white border border-blue-200 rounded-xl px-3 py-2 text-slate-700"
              >
                <option value="">-- Select from your weekly timetable --</option>
                {timetableOptions.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.dayOfWeek} • Period {t.period} ({t.timeSlot}) • {t.classHandled} ({t.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                📚 Link Approved Lesson Plan
              </label>
              <select
                onChange={(e) => handleSelectLessonPlan(e.target.value)}
                value={formData.lessonPlanId}
                className="w-full text-xs bg-white border border-indigo-200 rounded-xl px-3 py-2 text-slate-700"
              >
                <option value="">-- Link approved curriculum plan (optional) --</option>
                {lessonPlanOptions.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.title} ({p.subject} • {p.classHandled})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teaching Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Day of Week
              </label>
              <input
                type="text"
                value={formData.dayOfWeek}
                readOnly
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period Number *
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                  <option key={p} value={p}>
                    Period {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value="2026-2027"
                readOnly
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class Name *
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    className: e.target.value,
                    classHandled: `${e.target.value}-${formData.section}`,
                  })
                }
                placeholder="e.g. Class 10"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    section: e.target.value,
                    classHandled: `${formData.className}-${e.target.value}`,
                  })
                }
                placeholder="e.g. A"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Physics"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period Time Window
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teacher Name
              </label>
              <input
                type="text"
                value={user?.fullName || ''}
                readOnly
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                School Name
              </label>
              <input
                type="text"
                value={user?.schoolName || ''}
                readOnly
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: Lesson Information */}
      {activeTab === 'lesson' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit / Module
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. Unit 4 - Electricity & Magnetism"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Chapter
              </label>
              <input
                type="text"
                value={formData.chapter}
                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                placeholder="e.g. Chapter 12 - Magnetic Effects of Current"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Topic Covered *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Faraday’s Experiments & Electromagnetic Induction"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subtopic / Specific Concepts
              </label>
              <input
                type="text"
                value={formData.subtopic}
                onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                placeholder="e.g. Direction of induced current and Lenz’s Law"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Learning Objectives
            </label>
            <textarea
              rows={2}
              value={formData.learningObjectives}
              onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
              placeholder="e.g. Students will be able to state Faraday's laws and identify factors influencing induced electromotive force."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Previous Knowledge Tested
              </label>
              <input
                type="text"
                value={formData.previousKnowledge}
                onChange={(e) => setFormData({ ...formData, previousKnowledge: e.target.value })}
                placeholder="e.g. Magnetic lines of force, magnetic field of current loop"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Introduction / Hook
              </label>
              <input
                type="text"
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                placeholder="e.g. Show bicycle dynamo and ask how light glows without battery"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teaching Methodology
              </label>
              <input
                type="text"
                value={formData.teachingMethodology}
                onChange={(e) => setFormData({ ...formData, teachingMethodology: e.target.value })}
                placeholder="e.g. Interactive Demonstration, Socratic Questioning"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teaching Aids / Materials Used
              </label>
              <input
                type="text"
                value={formData.teachingAids}
                onChange={(e) => setFormData({ ...formData, teachingAids: e.target.value })}
                placeholder="e.g. Bar magnet, copper coil, galvanometer, smartboard animation"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: Detailed Teaching Content (Rich Text) */}
      {activeTab === 'content' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Detailed Classroom Execution Record
              </h3>
              <p className="text-[11px] text-slate-500">
                Document classroom explanations, derivations, board work, student questions, and discussions. Formatting is saved directly in MongoDB.
              </p>
            </div>
          </div>

          <RichTextEditor
            value={formData.detailedContent}
            onChange={(content) => setFormData({ ...formData, detailedContent: content })}
            minHeight="280px"
          />
        </div>
      )}

      {/* SECTION D: Classroom Activities */}
      {activeTab === 'activities' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Activities Conducted in Classroom
            </label>
            <textarea
              rows={2}
              value={formData.activitiesConducted}
              onChange={(e) => setFormData({ ...formData, activitiesConducted: e.target.value })}
              placeholder="e.g. In pairs, students used bar magnets and coils to observe galvanometer deflection directions."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Student Participation & Engagement
              </label>
              <input
                type="text"
                value={formData.studentParticipation}
                onChange={(e) => setFormData({ ...formData, studentParticipation: e.target.value })}
                placeholder="e.g. 85% active engagement, all rows answered observational questions"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Group Discussions Held
              </label>
              <input
                type="text"
                value={formData.groupDiscussions}
                onChange={(e) => setFormData({ ...formData, groupDiscussions: e.target.value })}
                placeholder="e.g. Discussed why no current flows when the magnet is stationary inside coil"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Practical Demonstrations
              </label>
              <input
                type="text"
                value={formData.practicalDemonstrations}
                onChange={(e) => setFormData({ ...formData, practicalDemonstrations: e.target.value })}
                placeholder="e.g. Demonstration of magnetic flux variation using solenoid apparatus"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teaching Materials Used
              </label>
              <input
                type="text"
                value={formData.teachingMaterialsUsed}
                onChange={(e) => setFormData({ ...formData, teachingMaterialsUsed: e.target.value })}
                placeholder="e.g. NCERT textbook diagrams 12.14, galvanometer, lab connecting wires"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION E: Learning Outcomes */}
      {activeTab === 'outcomes' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              What Students Understood
            </label>
            <textarea
              rows={2}
              value={formData.learningOutcomes}
              onChange={(e) => setFormData({ ...formData, learningOutcomes: e.target.value })}
              placeholder="e.g. Students understood that induced current requires relative motion and that deflection reverses when magnet direction reverses."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Skills Developed
            </label>
            <input
              type="text"
              value={formData.skillsDeveloped}
              onChange={(e) => setFormData({ ...formData, skillsDeveloped: e.target.value })}
              placeholder="e.g. Scientific observation, causal reasoning, interpreting analog meter readings"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Learning Difficulties Observed
              </label>
              <textarea
                rows={2}
                value={formData.learningDifficultiesObserved}
                onChange={(e) => setFormData({ ...formData, learningDifficultiesObserved: e.target.value })}
                placeholder="e.g. Few students confused magnetic flux with magnetic field intensity."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Students Requiring Additional Support
              </label>
              <textarea
                rows={2}
                value={formData.studentsRequiringSupport}
                onChange={(e) => setFormData({ ...formData, studentsRequiringSupport: e.target.value })}
                placeholder="e.g. Roll numbers 14, 23, and 31 need revision on magnetic pole conventions."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION F: Completion & Remarks */}
      {activeTab === 'completion' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Homework Assigned
            </label>
            <input
              type="text"
              value={formData.homeworkAssigned}
              onChange={(e) => setFormData({ ...formData, homeworkAssigned: e.target.value })}
              placeholder="e.g. Chapter 12 Exercise Questions 1 to 5; draw Lenz’s law diagram in notebook."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teacher Reflective Remarks
              </label>
              <textarea
                rows={3}
                value={formData.teacherRemarks}
                onChange={(e) => setFormData({ ...formData, teacherRemarks: e.target.value })}
                placeholder="e.g. Class pace was optimal. Demonstration generated high curiosity. Need 10 minutes next class for numerical problems."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Next Class Plan
              </label>
              <textarea
                rows={3}
                value={formData.nextClassPlan}
                onChange={(e) => setFormData({ ...formData, nextClassPlan: e.target.value })}
                placeholder="e.g. Fleming’s Right-Hand Rule and working principles of AC electric generator."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          {/* Session Status selection */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Teaching Execution Status
            </label>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="status"
                  value="Draft"
                  checked={formData.status === 'Draft'}
                  onChange={() => setFormData({ ...formData, status: 'Draft' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Draft (In Progress)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="status"
                  value="Partially Completed"
                  checked={formData.status === 'Partially Completed'}
                  onChange={() => setFormData({ ...formData, status: 'Partially Completed' })}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Partially Completed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="status"
                  value="Completed"
                  checked={formData.status === 'Completed'}
                  onChange={() => setFormData({ ...formData, status: 'Completed' })}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Completed (Session Verified)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Form Bottom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('Draft', false)}
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmCompleteModalOpen(true)}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark as Completed</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Marking Completed */}
      <ConfirmModal
        isOpen={confirmCompleteModalOpen}
        onClose={() => setConfirmCompleteModalOpen(false)}
        onConfirm={() => handleSave('Completed', true)}
        title="Confirm Completed Classroom Session"
        message={`I confirm that I conducted ${formData.classHandled} (${formData.subject}) during Period ${formData.period} on ${formData.date}, covering "${formData.topic || 'the specified topic'}".`}
        confirmText="Confirm & Mark Completed"
        type="success"
        loading={submitting}
      />

      {/* Formatted Entry Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Official Teaching Diary Record
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {formData.topic || 'Classroom Teaching Session'}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-2xl">
              <div>
                <span className="text-slate-400 block text-[10px]">Date & Day</span>
                <span className="font-semibold text-slate-800">{formData.date} ({formData.dayOfWeek})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Class & Section</span>
                <span className="font-semibold text-slate-800">{formData.classHandled}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Subject</span>
                <span className="font-semibold text-slate-800">{formData.subject}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Period</span>
                <span className="font-semibold text-slate-800">Period {formData.period}</span>
              </div>
            </div>

            {formData.learningObjectives && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Learning Objectives</h4>
                <p className="text-xs text-slate-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  {formData.learningObjectives}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Detailed Teaching Content</h4>
              <div
                className="text-xs text-slate-700 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: formData.detailedContent || '<p class="italic text-slate-400">No content entered.</p>',
                }}
              />
            </div>

            {formData.homeworkAssigned && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Homework Assigned</h4>
                <p className="text-xs text-slate-700 font-medium">{formData.homeworkAssigned}</p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
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
