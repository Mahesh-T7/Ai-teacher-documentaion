import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  X,
  Wrench,
  BookOpen,
  Camera,
} from 'lucide-react';
import { practicalApi } from '../../api/practicalApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const PracticalsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [practicals, setPracticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Modals & Form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewPractical, setViewPractical] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    activityTitle: '',
    date: new Date().toISOString().split('T')[0],
    className: 'Class 9',
    section: 'A',
    subject: 'Artificial Intelligence',
    unit: 'Unit 5: Introduction to Python',
    toolsAndSoftwareUsed: 'Python 3.11, IDLE, Google Colab',
    learningObjectives: 'Hands-on practice writing conditional statements and for loops.',
    practicalSteps: '1. Launch Python IDLE\n2. Create grade_evaluator.py\n3. Write decision branching logic\n4. Test with 5 edge cases',
    activityDescription: 'Students individually implemented an automated grade classification script.',
    studentParticipation: 'Individual lab work with peer code-review pairs.',
    learningOutcomes: '100% of students successfully executed the script and identified logical syntax errors.',
    teacherRemarks: 'Excellent enthusiasm; all practical logs verified in lab record book.',
    status: 'Completed',
  });

  const fetchPracticals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await practicalApi.getPracticals({
        className: classFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.practicals) {
        setPracticals(res.practicals);
      }
    } catch (err) {
      showToast('Failed to fetch practical activities', 'error');
    } finally {
      setLoading(false);
    }
  }, [classFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchPracticals();
  }, [fetchPracticals]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      activityTitle: '',
      date: new Date().toISOString().split('T')[0],
      className: 'Class 9',
      section: 'A',
      subject: 'Artificial Intelligence',
      unit: '',
      toolsAndSoftwareUsed: '',
      learningObjectives: '',
      practicalSteps: '',
      activityDescription: '',
      studentParticipation: '',
      learningOutcomes: '',
      teacherRemarks: '',
      status: 'Completed',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p._id || p.id);
    setFormData({
      activityTitle: p.activityTitle || '',
      date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
      className: p.className || 'Class 9',
      section: p.section || 'A',
      subject: p.subject || 'Artificial Intelligence',
      unit: p.unit || '',
      toolsAndSoftwareUsed: p.toolsAndSoftwareUsed || '',
      learningObjectives: p.learningObjectives || '',
      practicalSteps: p.practicalSteps || '',
      activityDescription: p.activityDescription || '',
      studentParticipation: p.studentParticipation || '',
      learningOutcomes: p.learningOutcomes || '',
      teacherRemarks: p.teacherRemarks || '',
      status: p.status || 'Completed',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.activityTitle.trim() || !formData.subject.trim()) {
      showToast('Please provide activity title and subject.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const res = await practicalApi.updatePractical(editingId, formData);
        if (res.success) {
          showToast('Practical activity updated successfully!', 'success');
        }
      } else {
        const res = await practicalApi.createPractical(formData);
        if (res.success) {
          showToast('Practical activity recorded successfully!', 'success');
        }
      }
      setShowModal(false);
      fetchPracticals();
    } catch (err) {
      showToast(err.message || 'Failed to save practical', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await practicalApi.deletePractical(deleteTargetId);
      if (res.success) {
        showToast('Practical activity deleted', 'success');
        setDeleteTargetId(null);
        fetchPracticals();
      }
    } catch (err) {
      showToast('Failed to delete practical', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Phase 4 STEM & Lab Records
            </span>
            <span className="text-xs text-slate-500 font-medium">{practicals.length} Practicals Documented</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-amber-600" />
            Practical & Laboratory Activities
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log computer science lab work, STEM experiments, hands-on demonstrations, apparatus used, and student learning outcomes.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Log Practical Activity
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Search by experiment title, unit, or software used..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All Classes</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
          </select>

          {(classFilter || searchQuery) && (
            <button
              onClick={() => {
                setClassFilter('');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Practicals List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : practicals.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No practical activities recorded"
          description="Record your classroom hands-on sessions, computer lab coding exercises, and science experiments to build official inspection logs."
          actionLabel="Log First Practical"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {practicals.map((p) => (
            <div
              key={p._id || p.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                    {p.className} ({p.section || 'A'})
                  </span>
                  <Badge variant={p.status === 'Completed' ? 'success' : 'default'} size="sm">
                    {p.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{p.activityTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{p.subject} • {p.unit || 'Lab Practical'}</p>
                </div>

                {p.toolsAndSoftwareUsed && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center gap-2 text-slate-600">
                    <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="line-clamp-1">Tools: {p.toolsAndSoftwareUsed}</span>
                  </div>
                )}

                {p.learningOutcomes && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    "{p.learningOutcomes}"
                  </p>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(p.date).toLocaleDateString()}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewPractical(p)}
                    className="p-1 hover:text-blue-600 rounded"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1 hover:text-indigo-600 rounded"
                    title="Edit activity"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(p._id || p.id)}
                    className="p-1 hover:text-rose-600 rounded"
                    title="Delete activity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-amber-600" />
                {editingId ? 'Edit Practical Activity' : 'Record Practical Activity'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Practical Activity Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    placeholder="e.g. Logic Gate Simulation with Python"
                    value={formData.activityTitle}
                    onChange={(e) => setFormData({ ...formData, activityTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tools & Software / Hardware Used</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. Python IDLE, Jupyter Notebook, Breadboards, Arduino Uno"
                  value={formData.toolsAndSoftwareUsed}
                  onChange={(e) => setFormData({ ...formData, toolsAndSoftwareUsed: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Learning Objectives</label>
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    value={formData.learningObjectives}
                    onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Student Participation Mode</label>
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    value={formData.studentParticipation}
                    onChange={(e) => setFormData({ ...formData, studentParticipation: e.target.value })}
                    placeholder="e.g. Individual lab terminals with peer pair-programming"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Practical Procedure / Steps</label>
                <textarea
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  value={formData.practicalSteps}
                  onChange={(e) => setFormData({ ...formData, practicalSteps: e.target.value })}
                  placeholder="Step-by-step instructions executed in the lab session"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Observed Learning Outcomes & Results</label>
                <textarea
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                  value={formData.learningOutcomes}
                  onChange={(e) => setFormData({ ...formData, learningOutcomes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : <FlaskConical className="w-4 h-4" />}
                  {editingId ? 'Update Activity' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewPractical && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{viewPractical.activityTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewPractical.className} • {viewPractical.subject} • {new Date(viewPractical.date).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setViewPractical(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900 block mb-0.5">Tools & Apparatus:</span>
                <p className="p-2 rounded bg-slate-50 border border-slate-100">{viewPractical.toolsAndSoftwareUsed || 'Standard lab setup'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-0.5">Learning Objectives:</span>
                <p className="p-2 rounded bg-slate-50 border border-slate-100 whitespace-pre-wrap">{viewPractical.learningObjectives || 'N/A'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-0.5">Procedure Steps:</span>
                <p className="p-2 rounded bg-slate-50 border border-slate-100 whitespace-pre-wrap">{viewPractical.practicalSteps || 'N/A'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-0.5">Learning Outcomes:</span>
                <p className="p-2 rounded bg-slate-50 border border-slate-100 whitespace-pre-wrap">{viewPractical.learningOutcomes || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewPractical(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Practical Record"
        message="Are you sure you want to delete this practical activity log?"
        confirmLabel="Delete Activity"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default PracticalsPage;
