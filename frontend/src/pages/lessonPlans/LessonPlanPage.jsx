import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Send,
  Sparkles,
  Printer,
  Download,
} from 'lucide-react';
import { lessonPlanApi } from '../../api/lessonPlanApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LessonPlanForm } from './LessonPlanForm';
import { LessonPlanPreviewModal } from '../../components/lessonPlan/LessonPlanPreviewModal';
import { downloadBlob } from '../../utils/fileDownload';

export const LessonPlanPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Modals
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [previewPlan, setPreviewPlan] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lessonPlanApi.getLessonPlans();
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch lesson plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Derived filter choices
  const availableClasses = useMemo(() => {
    const list = new Set(user?.classesHandled || []);
    plans.forEach((p) => p.classHandled && list.add(p.classHandled));
    return Array.from(list);
  }, [user, plans]);

  const availableSubjects = useMemo(() => {
    const list = new Set(user?.subjectsTaught || []);
    plans.forEach((p) => p.subject && list.add(p.subject));
    return Array.from(list);
  }, [user, plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (classFilter && p.classHandled !== classFilter) return false;
      if (subjectFilter && !p.subject.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.title?.toLowerCase().includes(q) ||
          p.topic?.toLowerCase().includes(q) ||
          p.unit?.toLowerCase().includes(q) ||
          p.learningObjectives?.toLowerCase().includes(q) ||
          p.detailedExplanation?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [plans, statusFilter, classFilter, subjectFilter, searchQuery]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await lessonPlanApi.deleteLessonPlan(deleteTargetId);
      showToast('Lesson plan deleted.', 'info');
      setDeleteTargetId(null);
      await fetchPlans();
    } catch (err) {
      showToast(err.message || 'Failed to delete lesson plan', 'error');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await lessonPlanApi.duplicatePlan(id);
      showToast('Cloned lesson plan created as Draft!', 'success');
      await fetchPlans();
    } catch (err) {
      showToast(err.message || 'Duplication failed', 'error');
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await lessonPlanApi.updateApproval(id, nextStatus);
      showToast(`Lesson plan updated to ${nextStatus}.`, 'success');
      await fetchPlans();
    } catch (err) {
      showToast(err.message || 'Failed to update approval status', 'error');
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <LessonPlanForm
        plan={selectedPlan}
        onSaved={async () => {
          setViewMode('list');
          setSelectedPlan(null);
          await fetchPlans();
        }}
        onCancel={() => {
          setViewMode('list');
          setSelectedPlan(null);
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
              Curriculum Architecture
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">5E Instructional Models</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
            Lesson Plans Manager
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Create, duplicate, submit, and approve standardized pedagogical unit plans.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedPlan(null);
            setViewMode('create');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Lesson Plan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search box */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, objectives, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Submitted">Submitted</option>
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

          {(searchQuery || statusFilter || classFilter || subjectFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setClassFilter('');
                setSubjectFilter('');
              }}
              className="text-xs text-rose-600 hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Lesson Plans: <strong className="text-slate-800">{filteredPlans.length}</strong>
        </div>
      </div>

      {/* Lesson Plans Grid */}
      {loading ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner message="Loading lesson plans from database..." />
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lesson plans created yet"
          description="Design structured 5E lesson plans aligned with your school curriculum, learning objectives, and teaching aids."
          actionLabel="Create First Lesson Plan"
          onAction={() => {
            setSelectedPlan(null);
            setViewMode('create');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan._id || plan.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                    {plan.subject}
                  </span>
                  <Badge
                    variant={
                      plan.status === 'Approved'
                        ? 'emerald'
                        : plan.status === 'Submitted'
                        ? 'blue'
                        : 'slate'
                    }
                  >
                    {plan.status}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {plan.title}
                </h3>

                {/* Meta row */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{plan.classHandled}</span>
                  <span>•</span>
                  <span>{plan.durationMinutes || 45} mins</span>
                  {plan.unit && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{plan.unit}</span>
                    </>
                  )}
                </div>

                {/* Objectives */}
                {plan.learningObjectives && (
                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    🎯 {plan.learningObjectives}
                  </p>
                )}

                {/* Methodology */}
                {plan.teachingMethodology && (
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Method:</span> {plan.teachingMethodology}
                  </p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-1 pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewPlan(plan)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Preview Official A4 Lesson Plan"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPreviewPlan(plan)}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                    title="Print Lesson Plan"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const res = await lessonPlanApi.downloadLessonPlanPdf(plan._id || plan.id);
                        const safeClass = (plan.className || 'Class9').replace(/[^a-zA-Z0-9_\-]/g, '');
                        const safeSub = (plan.subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '');
                        downloadBlob(
                          res,
                          `LessonPlan_${safeClass}_${safeSub}_${new Date().toISOString().split('T')[0]}.pdf`,
                          'application/pdf'
                        );
                        showToast('Lesson plan PDF downloaded!', 'success');
                      } catch (e) {
                        showToast(e.message || 'Failed to download PDF.', 'error');
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Download Official PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(plan._id || plan.id)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    title="Duplicate as New Plan"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setViewMode('edit');
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {plan.status === 'Draft' && (
                    <button
                      onClick={() => handleStatusChange(plan._id || plan.id, 'Submitted')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      Submit
                    </button>
                  )}

                  {plan.status === 'Submitted' && (
                    <button
                      onClick={() => handleStatusChange(plan._id || plan.id, 'Approved')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                    >
                      Approve
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteTargetId(plan._id || plan.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Lesson Plan?"
        message="Are you sure you want to permanently remove this lesson plan? Any existing diary entries referencing this plan will remain intact."
        confirmText="Delete Plan"
        type="danger"
      />

      {/* Official A4 Printable Lesson Plan Modal */}
      <LessonPlanPreviewModal
        isOpen={!!previewPlan}
        onClose={() => setPreviewPlan(null)}
        plan={previewPlan}
        onEdit={() => {
          setSelectedPlan(previewPlan);
          setViewMode('edit');
          setPreviewPlan(null);
        }}
      />
    </div>
  );
};
