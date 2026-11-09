import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  FileSpreadsheet,
  Plus,
  Sliders,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  Download,
  FileText,
  Copy,
  Trash2,
  Edit,
  ArrowRight,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CreateExamModal } from './CreateExamModal';
import { TemplateBuilderModal } from './TemplateBuilderModal';

export const ExamsHubPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'templates'
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [createExamModalOpen, setCreateExamModalOpen] = useState(false);
  const [templateBuilderModalOpen, setTemplateBuilderModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState(null);

  // Load records and templates
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recRes, tplRes] = await Promise.all([
        examApi.getExamRecords(),
        examApi.getTemplates(),
      ]);

      if (recRes.data?.data) {
        setRecords(recRes.data.data);
      } else if (Array.isArray(recRes.data)) {
        setRecords(recRes.data);
      }

      if (tplRes.data?.data) {
        setTemplates(tplRes.data.data);
      } else if (Array.isArray(tplRes.data)) {
        setTemplates(tplRes.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to load exam data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Duplicate template
  const handleDuplicateTemplate = async (templateId) => {
    try {
      const res = await examApi.duplicateTemplate(templateId);
      if (res.data?.success || res.success) {
        showToast('Template duplicated successfully! You can now customize it.', 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to duplicate template.', 'error');
    }
  };

  // Delete template
  const handleDeleteTemplate = async () => {
    if (!confirmDeleteTemplateId) return;
    try {
      await examApi.deleteTemplate(confirmDeleteTemplateId);
      showToast('Template deleted successfully.', 'success');
      setConfirmDeleteTemplateId(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete template.', 'error');
    }
  };

  // Delete exam record
  const handleDeleteRecord = async () => {
    if (!confirmDeleteRecordId) return;
    try {
      await examApi.deleteExamRecord(confirmDeleteRecordId);
      showToast('Examination record deleted.', 'success');
      setConfirmDeleteRecordId(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete examination record.', 'error');
    }
  };

  // KPI Metrics Calculation
  const totalExams = records.length;
  const finalizedExams = records.filter((r) => r.status === 'Finalized').length;
  const avgPassRate =
    records.length > 0
      ? Math.round(
          records.reduce((sum, r) => sum + (r.statistics?.passPercentage || 0), 0) /
            records.length
        )
      : 0;

  // Filtered Exam Records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.examTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || r.className === selectedClass;
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      (t.templateName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || t.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            Automatic Marks Calculation Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Examinations & Marks Registers
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Create dynamic examination templates, enter marks via a spreadsheet grid with live
            formula calculation, and generate board-compliant report cards and class registers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setEditingTemplate(null);
              setTemplateBuilderModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-blue-600" />
            New Template
          </button>

          <button
            onClick={() => setCreateExamModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Start Examination
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Total Examinations
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{totalExams}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Conducted marks sheets</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Finalized & Locked
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{finalizedExams}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Board-ready records</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Configured Templates
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{templates.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Reusable structures</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sliders className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Average Pass Rate
            </p>
            <h3 className="text-2xl font-bold text-slate-900">{avgPassRate}%</h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">Overall cohort performance</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. TABS & SEARCH / FILTER CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'records'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Examination Records ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'templates'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Templates Library ({templates.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
          >
            <option value="all">All Classes</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
            <option value="Class 11">Class 11</option>
            <option value="Class 12">Class 12</option>
          </select>

          {activeTab === 'records' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Drafts Only</option>
              <option value="Finalized">Finalized Only</option>
            </select>
          )}
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner message="Loading examinations and template structures..." />
        </div>
      ) : activeTab === 'records' ? (
        /* ================= TAB 1: EXAM RECORDS ================= */
        filteredRecords.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Examination Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't initialized any examination sheets yet. Click below to start an
              examination using a pre-configured template.
            </p>
            <button
              onClick={() => setCreateExamModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              Start New Examination
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRecords.map((rec) => {
              const stats = rec.statistics || {};
              const isLocked = rec.status === 'Finalized';

              return (
                <div
                  key={rec._id || rec.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                          Class {rec.className} ({rec.section || 'A'}) • {rec.academicYear || '2026-2027'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate mt-0.5">
                          {rec.examTitle}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{rec.subject}</p>
                      </div>

                      <Badge variant={isLocked ? 'success' : 'warning'}>
                        {isLocked ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          'Draft'
                        )}
                      </Badge>
                    </div>

                    {/* Stats Snapshot */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Students</span>
                        <span className="font-bold text-slate-800">
                          {stats.totalStudents || rec.studentMarks?.length || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pass Rate</span>
                        <span className="font-bold text-emerald-600">
                          {stats.passPercentage ?? 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Class Avg</span>
                        <span className="font-bold text-blue-700">
                          {stats.classAverage ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/exams/entry/${rec._id || rec.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Open Marks Sheet
                    </button>

                    {!isLocked && (
                      <button
                        onClick={() => setConfirmDeleteRecordId(rec._id || rec.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Delete draft exam record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= TAB 2: TEMPLATES LIBRARY ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => {
              const components = tpl.components || [];

              return (
                <div
                  key={tpl._id || tpl.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                          {tpl.className} • {tpl.academicYear || '2026-2027'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          {tpl.templateName}
                        </h3>
                        <p className="text-xs text-slate-500">{tpl.subject}</p>
                      </div>
                      <div className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs whitespace-nowrap">
                        Max: {tpl.totalFinalMarks || 100}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {tpl.description || 'Configurable multi-component assessment structure.'}
                    </p>

                    {/* Components Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {components.map((c) => (
                        <span
                          key={c.code}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700"
                        >
                          {c.name}: {c.maxRawMarks} → {c.finalWeightage}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Template Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setTemplateBuilderModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      title="Edit structure"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit
                    </button>

                    <button
                      onClick={() => handleDuplicateTemplate(tpl._id || tpl.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      title="Duplicate for another class or subject"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-600" /> Duplicate
                    </button>

                    <button
                      onClick={() => {
                        setConfirmDeleteTemplateId(tpl._id || tpl.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Initialize Exam Modal */}
      <CreateExamModal
        isOpen={createExamModalOpen}
        onClose={() => setCreateExamModalOpen(false)}
        templates={templates}
        onExamCreated={(newRecord) => {
          setRecords([newRecord, ...records]);
        }}
      />

      {/* Template Builder Modal */}
      <TemplateBuilderModal
        isOpen={templateBuilderModalOpen}
        onClose={() => {
          setTemplateBuilderModalOpen(false);
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
        onTemplateSaved={() => {
          loadData();
        }}
      />

      {/* Confirm Delete Exam Record Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteRecordId}
        onClose={() => setConfirmDeleteRecordId(null)}
        onConfirm={handleDeleteRecord}
        title="Delete Examination Record?"
        message="Are you sure you want to delete this draft examination record? All student marks entered so far for this sheet will be permanently removed."
        confirmText="Delete Record"
        type="danger"
      />

      {/* Confirm Delete Template Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteTemplateId}
        onClose={() => setConfirmDeleteTemplateId(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Examination Template?"
        message="Are you sure you want to delete this examination template? Existing historical exam records that took a snapshot of this template will remain safe."
        confirmText="Delete Template"
        type="danger"
      />
    </div>
  );
};

export default ExamsHubPage;
