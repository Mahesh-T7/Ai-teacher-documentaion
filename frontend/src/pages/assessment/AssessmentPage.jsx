import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Trash2,
  Edit2,
  Eye,
  X,
  Save,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { assessmentApi } from '../../api/assessmentApi';
import { attendanceApi } from '../../api/attendanceApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const ASSESSMENT_TYPES = [
  'Quiz',
  'Assignment',
  'Unit Test',
  'Practical Assessment',
  'Project',
  'Classroom Activity',
];

export const AssessmentPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'analytics'
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewAssessment, setViewAssessment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Analytics summary state
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Assessment Form State
  const [formData, setFormData] = useState({
    assessmentTitle: '',
    assessmentType: 'Quiz',
    date: new Date().toISOString().split('T')[0],
    className: 'Class 9',
    section: 'A',
    subject: 'Artificial Intelligence',
    maximumMarks: 20,
    associatedUnit: 'Unit 1: AI Reflection and Ethics',
    learningGapsIdentified: '',
    remedialActionPlan: '',
    teacherRemarks: '',
    studentMarks: [],
  });

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentApi.getAssessments({
        className: classFilter || undefined,
        assessmentType: typeFilter || undefined,
      });
      if (res.success && res.assessments) {
        setAssessments(res.assessments);
      }
    } catch (err) {
      showToast('Failed to fetch assessments', 'error');
    } finally {
      setLoading(false);
    }
  }, [classFilter, typeFilter, showToast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Load Remedial & Performance Analytics
  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await assessmentApi.getSummaryOverview({
        className: classFilter || undefined,
      });
      if (res.success) {
        setSummaryData(res);
      }
    } catch (err) {
      showToast('Failed to load performance analytics', 'error');
    } finally {
      setLoadingSummary(false);
    }
  }, [classFilter, showToast]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadSummary();
    }
  }, [activeTab, loadSummary]);

  // Open Create Modal & load class roster for marks entry
  const handleOpenCreate = async () => {
    setEditingId(null);
    try {
      const stuRes = await attendanceApi.getStudents({
        className: 'Class 9',
        section: 'A',
      });
      const roster = stuRes.students || [];
      const defaultMarks = roster.map((s) => ({
        studentId: s._id || s.id,
        studentName: s.studentName,
        rollNumber: s.rollNumber,
        marksObtained: 0,
        percentage: 0,
        remarks: '',
      }));

      setFormData({
        assessmentTitle: '',
        assessmentType: 'Quiz',
        date: new Date().toISOString().split('T')[0],
        className: 'Class 9',
        section: 'A',
        subject: 'Artificial Intelligence',
        maximumMarks: 20,
        associatedUnit: '',
        learningGapsIdentified: '',
        remedialActionPlan: '',
        teacherRemarks: '',
        studentMarks: defaultMarks,
      });
      setShowModal(true);
    } catch (err) {
      showToast('Could not load student roster', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (a) => {
    setEditingId(a._id || a.id);
    setFormData({
      assessmentTitle: a.assessmentTitle || '',
      assessmentType: a.assessmentType || 'Quiz',
      date: a.date ? new Date(a.date).toISOString().split('T')[0] : '',
      className: a.className || 'Class 9',
      section: a.section || 'A',
      subject: a.subject || 'Artificial Intelligence',
      maximumMarks: a.maximumMarks || 20,
      associatedUnit: a.associatedUnit || '',
      learningGapsIdentified: a.learningGapsIdentified || '',
      remedialActionPlan: a.remedialActionPlan || '',
      teacherRemarks: a.teacherRemarks || '',
      studentMarks: a.studentMarks || [],
    });
    setShowModal(true);
  };

  // Update marks for student in form
  const handleStudentMarkChange = (rollNumber, marksVal) => {
    const val = Number(marksVal) || 0;
    const max = Number(formData.maximumMarks) || 1;
    const pct = Math.round((val / max) * 100);

    setFormData((prev) => ({
      ...prev,
      studentMarks: prev.studentMarks.map((m) =>
        m.rollNumber === rollNumber
          ? { ...m, marksObtained: val, percentage: pct }
          : m
      ),
    }));
  };

  const handleStudentRemarkChange = (rollNumber, remarks) => {
    setFormData((prev) => ({
      ...prev,
      studentMarks: prev.studentMarks.map((m) =>
        m.rollNumber === rollNumber ? { ...m, remarks } : m
      ),
    }));
  };

  // Calculate live averages in modal
  const maxM = Number(formData.maximumMarks) || 1;
  const currentAppeared = formData.studentMarks.length;
  const currentAvgMarks =
    currentAppeared > 0
      ? (
          formData.studentMarks.reduce((sum, m) => sum + (Number(m.marksObtained) || 0), 0) /
          currentAppeared
        ).toFixed(1)
      : 0;
  const currentAvgPct =
    maxM > 0 ? Math.round((Number(currentAvgMarks) / maxM) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assessmentTitle.trim() || !formData.subject.trim()) {
      showToast('Title and Subject are required.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const res = await assessmentApi.updateAssessment(editingId, formData);
        if (res.success) {
          showToast('Assessment updated successfully!', 'success');
        }
      } else {
        const res = await assessmentApi.createAssessment(formData);
        if (res.success) {
          showToast('Assessment and marks recorded successfully!', 'success');
        }
      }
      setShowModal(false);
      fetchAssessments();
    } catch (err) {
      showToast(err.message || 'Failed to save assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await assessmentApi.deleteAssessment(deleteTargetId);
      if (res.success) {
        showToast('Assessment deleted', 'success');
        setDeleteTargetId(null);
        fetchAssessments();
      }
    } catch (err) {
      showToast('Failed to delete assessment', 'error');
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    if (searchQuery && !a.assessmentTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Phase 4 Assessment & Learning Gaps
            </span>
            <span className="text-xs text-slate-500 font-medium">{assessments.length} Assessments Conducted</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-rose-600" />
            Assessments & Student Evaluation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Record unit tests, quizzes, practical evaluations, and track class averages and learning gaps needing remedial attention.
          </p>
        </div>

        {/* Tab Controls & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Assessments List
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Learning Gaps
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Assessment
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        /* ASSESSMENTS LIST VIEW */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Search by assessment title..."
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

              <select
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {(classFilter || typeFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setClassFilter('');
                    setTypeFilter('');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-600 hover:underline font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredAssessments.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="No assessments recorded yet"
              description="Record test scores, quizzes, and classroom assignments to analyze student progress and identify learning gaps."
              actionLabel="Create Assessment"
              onAction={handleOpenCreate}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssessments.map((a) => (
                <div
                  key={a._id || a.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800">
                        {a.assessmentType}
                      </span>
                      <span className="text-slate-400 font-medium">
                        Max Marks: <strong className="text-slate-700">{a.maximumMarks}</strong>
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{a.assessmentTitle}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {a.className} ({a.section || 'A'}) • {a.subject}
                      </p>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Class Avg</span>
                        <span className="font-bold text-slate-800">{a.classAverage}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Highest</span>
                        <span className="font-bold text-emerald-600">{a.highestMarks}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Lowest</span>
                        <span className="font-bold text-rose-600">{a.lowestMarks}</span>
                      </div>
                    </div>

                    {a.learningGapsIdentified && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-100 line-clamp-2">
                        ⚠️ <strong>Gap:</strong> {a.learningGapsIdentified}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewAssessment(a)}
                        className="p-1 hover:text-blue-600 rounded"
                        title="View Marks"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="p-1 hover:text-indigo-600 rounded"
                        title="Edit Marks"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(a._id || a.id)}
                        className="p-1 hover:text-rose-600 rounded"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* LEARNING GAPS & REMEDIAL ANALYTICS VIEW */
        <div className="space-y-4">
          {loadingSummary ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : !summaryData || summaryData.totalAssessments === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              No assessments recorded to compute learning gaps. Record marks for at least one quiz or test.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Assessments</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{summaryData.totalAssessments}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Average Class Performance</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{summaryData.averagePerformance}%</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Students Requiring Support (&lt;40%)</span>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{summaryData.studentsNeedingSupportCount}</p>
                </div>
              </div>

              {/* Remedial Support Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-xs">
                  Students Flagged for Remedial Attention (Scoring below 40%)
                </div>
                {summaryData.studentsNeedingSupport.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 text-xs font-semibold">
                    🎉 Excellent! All students are performing above the 40% threshold across all assessments.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-3 px-4 w-16">Roll</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4 text-center">Low Score Count</th>
                          <th className="py-3 px-4">Assessments Affected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summaryData.studentsNeedingSupport.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-700">{s.rollNumber}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{s.studentName}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                                {s.lowScoresCount} test(s)
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {s.tests.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {t.title}: <strong className="text-rose-600">{t.percentage}%</strong>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-rose-600" />
                {editingId ? 'Edit Assessment & Marks' : 'Record Assessment & Student Marks'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                    placeholder="e.g. Unit 1 Periodic Test: AI Ethics"
                    value={formData.assessmentTitle}
                    onChange={(e) => setFormData({ ...formData, assessmentTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={formData.assessmentType}
                    onChange={(e) => setFormData({ ...formData, assessmentType: e.target.value })}
                  >
                    {ASSESSMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Max Marks *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                    value={formData.maximumMarks}
                    onChange={(e) => setFormData({ ...formData, maximumMarks: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Student Marks Roster Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Student Marks Entry ({formData.studentMarks.length} Students)
                  </span>
                  <span className="text-slate-500">
                    Live Avg: <strong className="text-blue-600">{currentAvgMarks} / {maxM} ({currentAvgPct}%)</strong>
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-14">Roll</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3 w-28">Marks (Max {maxM})</th>
                        <th className="py-2 px-3 w-20 text-center">% Score</th>
                        <th className="py-2 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.studentMarks.map((m) => (
                        <tr key={m.rollNumber}>
                          <td className="py-2 px-3 font-bold text-slate-700">{m.rollNumber}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{m.studentName}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min={0}
                              max={maxM}
                              className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-rose-500"
                              value={m.marksObtained}
                              onChange={(e) => handleStudentMarkChange(m.rollNumber, e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`font-semibold ${
                                m.percentage < 40 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {m.percentage}%
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Notes..."
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none"
                              value={m.remarks || ''}
                              onChange={(e) => handleStudentRemarkChange(m.rollNumber, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Learning Gaps & Remedial Action */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Learning Gaps Identified</label>
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                    placeholder="e.g. Students struggled with distinguishing Zero-shot and Few-shot prompting"
                    value={formData.learningGapsIdentified}
                    onChange={(e) => setFormData({ ...formData, learningGapsIdentified: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Remedial Action Plan</label>
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                    placeholder="e.g. Conduct a 20-min hands-on prompt comparison workshop"
                    value={formData.remedialActionPlan}
                    onChange={(e) => setFormData({ ...formData, remedialActionPlan: e.target.value })}
                  />
                </div>
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Update Assessment' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MARKS MODAL */}
      {viewAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{viewAssessment.assessmentTitle}</h3>
                <p className="text-xs text-slate-500">
                  {viewAssessment.className} • {viewAssessment.subject} • Max Marks: {viewAssessment.maximumMarks}
                </p>
              </div>
              <button onClick={() => setViewAssessment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 w-14">Roll</th>
                    <th className="py-2 px-3">Student Name</th>
                    <th className="py-2 px-3 text-center">Marks</th>
                    <th className="py-2 px-3 text-center">% Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewAssessment.studentMarks || []).map((m) => (
                    <tr key={m.rollNumber}>
                      <td className="py-2 px-3 font-bold text-slate-700">{m.rollNumber}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{m.studentName}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-700">{m.marksObtained}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`font-bold ${
                            m.percentage < 40 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {m.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewAssessment(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
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
        title="Delete Assessment"
        message="Are you sure you want to delete this assessment record and all recorded student marks?"
        confirmLabel="Delete Assessment"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default AssessmentPage;
