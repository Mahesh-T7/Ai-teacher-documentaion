import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FolderArchive,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  FolderCheck,
  FileText,
  Camera,
  Calendar,
  Layers,
  Award,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { inspectionApi } from '../../api/inspectionApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const CATEGORIES = [
  'All',
  'Profile',
  'Timetable',
  'Daily Diary',
  'Lesson Plans',
  'Attendance',
  'Practical Activities',
  'Assessments',
  'Syllabus',
  'Photos',
];

export const InspectionPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('readiness'); // 'readiness' | 'packages'
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [readinessData, setReadinessData] = useState(null);
  const [packages, setPackages] = useState([]);

  // Checklist filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'attention' | 'ready'
  const [searchTerm, setSearchTerm] = useState('');

  // Generate Package Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [packageForm, setPackageForm] = useState({
    title: '',
    academicYear: '2026-2027',
    includePhotos: true,
    comments: '',
  });

  // Delete modal
  const [deletePackageId, setDeletePackageId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch readiness
  const fetchReadiness = useCallback(async () => {
    try {
      setLoadingReadiness(true);
      const res = await inspectionApi.getReadiness(academicYear);
      if (res.success) {
        setReadinessData(res.readiness);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load inspection readiness', 'error');
    } finally {
      setLoadingReadiness(false);
    }
  }, [academicYear, showToast]);

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    try {
      setLoadingPackages(true);
      const res = await inspectionApi.getPackages(academicYear);
      if (res.success) {
        setPackages(res.packages || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load inspection packages', 'error');
    } finally {
      setLoadingPackages(false);
    }
  }, [academicYear, showToast]);

  useEffect(() => {
    if (activeTab === 'readiness') {
      fetchReadiness();
    } else {
      fetchPackages();
    }
  }, [activeTab, fetchReadiness, fetchPackages]);

  const handleOpenGenerate = () => {
    setPackageForm({
      title: `Official Inspection Dossier - ${academicYear}`,
      academicYear,
      includePhotos: true,
      comments: 'Standard Academic Year documentation prepared for inspection committee.',
    });
    setShowGenerateModal(true);
  };

  const handleGeneratePackage = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await inspectionApi.generatePackage(packageForm);
      if (res.success) {
        showToast('Complete 12-Folder Inspection Package generated successfully!', 'success');
        setShowGenerateModal(false);
        setActiveTab('packages');
        fetchPackages();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate inspection package', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (pkg) => {
    try {
      showToast('Downloading inspection package...', 'info');
      await inspectionApi.downloadPackage(pkg._id || pkg.id, pkg.filename);
      showToast('Inspection package downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to download inspection package', 'error');
    }
  };

  const handleDeletePackage = async () => {
    if (!deletePackageId) return;
    try {
      setDeleting(true);
      await inspectionApi.deletePackage(deletePackageId);
      showToast('Package deleted from archive', 'success');
      setDeletePackageId(null);
      fetchPackages();
    } catch (err) {
      showToast('Failed to delete package', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filter checklist
  const filteredChecklist = (readinessData?.checklist || []).filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    let matchesStatus = true;
    if (statusFilter === 'attention') {
      matchesStatus = item.status === 'Missing' || item.status === 'Draft' || item.status === 'Not Configured';
    } else if (statusFilter === 'ready') {
      matchesStatus = item.status === 'Completed' || item.status === 'Approved' || item.status === 'Not Applicable';
    }

    const matchesSearch =
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success" icon={CheckCircle2}>Completed</Badge>;
      case 'Approved':
        return <Badge variant="emerald" icon={ShieldCheck}>Approved</Badge>;
      case 'Draft':
        return <Badge variant="warning" icon={Clock}>Draft / Incomplete</Badge>;
      case 'Missing':
        return <Badge variant="danger" icon={AlertCircle}>Missing</Badge>;
      case 'Not Configured':
        return <Badge variant="purple" icon={AlertTriangle}>Not Configured</Badge>;
      case 'Not Applicable':
        return <Badge variant="default">Not Applicable</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">School Inspection Mode & Document Centre</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
              Audit Standard
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Complete institutional audit readiness, honest missing-record checklists, and 1-click 12-folder inspection archive generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026-2027">AY 2026-2027</option>
            <option value="2025-2026">AY 2025-2026</option>
            <option value="2024-2025">AY 2024-2025</option>
          </select>

          <button
            onClick={handleOpenGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <FolderArchive className="w-4 h-4" />
            Generate Inspection ZIP
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-t-xl">
        <button
          onClick={() => setActiveTab('readiness')}
          className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'readiness'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Inspection Readiness & Checklist
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'packages'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          Inspection Packages Archive
          {packages.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full text-gray-700 font-medium">
              {packages.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Readiness & Checklist */}
      {activeTab === 'readiness' && (
        <div className="space-y-6">
          {loadingReadiness ? (
            <div className="bg-white p-12 rounded-xl border border-gray-100 flex justify-center">
              <LoadingSpinner size="lg" message="Analyzing institutional inspection readiness..." />
            </div>
          ) : readinessData ? (
            <>
              {/* Readiness Score Banner */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-4 flex items-center gap-5 border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
                    <div
                      className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${getScoreColor(
                        readinessData.readinessScore
                      )}`}
                    >
                      <span className="text-3xl font-extrabold">{readinessData.readinessScore}%</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Readiness</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          {readinessData.readinessScore >= 80
                            ? 'Inspection Ready'
                            : readinessData.readinessScore >= 50
                            ? 'Action Recommended'
                            : 'Needs Immediate Attention'}
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Weighted score based on completed diaries, approved lesson plans, practical evidence, and attendance records.
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <span>Teacher:</span>
                        <span className="text-indigo-600">{readinessData.teacher?.fullName || user?.fullName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Diary Entries</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">
                        {readinessData.breakdown?.counts?.completedDiary || 0}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          / {readinessData.breakdown?.counts?.totalClassesConducted || 0}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-600 mt-1 font-medium">
                        {readinessData.breakdown?.counts?.draftDiary || 0} drafts pending
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Lesson Plans</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">
                        {readinessData.breakdown?.counts?.approvedLessonPlans || 0}{' '}
                        <span className="text-xs font-normal text-gray-500">
                          / {readinessData.breakdown?.counts?.totalLessonPlans || 0}
                        </span>
                      </div>
                      <div className="text-[11px] text-indigo-600 mt-1 font-medium">
                        {readinessData.breakdown?.percentages?.lessonPlanApprovalRate || 0}% Approved
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Practicals & Labs</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">
                        {readinessData.breakdown?.counts?.practicalActivities || 0}
                      </div>
                      <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                        {readinessData.breakdown?.counts?.attendanceSessions || 0} attendance logs
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Photo Evidence</div>
                      <div className="mt-1 text-xl font-bold text-gray-900">
                        {readinessData.breakdown?.counts?.classroomPhotos || 0}
                      </div>
                      <div className="text-[11px] text-purple-600 mt-1 font-medium">
                        {readinessData.breakdown?.percentages?.syllabusAverageProgress || 0}% syllabus
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weighted Breakdown Progress Bar */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                    <span>Component Weights: Diary (30%) · Plans (25%) · Practicals (15%) · Attendance (10%) · Syllabus (10%) · Photos (10%)</span>
                    <button
                      onClick={fetchReadiness}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-calculate
                    </button>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        readinessData.readinessScore >= 80
                          ? 'bg-emerald-500'
                          : readinessData.readinessScore >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(readinessData.readinessScore, 3)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Missing Documentation Detection Checklist */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-indigo-600" />
                      Institutional Inspection Audit Checklist
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Non-misleading checklist of statutory teaching documentation required during school inspections.
                    </p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 w-44"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 bg-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="attention">Needs Attention (Missing / Draft)</option>
                      <option value="ready">Ready (Approved / Completed)</option>
                    </select>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                        categoryFilter === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Checklist Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                        <th className="py-3 px-4 w-32">Category</th>
                        <th className="py-3 px-4">Inspection Requirement</th>
                        <th className="py-3 px-4 w-40">Audit Status</th>
                        <th className="py-3 px-4">Current Verification & Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredChecklist.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            No checklist items found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredChecklist.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-700">
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900">
                              {item.item}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              <div className="flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span>{item.details}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No Inspection Data"
              description="Unable to compute inspection readiness. Please try refreshing."
              actionLabel="Refresh Data"
              onAction={fetchReadiness}
            />
          )}
        </div>
      )}

      {/* Tab 2: Inspection Packages Archive */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-indigo-600" />
                12-Folder Academic-Year Inspection ZIP Packages
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Download pre-compiled ZIP archives containing official PDFs, timetables, lesson plans, daily diaries, practical logs, and inspection summary certificates.
              </p>
            </div>

            <button
              onClick={handleOpenGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <FolderArchive className="w-4 h-4" />
              Build New Package
            </button>
          </div>

          {loadingPackages ? (
            <div className="bg-white p-12 rounded-xl border border-gray-100 flex justify-center">
              <LoadingSpinner size="lg" message="Loading inspection packages archive..." />
            </div>
          ) : packages.length === 0 ? (
            <EmptyState
              icon={FolderArchive}
              title="No Inspection Packages Generated"
              description="Generate a comprehensive 12-folder ZIP dossier ready to hand over to visiting inspection officers or school authorities."
              actionLabel="Generate First Package"
              onAction={handleOpenGenerate}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packages.map((pkg) => (
                <div
                  key={pkg._id || pkg.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <FolderArchive className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900">{pkg.title}</h4>
                          <span className="text-xs text-gray-500">{pkg.filename}</span>
                        </div>
                      </div>
                      <Badge variant="emerald" icon={ShieldCheck}>Ready</Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                      <div>
                        <div className="text-gray-400 uppercase text-[10px] font-semibold">Academic Year</div>
                        <div className="font-bold text-gray-800 mt-0.5">{pkg.academicYear}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 uppercase text-[10px] font-semibold">Folder Count</div>
                        <div className="font-bold text-gray-800 mt-0.5">{pkg.totalFolders || 12} Folders</div>
                      </div>
                      <div>
                        <div className="text-gray-400 uppercase text-[10px] font-semibold">Archive Size</div>
                        <div className="font-bold text-gray-800 mt-0.5">
                          {pkg.fileSize ? `${Math.round(pkg.fileSize / 1024)} KB` : 'Dynamic'}
                        </div>
                      </div>
                    </div>

                    {pkg.comments && (
                      <p className="mt-3 text-xs text-gray-600 bg-blue-50/50 p-2.5 rounded border border-blue-100 italic">
                        "{pkg.comments}"
                      </p>
                    )}

                    {/* 12-Folder Structure preview chips */}
                    <div className="mt-4">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Included Standard Folders:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '01_Teacher_Profile',
                          '02_Timetable',
                          '03_Lesson_Plans',
                          '04_Daily_Teaching_Diary',
                          '05_Weekly_Reports',
                          '06_Monthly_Reports',
                          '07_Attendance',
                          '08_Practical_Activities',
                          '09_Assessments',
                          '10_Syllabus_Progress',
                          '11_Photo_Evidence',
                          '12_Inspection_Summary',
                        ].map((folderName, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono"
                          >
                            📁 {folderName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Generated: {new Date(pkg.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(pkg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download ZIP
                      </button>

                      <button
                        onClick={() => setDeletePackageId(pkg._id || pkg.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Inspection Package Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full border border-gray-100 shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Generate 12-Folder Inspection Package</h3>
                  <p className="text-xs text-gray-500">Official Institutional ZIP Archive</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGeneratePackage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Package Title
                </label>
                <input
                  type="text"
                  required
                  value={packageForm.title}
                  onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Academic Year
                </label>
                <select
                  value={packageForm.academicYear}
                  onChange={(e) => setPackageForm({ ...packageForm, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Inspector / Committee Remarks
                </label>
                <textarea
                  rows={3}
                  value={packageForm.comments}
                  onChange={(e) => setPackageForm({ ...packageForm, comments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Prepared for CBSE inspection committee visit on Nov 15th..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includePhotos"
                  checked={packageForm.includePhotos}
                  onChange={(e) => setPackageForm({ ...packageForm, includePhotos: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="includePhotos" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Include photo evidence files in folder 11_Photo_Evidence
                </label>
              </div>

              <div className="bg-indigo-50/70 p-3.5 rounded-lg border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  What will be generated:
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-700">
                  A complete structured ZIP archive with 12 organized folders, including official PDF reports, timetable, approved lesson plans, daily diary records, attendance, practical logs, and an institutional Inspection Summary Certificate.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Building 12 Folders...
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-4 h-4" />
                      Build Inspection ZIP
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletePackageId)}
        onClose={() => setDeletePackageId(null)}
        onConfirm={handleDeletePackage}
        title="Delete Inspection Package"
        message="Are you sure you want to remove this inspection package? The ZIP archive will be deleted from storage."
        confirmText={deleting ? 'Deleting...' : 'Delete Package'}
        type="danger"
      />
    </div>
  );
};
