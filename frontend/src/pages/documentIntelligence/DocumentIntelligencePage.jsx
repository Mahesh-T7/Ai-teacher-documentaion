import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Download,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  Save,
  Check,
  SplitSquareVertical,
  Lightbulb,
  BookMarked,
  FileDown,
  Globe,
  SlidersHorizontal,
  X,
  FileUp,
  BrainCircuit,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { documentIntelligenceApi } from '../../api/documentIntelligenceApi';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const DocumentIntelligencePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Active Main Navigation Tab: 'upload' | 'analysis' | 'slides' | 'workspace'
  const [activeTab, setActiveTab] = useState('upload');

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Upload Form & Progress State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [metadataForm, setMetadataForm] = useState({
    academicYear: '2026-2027',
    className: 'Class 9',
    subject: 'Artificial Intelligence',
    unit: 'Unit 1: AI Reflection and Project Cycle',
    chapter: 'Chapter 1: Excite & Relate',
    topic: 'Introduction to AI Ethics & Domains',
    date: new Date().toISOString().split('T')[0],
  });

  // Processing & Job State
  const [activeJob, setActiveJob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [extractedContents, setExtractedContents] = useState([]);

  // Teacher Corrections to detected metadata
  const [teacherCorrections, setTeacherCorrections] = useState({
    className: '',
    subject: '',
    unit: '',
    chapter: '',
    topic: '',
  });

  // Generation & Review Workspace State
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMaterial, setGeneratedMaterial] = useState(null);
  const [workspaceSubTab, setWorkspaceSubTab] = useState('lessonPlan'); // 'lessonPlan' | 'notes' | 'questions' | 'activities' | 'diary'
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState(null);

  // Modals & Drawers
  const [previewDoc, setPreviewDoc] = useState(null);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [deleteDocId, setDeleteDocId] = useState(null);
  const [showCompareDrawer, setShowCompareDrawer] = useState(false);
  const [diaryConfirmModalOpen, setDiaryConfirmModalOpen] = useState(false);
  const [diaryConfirmedTaught, setDiaryConfirmedTaught] = useState(false);

  // Fetch documents on initial load
  useEffect(() => {
    fetchDocuments();
  }, [classFilter, subjectFilter]);

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await documentIntelligenceApi.getDocuments({
        className: classFilter || undefined,
        subject: subjectFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch uploaded documents.', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  // ----------------------------------------------------
  // Drag & Drop / File Upload Handlers
  // ----------------------------------------------------
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const removeFileFromList = (idx) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      showToast('Please select at least one file to upload.', 'warning');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      uploadFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('academicYear', metadataForm.academicYear);
      formData.append('className', metadataForm.className);
      formData.append('subject', metadataForm.subject);
      formData.append('unit', metadataForm.unit);
      formData.append('chapter', metadataForm.chapter);
      formData.append('topic', metadataForm.topic);
      formData.append('date', metadataForm.date);

      const res = await documentIntelligenceApi.uploadDocuments(formData, (percent) => {
        setUploadProgress(percent);
      });

      showToast(res.message || 'Documents uploaded successfully!', 'success');
      setUploadFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      showToast(err.message || 'Upload failed. Please check file format and size.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ----------------------------------------------------
  // Document Selection & Actions
  // ----------------------------------------------------
  const toggleDocSelection = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const selectAllDocs = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d._id));
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    try {
      await documentIntelligenceApi.deleteDocument(deleteDocId);
      showToast('Document deleted successfully.', 'info');
      setDeleteDocId(null);
      setSelectedDocIds((prev) => prev.filter((id) => id !== deleteDocId));
      fetchDocuments();
    } catch (err) {
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  };

  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    const file = e.target.replaceFile.files[0];
    if (!file || !replaceDoc) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      await documentIntelligenceApi.replaceDocument(replaceDoc._id, formData);
      showToast(`Document "${replaceDoc.originalName}" replaced successfully.`, 'success');
      setReplaceDoc(null);
      fetchDocuments();
    } catch (err) {
      showToast(err.message || 'Failed to replace document.', 'error');
    }
  };

  // ----------------------------------------------------
  // Extraction & AI Concept Analysis
  // ----------------------------------------------------
  const handleStartProcessing = async (docIdsToProcess = null) => {
    const ids = docIdsToProcess || selectedDocIds;
    if (ids.length === 0) {
      showToast('Please select at least one document to analyze.', 'warning');
      return;
    }

    try {
      setIsProcessing(true);
      setActiveTab('analysis');

      const res = await documentIntelligenceApi.startProcessingJob({
        documentIds: ids,
        language: selectedLanguage,
        userMetadata: metadataForm,
      });

      if (res && res.data) {
        setActiveJob(res.data.job);
        setExtractedContents(res.data.extractedContents || []);
        setAnalysisData(res.data.analysis);
        if (res.data.analysis?.detectedMetadata) {
          setTeacherCorrections({
            className: res.data.analysis.detectedMetadata.className || '',
            subject: res.data.analysis.detectedMetadata.subject || '',
            unit: res.data.analysis.detectedMetadata.unit || '',
            chapter: res.data.analysis.detectedMetadata.chapter || '',
            topic: res.data.analysis.detectedMetadata.topic || '',
          });
        }
        showToast('Document extraction and AI analysis complete!', 'success');
        fetchDocuments();
      }
    } catch (err) {
      showToast(err.message || 'Document processing failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // Generate Automatic Teaching Documentation
  // ----------------------------------------------------
  const handleGenerateDocumentation = async () => {
    const docIds = selectedDocIds.length > 0 ? selectedDocIds : documents.map((d) => d._id);
    if (docIds.length === 0) {
      showToast('Please select or upload at least one document first.', 'warning');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await documentIntelligenceApi.generateDocumentation({
        documentIds: docIds,
        detectedMetadata: analysisData?.detectedMetadata || metadataForm,
        teacherCorrections,
        language: selectedLanguage,
        jobId: activeJob?._id,
      });

      if (res && res.data) {
        setGeneratedMaterial(res.data);
        showToast('Teaching documentation generated successfully!', 'success');
        // If presentation slides exist, show slide explanation tab or workspace
        if (res.data.slideExplanations && res.data.slideExplanations.length > 0) {
          setActiveTab('slides');
        } else {
          setActiveTab('workspace');
        }
      }
    } catch (err) {
      showToast(err.message || 'Generation failed. Please retry.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ----------------------------------------------------
  // Review Workspace: Save, Regenerate, Approve & Conversions
  // ----------------------------------------------------
  const handleSaveDraft = async () => {
    if (!generatedMaterial) return;
    try {
      setIsSavingDraft(true);
      const res = await documentIntelligenceApi.updateMaterial(generatedMaterial._id, {
        lessonPlan: generatedMaterial.lessonPlan,
        classroomTeachingNotes: generatedMaterial.classroomTeachingNotes,
        questionBank: generatedMaterial.questionBank,
        classroomActivityPlan: generatedMaterial.classroomActivityPlan,
        dailyTeachingDiaryDraft: generatedMaterial.dailyTeachingDiaryDraft,
        slideExplanations: generatedMaterial.slideExplanations,
        teacherCorrections,
      });
      if (res && res.data) {
        setGeneratedMaterial(res.data);
        showToast('Draft changes saved successfully.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to save draft.', 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleRegenerateSection = async (sectionName) => {
    if (!generatedMaterial) return;
    try {
      setRegeneratingSection(sectionName);
      const res = await documentIntelligenceApi.regenerateSection(generatedMaterial._id, sectionName);
      if (res && res.data) {
        setGeneratedMaterial(res.data);
        showToast(`Section "${sectionName}" regenerated with fresh pedagogical content.`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Section regeneration failed.', 'error');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleApproveMaterial = async () => {
    if (!generatedMaterial) return;
    try {
      const res = await documentIntelligenceApi.approveMaterial(generatedMaterial._id);
      if (res && res.data) {
        setGeneratedMaterial(res.data);
        showToast('Teaching material officially approved!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve material.', 'error');
    }
  };

  const handleConvertToLessonPlan = async () => {
    if (!generatedMaterial) return;
    try {
      const res = await documentIntelligenceApi.convertToLessonPlan(generatedMaterial._id);
      showToast('Successfully converted to formal Lesson Plan in Lesson Plan Management!', 'success');
    } catch (err) {
      showToast(err.message || 'Conversion to Lesson Plan failed.', 'error');
    }
  };

  const handleConfirmDiaryCreation = async () => {
    if (!generatedMaterial) return;
    try {
      const res = await documentIntelligenceApi.createDiaryDraft(generatedMaterial._id, {
        confirmedTaught: diaryConfirmedTaught,
      });
      showToast(res.message, diaryConfirmedTaught ? 'success' : 'info');
      setDiaryConfirmModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to create diary draft.', 'error');
    }
  };

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------
  const getFormatIcon = (ext) => {
    const e = (ext || '').toLowerCase();
    if (['ppt', 'pptx'].includes(e)) return <Presentation className="w-5 h-5 text-amber-500" />;
    if (['xls', 'xlsx'].includes(e)) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (['jpg', 'jpeg', 'png'].includes(e)) return <ImageIcon className="w-5 h-5 text-rose-500" />;
    if (e === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Uploaded':
        return <Badge variant="secondary">Uploaded</Badge>;
      case 'Processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'Extracted':
        return <Badge variant="info">Extracted</Badge>;
      case 'Analysed':
        return <Badge variant="primary">Analysed</Badge>;
      case 'Generated':
        return <Badge variant="success">Generated</Badge>;
      case 'Failed':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.originalName?.toLowerCase().includes(q);
      const matchTopic = d.topic?.toLowerCase().includes(q);
      const matchSubj = d.subject?.toLowerCase().includes(q);
      if (!matchName && !matchTopic && !matchSubj) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Title & Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-blue-950/20 border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <BrainCircuit className="w-3.5 h-3.5 text-blue-300" />
            AI Document Intelligence Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            AI Document Intelligence & Automatic Teaching Documentation
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed">
            Upload educational materials (PPT, PDF, Word, Excel, scanned files & images). The AI automatically analyzes curriculum concepts, identifies key definitions, detects multi-document discrepancies, and generates complete, editable lesson plans, classroom notes, question banks, and slide-wise teaching guides.
          </p>
        </div>

        {/* Quick Language Selector */}
        <div className="relative z-10 flex flex-col items-start md:items-end gap-2 shrink-0">
          <label className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Output Language:
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-slate-800/90 border border-blue-500/40 text-white rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:outline-hidden cursor-pointer"
          >
            <option value="English">English</option>
            <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
            <option value="Kannada + English">Bilingual (ಕನ್ನಡ + English)</option>
          </select>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          1. Document Upload Centre
          {documents.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-500/30 text-blue-100 font-bold">
              {documents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'analysis'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          2. Extraction & AI Concept Analysis
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'slides'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Presentation className="w-4 h-4" />
          3. Slide-Wise Teaching Guide
          {generatedMaterial?.slideExplanations?.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-md font-bold">
              {generatedMaterial.slideExplanations.length} slides
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'workspace'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          4. Teacher Review Workspace
          {generatedMaterial && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-emerald-500 text-white font-bold">
              Ready
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: DOCUMENT UPLOAD CENTRE */}
      {/* ==================================================== */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Upload & Categorisation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drag and Drop Upload Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-blue-600" />
                    Upload Educational Materials
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select single or multiple files. Drag & drop supported.
                  </p>
                </div>
                {/* Format Badges */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-500">
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">PPT / PPTX</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">PDF</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">DOC / DOCX</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">XLS / XLSX</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">JPG / PNG</span>
                </div>
              </div>

              {/* Drag Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-center">
                  Click to browse files or drag and drop here
                </p>
                <p className="text-xs text-slate-400 text-center mt-1">
                  Supports PowerPoint, PDF, Word, Excel, Images & Plain Text up to 50MB per file.
                </p>
              </div>

              {/* Selected Files Preview List before upload */}
              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Selected Files ({uploadFiles.length}):</span>
                    <button
                      onClick={() => setUploadFiles([])}
                      className="text-red-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {uploadFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {getFormatIcon(file.name.split('.').pop())}
                          <span className="font-medium truncate text-slate-800 dark:text-slate-200">
                            {file.name}
                          </span>
                          <span className="text-slate-400 shrink-0">
                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFileFromList(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-md"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress bar during upload */}
              {isUploading && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>Uploading and validating document signatures...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Upload Button */}
              <div className="mt-5 flex items-center justify-end">
                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading || uploadFiles.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="w-4 h-4" />}
                  Upload & Securely Index Files
                </button>
              </div>
            </div>

            {/* Document Categorisation Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  Curriculum Categorisation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tag uploaded files to academic unit and syllabus hierarchy.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Academic Year</label>
                  <input
                    type="text"
                    value={metadataForm.academicYear}
                    onChange={(e) => setMetadataForm({ ...metadataForm, academicYear: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="2026-2027"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Class / Grade</label>
                    <input
                      type="text"
                      value={metadataForm.className}
                      onChange={(e) => setMetadataForm({ ...metadataForm, className: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                      placeholder="Class 9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                    <input
                      type="text"
                      value={metadataForm.subject}
                      onChange={(e) => setMetadataForm({ ...metadataForm, subject: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                      placeholder="Artificial Intelligence"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Unit / Module</label>
                  <input
                    type="text"
                    value={metadataForm.unit}
                    onChange={(e) => setMetadataForm({ ...metadataForm, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="Unit 1: AI Ethics"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
                  <input
                    type="text"
                    value={metadataForm.chapter}
                    onChange={(e) => setMetadataForm({ ...metadataForm, chapter: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="Chapter 1: Excite & Relate"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Topic</label>
                  <input
                    type="text"
                    value={metadataForm.topic}
                    onChange={(e) => setMetadataForm({ ...metadataForm, topic: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                    placeholder="AI Reflection and Project Cycle"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Teaching Date</label>
                  <input
                    type="date"
                    value={metadataForm.date}
                    onChange={(e) => setMetadataForm({ ...metadataForm, date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents History & Multi-Combination Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Uploaded Educational Documents Library
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select one or combine multiple materials (e.g. PPT + PDF + Word notes) for combined topic extraction.
                </p>
              </div>

              {/* Multi-Document Combine Action Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleStartProcessing()}
                  disabled={selectedDocIds.length === 0 || isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-40 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Extract & Analyse Selected ({selectedDocIds.length})
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by file name, topic, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="">All Classes</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                </select>
              </div>

              <div>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                >
                  <option value="">All Subjects</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Physics">Physics</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loadingDocs ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredDocs.length === 0 ? (
              <EmptyState
                icon={FileUp}
                title="No Documents Uploaded Yet"
                description="Upload presentation slides, textbook PDFs, worksheets, or scanned diagrams above to begin."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0}
                          onChange={selectAllDocs}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Class & Subject</th>
                      <th className="p-3">Unit & Topic</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredDocs.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc._id);
                      return (
                        <tr
                          key={doc._id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDocSelection(doc._id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getFormatIcon(doc.extension)}
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                                {doc.originalName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {doc.className} • {doc.subject}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            <div className="truncate max-w-xs font-semibold text-slate-700 dark:text-slate-300">
                              {doc.topic || doc.unit || 'General'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{doc.chapter}</div>
                          </td>
                          <td className="p-3 text-slate-500">
                            {(doc.fileSize / 1024).toFixed(0)} KB
                          </td>
                          <td className="p-3 text-slate-500">
                            {new Date(doc.date || doc.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">{getStatusBadge(doc.status)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                title="Preview Document"
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Replace */}
                              <button
                                onClick={() => setReplaceDoc(doc)}
                                title="Replace File with New Version"
                                className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              {/* Process Individually */}
                              <button
                                onClick={() => handleStartProcessing([doc._id])}
                                title="Extract and Analyze This File"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteDocId(doc._id)}
                                title="Delete Document"
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: EXTRACTION & AI CONCEPT ANALYSIS */}
      {/* ==================================================== */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {isProcessing ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 animate-pulse">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Analysing Uploaded Document Intelligence...
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Parsing slide decks, running text and table extraction, evaluating OCR for scanned pages, and synthesizing pedagogical curriculum concepts.
              </p>
              <div className="w-full max-w-md mx-auto pt-2">
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          ) : !analysisData ? (
            <EmptyState
              icon={Sparkles}
              title="No Document Analysis Yet"
              description="Select documents from Tab 1 and click 'Extract & Analyse Selected' to inspect curriculum concepts."
            />
          ) : (
            <div className="space-y-6">
              {/* Header Action Banner with Big Generate Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/60 border border-blue-200 dark:border-blue-900/60 rounded-3xl shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Curriculum Extraction & Concept Analysis Ready
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Combined from {analysisData.sourceCount} source file(s) across {analysisData.totalSections} sections. Review detected hierarchy, verify extracted definitions vs inferred concepts, and generate documentation.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerateDocumentation}
                    disabled={isGenerating}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xl shadow-blue-500/25 transition cursor-pointer"
                  >
                    {isGenerating ? <LoadingSpinner size="sm" /> : <Sparkles className="w-5 h-5 text-amber-300" />}
                    GENERATE TEACHING DOCUMENTATION
                  </button>
                </div>
              </div>

              {/* Detected Hierarchy & Teacher Corrections Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      Detected Syllabus Metadata & Teacher Corrections
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      The AI detected the following structure. You may modify or correct any field before generation.
                    </p>
                  </div>
                  <Badge variant="info">Teacher Verified Override Enabled</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Class / Grade</label>
                    <input
                      type="text"
                      value={teacherCorrections.className}
                      onChange={(e) => setTeacherCorrections({ ...teacherCorrections, className: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
                      placeholder="Class 9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                    <input
                      type="text"
                      value={teacherCorrections.subject}
                      onChange={(e) => setTeacherCorrections({ ...teacherCorrections, subject: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
                      placeholder="Artificial Intelligence"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Unit</label>
                    <input
                      type="text"
                      value={teacherCorrections.unit}
                      onChange={(e) => setTeacherCorrections({ ...teacherCorrections, unit: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
                      placeholder="Unit 1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
                    <input
                      type="text"
                      value={teacherCorrections.chapter}
                      onChange={(e) => setTeacherCorrections({ ...teacherCorrections, chapter: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
                      placeholder="Chapter 1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Topic</label>
                    <input
                      type="text"
                      value={teacherCorrections.topic}
                      onChange={(e) => setTeacherCorrections({ ...teacherCorrections, topic: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200"
                      placeholder="AI Ethics"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Document Conflict & Duplicate Detection Alert */}
              {analysisData.conflictDetections && analysisData.conflictDetections.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Multi-Document Source Discrepancies & Conflict Detection
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    The AI detected varying depth or conflicting descriptions across your uploaded files. Review the differences below:
                  </p>
                  <div className="space-y-3">
                    {analysisData.conflictDetections.map((conflict, i) => (
                      <div
                        key={i}
                        className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 text-xs space-y-2"
                      >
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span>Focus Area: {conflict.field}</span>
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                            Cross-Document Variation
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{conflict.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {conflict.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                              <div className="font-semibold text-blue-600 dark:text-blue-400">
                                {src.fileName} (Ref: {src.itemNumber})
                              </div>
                              <p className="text-slate-500 italic mt-0.5">"{src.text}..."</p>
                            </div>
                          ))}
                        </div>
                        <div className="pt-1 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Suggested Synthesis: </span>
                          {conflict.resolutionSuggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tagged Extracted Concepts: Directly Extracted vs Inferred Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Definitions & Terminology */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Key Definitions & Core Terminology</span>
                    <span className="text-xs font-normal text-slate-400">
                      {analysisData.detectedMetadata.definitions?.length || 0} items
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {analysisData.detectedMetadata.definitions?.map((d, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{d.term}</span>
                          {d.origin === 'extracted' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                              Directly Extracted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                              AI Inferred
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{d.definition}</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold">Source Ref:</span> {d.sourceRef}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learning Objectives */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Learning Objectives & Pedagogical Goals</span>
                    <span className="text-xs font-normal text-slate-400">
                      {analysisData.detectedMetadata.learningObjectives?.length || 0} items
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {analysisData.detectedMetadata.learningObjectives?.map((obj, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Objective #{i + 1}</span>
                          {obj.origin === 'extracted' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                              Directly Extracted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                              AI Inferred
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{obj.objective}</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold">Source Ref:</span> {obj.sourceRef}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-life Examples & Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Life Educational Examples</h3>
                  <div className="space-y-2">
                    {analysisData.detectedMetadata.examples?.map((ex, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span>Example #{i + 1}</span>
                          <span className={`text-[10px] font-bold ${ex.origin === 'extracted' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {ex.origin === 'extracted' ? 'Extracted' : 'Inferred'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{ex.example}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Teaching Aids & Illustrated Diagrams</h3>
                  <div className="space-y-2">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Teaching Aids Identified:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisData.detectedMetadata.teachingAids?.map((aid, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                          {aid}
                        </span>
                      ))}
                    </div>

                    <div className="font-semibold text-slate-700 dark:text-slate-300 pt-2">Diagrammatic Visuals:</div>
                    {analysisData.detectedMetadata.importantDiagrams?.map((diag, dIdx) => (
                      <div key={dIdx} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{diag.description}</span>
                        <div className="text-[10px] text-slate-400">Source: {diag.sourceRef}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: SLIDE-WISE TEACHING GUIDE (POWERPOINT) */}
      {/* ==================================================== */}
      {activeTab === 'slides' && (
        <div className="space-y-6">
          {!generatedMaterial?.slideExplanations || generatedMaterial.slideExplanations.length === 0 ? (
            <EmptyState
              icon={Presentation}
              title="No Presentation Slides Found"
              description="Upload a PowerPoint (.pptx / .ppt) file and click Generate to see interactive slide-wise explanations."
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-amber-500" />
                    Slide-Wise Teaching Explanations & Delivery Guide
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Original slide content is preserved separately from AI-generated classroom explanations, student examples, and interactive questions.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('workspace')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Proceed to Full Documentation <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Slides Grid */}
              <div className="space-y-6">
                {generatedMaterial.slideExplanations.map((slide, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
                  >
                    {/* Slide Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center text-sm">
                          {slide.slideNumber}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {slide.slideHeading}
                          </h3>
                          <span className="text-[11px] text-slate-400">Ref: {slide.sourceRef}</span>
                        </div>
                      </div>
                      <Badge variant="warning">Slide {slide.slideNumber}</Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Original Extracted Content */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Original Extracted Slide Content
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                          {slide.extractedOriginalContent || 'No textual bullet points on this slide.'}
                        </div>
                      </div>

                      {/* Right: AI Teacher Explanation */}
                      <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs">
                        <div className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Detailed Teacher Explanation for Classroom
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                          {slide.detailedTeacherExplanation}
                        </p>
                      </div>
                    </div>

                    {/* Student Examples & Interactive Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                      <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                        <div className="font-bold text-emerald-900 dark:text-emerald-300">
                          Student-Friendly Example:
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{slide.studentFriendlyExamples}</p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-1">
                        <div className="font-bold text-purple-900 dark:text-purple-300">
                          Questions to Ask Students:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                          {slide.questionsToAskStudents?.map((q, qIdx) => (
                            <li key={qIdx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {slide.classroomActivitySuggestions && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Suggested 2-Minute Quick Activity:{' '}
                        </span>
                        {slide.classroomActivitySuggestions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: TEACHER REVIEW WORKSPACE */}
      {/* ==================================================== */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {!generatedMaterial ? (
            <EmptyState
              icon={BookOpen}
              title="No Documentation Generated Yet"
              description="Extract materials and click 'GENERATE TEACHING DOCUMENTATION' to review editable lesson plans and teaching dossiers."
            />
          ) : (
            <div className="space-y-6">
              {/* Workspace Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={generatedMaterial.status === 'Approved' ? 'success' : 'primary'}>
                    Status: {generatedMaterial.status || 'Draft'}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium">
                    Language: {generatedMaterial.language}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Compare Source Reference Drawer Button */}
                  <button
                    onClick={() => setShowCompareDrawer(!showCompareDrawer)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <SplitSquareVertical className="w-4 h-4 text-blue-600" />
                    Compare Source Ref
                  </button>

                  {/* Save Draft */}
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </button>

                  {/* Approve */}
                  {generatedMaterial.status !== 'Approved' && (
                    <button
                      onClick={handleApproveMaterial}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Approve Dossier
                    </button>
                  )}

                  {/* Convert to Formal Lesson Plan */}
                  <button
                    onClick={handleConvertToLessonPlan}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <BookMarked className="w-4 h-4" />
                    Convert to Lesson Plan
                  </button>

                  {/* Create Daily Diary Draft */}
                  <button
                    onClick={() => setDiaryConfirmModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    Send to Diary Draft
                  </button>

                  {/* Word Export */}
                  <a
                    href={documentIntelligenceApi.getWordExportUrl(generatedMaterial._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Word (.docx)
                  </a>

                  {/* PDF Export */}
                  <a
                    href={documentIntelligenceApi.getPdfExportUrl(generatedMaterial._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </a>
                </div>
              </div>

              {/* Workspace Navigation Subtabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setWorkspaceSubTab('lessonPlan')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    workspaceSubTab === 'lessonPlan'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  A. Detailed Lesson Plan
                </button>

                <button
                  onClick={() => setWorkspaceSubTab('notes')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    workspaceSubTab === 'notes'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  B. Classroom Teaching Notes
                </button>

                <button
                  onClick={() => setWorkspaceSubTab('questions')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    workspaceSubTab === 'questions'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  C. Question Bank
                </button>

                <button
                  onClick={() => setWorkspaceSubTab('activities')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    workspaceSubTab === 'activities'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  D. Classroom Activity Plan
                </button>

                <button
                  onClick={() => setWorkspaceSubTab('diary')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    workspaceSubTab === 'diary'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  E. Daily Teaching Diary Draft
                </button>
              </div>

              {/* Subtab Contents */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                {/* 1. LESSON PLAN */}
                {workspaceSubTab === 'lessonPlan' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          A. Detailed Lesson Plan (13 Standard Pedagogical Dimensions)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Edit text directly. All changes can be saved as draft or converted to formal Lesson Plan.
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateSection('lessonPlan')}
                        disabled={regeneratingSection === 'lessonPlan'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'lessonPlan' ? 'animate-spin' : ''}`} />
                        Regenerate Lesson Plan
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Lesson Title</label>
                        <input
                          type="text"
                          value={generatedMaterial.lessonPlan?.title || ''}
                          onChange={(e) =>
                            setGeneratedMaterial({
                              ...generatedMaterial,
                              lessonPlan: { ...generatedMaterial.lessonPlan, title: e.target.value },
                            })
                          }
                          className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Learning Objectives</label>
                          <textarea
                            rows={4}
                            value={generatedMaterial.lessonPlan?.learningObjectives || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, learningObjectives: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Previous Knowledge Required</label>
                          <textarea
                            rows={4}
                            value={generatedMaterial.lessonPlan?.previousKnowledge || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, previousKnowledge: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Introduction & Engaging Hook</label>
                          <textarea
                            rows={3}
                            value={generatedMaterial.lessonPlan?.introduction || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, introduction: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Key Definitions</label>
                          <textarea
                            rows={3}
                            value={generatedMaterial.lessonPlan?.definitions || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, definitions: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Detailed Topic Explanation</label>
                        <textarea
                          rows={6}
                          value={generatedMaterial.lessonPlan?.topicExplanation || ''}
                          onChange={(e) =>
                            setGeneratedMaterial({
                              ...generatedMaterial,
                              lessonPlan: { ...generatedMaterial.lessonPlan, topicExplanation: e.target.value },
                            })
                          }
                          className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Teaching Methodology</label>
                          <input
                            type="text"
                            value={generatedMaterial.lessonPlan?.teachingMethodology || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, teachingMethodology: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Teaching Aids</label>
                          <input
                            type="text"
                            value={generatedMaterial.lessonPlan?.teachingAids || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, teachingAids: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Homework</label>
                          <input
                            type="text"
                            value={generatedMaterial.lessonPlan?.homework || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                lessonPlan: { ...generatedMaterial.lessonPlan, homework: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CLASSROOM TEACHING NOTES */}
                {workspaceSubTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          B. Detailed Classroom Teaching Notes
                        </h3>
                        <p className="text-xs text-slate-500">
                          Topic-wise explanation, step-by-step proofs, examples, discussions, and lesson summary.
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateSection('classroomTeachingNotes')}
                        disabled={regeneratingSection === 'classroomTeachingNotes'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'classroomTeachingNotes' ? 'animate-spin' : ''}`} />
                        Regenerate Notes
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Topic-wise Explanation</label>
                        <textarea
                          rows={6}
                          value={generatedMaterial.classroomTeachingNotes?.topicWiseExplanation || ''}
                          onChange={(e) =>
                            setGeneratedMaterial({
                              ...generatedMaterial,
                              classroomTeachingNotes: { ...generatedMaterial.classroomTeachingNotes, topicWiseExplanation: e.target.value },
                            })
                          }
                          className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Step-by-Step Derivations</label>
                          <textarea
                            rows={4}
                            value={generatedMaterial.classroomTeachingNotes?.stepByStepExplanations || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                classroomTeachingNotes: { ...generatedMaterial.classroomTeachingNotes, stepByStepExplanations: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Classroom Discussion Questions</label>
                          <textarea
                            rows={4}
                            value={generatedMaterial.classroomTeachingNotes?.classroomDiscussion || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                classroomTeachingNotes: { ...generatedMaterial.classroomTeachingNotes, classroomDiscussion: e.target.value },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Summary</label>
                        <textarea
                          rows={3}
                          value={generatedMaterial.classroomTeachingNotes?.summary || ''}
                          onChange={(e) =>
                            setGeneratedMaterial({
                              ...generatedMaterial,
                              classroomTeachingNotes: { ...generatedMaterial.classroomTeachingNotes, summary: e.target.value },
                            })
                          }
                          className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. QUESTION BANK */}
                {workspaceSubTab === 'questions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          C. Comprehensive Question Bank & Assessment
                        </h3>
                        <p className="text-xs text-slate-500">
                          MCQs with options, True/False, Fill in blanks, Short and Long answers with rubrics and answer keys.
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateSection('questionBank')}
                        disabled={regeneratingSection === 'questionBank'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'questionBank' ? 'animate-spin' : ''}`} />
                        Regenerate Question Bank
                      </button>
                    </div>

                    {/* MCQs */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Multiple Choice Questions (MCQs):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {generatedMaterial.questionBank?.mcqs?.map((mcq, mIdx) => (
                          <div
                            key={mIdx}
                            className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                          >
                            <div className="font-bold text-slate-900 dark:text-white">
                              Q{mIdx + 1}. {mcq.question}
                            </div>
                            <div className="space-y-1 text-slate-600 dark:text-slate-400 pl-2">
                              {mcq.options?.map((opt, oIdx) => (
                                <div key={oIdx}>{opt}</div>
                              ))}
                            </div>
                            <div className="pt-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              Answer: {mcq.answer}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* True or False */}
                    <div className="space-y-2 pt-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        True or False Statements:
                      </h4>
                      <div className="space-y-2">
                        {generatedMaterial.questionBank?.trueFalse?.map((tf, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex items-center justify-between"
                          >
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {tIdx + 1}. {tf.statement}
                            </span>
                            <Badge variant={tf.isTrue ? 'success' : 'danger'}>
                              {tf.isTrue ? 'True' : 'False'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Short & Long Answers */}
                    <div className="space-y-3 pt-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Short & Analytical Long Answer Questions:
                      </h4>
                      {generatedMaterial.questionBank?.shortAnswers?.map((sa, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1"
                        >
                          <div className="font-bold text-slate-900 dark:text-white">
                            Short Q{sIdx + 1}: {sa.question}
                          </div>
                          <p className="text-slate-600 dark:text-slate-400">Model Answer: {sa.answer}</p>
                        </div>
                      ))}

                      {generatedMaterial.questionBank?.longAnswers?.map((la, lIdx) => (
                        <div
                          key={lIdx}
                          className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl text-xs space-y-1.5"
                        >
                          <div className="font-bold text-blue-950 dark:text-blue-200">
                            Long Answer Q{lIdx + 1}: {la.question}
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {la.answer}
                          </p>
                          {la.rubric && (
                            <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                              Evaluation Rubric: {la.rubric}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. CLASSROOM ACTIVITIES */}
                {workspaceSubTab === 'activities' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          D. Classroom Activity Plan
                        </h3>
                        <p className="text-xs text-slate-500">
                          Structured individual tasks, collaborative group exercises, and practical laboratory demonstrations.
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateSection('classroomActivityPlan')}
                        disabled={regeneratingSection === 'classroomActivityPlan'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'classroomActivityPlan' ? 'animate-spin' : ''}`} />
                        Regenerate Activities
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {generatedMaterial.classroomActivityPlan?.individualActivities?.map((act, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>Individual: {act.title}</span>
                            <Badge variant="primary">{act.timeMinutes || 10} mins</Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{act.description}</p>
                          <div className="text-[11px] text-slate-500">
                            <strong>Materials:</strong> {act.materials}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            <strong>Outcome:</strong> {act.expectedOutcome}
                          </div>
                        </div>
                      ))}

                      {generatedMaterial.classroomActivityPlan?.groupActivities?.map((act, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>Group: {act.title}</span>
                            <Badge variant="secondary">{act.groupSize || '4-5 students'}</Badge>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{act.description}</p>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            <strong>Outcome:</strong> {act.expectedOutcome}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. DAILY TEACHING DIARY DRAFT */}
                {workspaceSubTab === 'diary' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          E. Daily Teaching Diary Draft
                        </h3>
                        <p className="text-xs text-slate-500">
                          Maintained strictly as a draft. The teacher must confirm which content was actually taught in class before marking completed.
                        </p>
                      </div>
                      <Badge variant="warning">Status: Draft (Pending Completion)</Badge>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Class Handled</label>
                          <input
                            type="text"
                            value={generatedMaterial.dailyTeachingDiaryDraft?.className || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  className: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Subject</label>
                          <input
                            type="text"
                            value={generatedMaterial.dailyTeachingDiaryDraft?.subject || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  subject: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Unit / Chapter</label>
                          <input
                            type="text"
                            value={generatedMaterial.dailyTeachingDiaryDraft?.unit || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  unit: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Topic Taught</label>
                          <input
                            type="text"
                            value={generatedMaterial.dailyTeachingDiaryDraft?.topic || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  topic: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Detailed Classroom Teaching Explanation</label>
                        <textarea
                          rows={4}
                          value={generatedMaterial.dailyTeachingDiaryDraft?.detailedTeachingExplanation || ''}
                          onChange={(e) =>
                            setGeneratedMaterial({
                              ...generatedMaterial,
                              dailyTeachingDiaryDraft: {
                                ...generatedMaterial.dailyTeachingDiaryDraft,
                                detailedTeachingExplanation: e.target.value,
                              },
                            })
                          }
                          className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Activities Conducted</label>
                          <textarea
                            rows={3}
                            value={generatedMaterial.dailyTeachingDiaryDraft?.activities || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  activities: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Learning Outcomes Achieved</label>
                          <textarea
                            rows={3}
                            value={generatedMaterial.dailyTeachingDiaryDraft?.expectedLearningOutcomes || ''}
                            onChange={(e) =>
                              setGeneratedMaterial({
                                ...generatedMaterial,
                                dailyTeachingDiaryDraft: {
                                  ...generatedMaterial.dailyTeachingDiaryDraft,
                                  expectedLearningOutcomes: e.target.value,
                                },
                              })
                            }
                            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Official Teacher Confirmation Action */}
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-bold text-amber-900 dark:text-amber-200">
                            Teacher Lesson Completion Verification
                          </div>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300">
                            Diary entries cannot be completed automatically. Click to confirm teaching verification.
                          </p>
                        </div>
                        <button
                          onClick={() => setDiaryConfirmModalOpen(true)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                        >
                          Send to Diary Draft
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SIDE-BY-SIDE COMPARE SOURCE CONTENT DRAWER */}
      {/* ==================================================== */}
      {showCompareDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Source Reference & Extracted Content Comparison
                </h3>
              </div>
              <button
                onClick={() => setShowCompareDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Verify how the generated teaching materials trace back to your uploaded presentation slides, textbook pages, and notes.
            </p>

            <div className="space-y-4">
              {extractedContents.length === 0 ? (
                <p className="text-xs text-slate-400">No extracted sections currently loaded.</p>
              ) : (
                extractedContents.map((ec, ecIdx) => (
                  <div key={ecIdx} className="space-y-2">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {ec.fileType} ({ec.totalItems} sections)
                    </div>
                    {ec.sections?.slice(0, 8).map((sec, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{sec.sourceReference?.label || `Section ${sec.itemNumber}`}</span>
                          <span className="text-[10px] text-slate-400">{sec.itemType}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {(sec.text || '').slice(0, 180)}...
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowCompareDrawer(false)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
            >
              Close Comparison
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PREVIEW DOCUMENT MODAL */}
      {/* ==================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getFormatIcon(previewDoc.extension)}
                <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                  {previewDoc.originalName}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div><strong>Format:</strong> {previewDoc.extension?.toUpperCase()} ({previewDoc.mimeType})</div>
              <div><strong>Class:</strong> {previewDoc.className} | <strong>Subject:</strong> {previewDoc.subject}</div>
              <div><strong>Unit:</strong> {previewDoc.unit || 'N/A'} | <strong>Chapter:</strong> {previewDoc.chapter || 'N/A'}</div>
              <div><strong>Topic:</strong> {previewDoc.topic || 'N/A'}</div>
              <div><strong>File Size:</strong> {(previewDoc.fileSize / 1024).toFixed(1)} KB</div>
              <div><strong>Upload Date:</strong> {new Date(previewDoc.date || previewDoc.createdAt).toLocaleString()}</div>
              <div><strong>Status:</strong> {previewDoc.status}</div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <a
                href={documentIntelligenceApi.getPreviewUrl(previewDoc._id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                <ExternalLink className="w-4 h-4" /> Open File Preview / Stream
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REPLACE DOCUMENT MODAL */}
      {/* ==================================================== */}
      {replaceDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleReplaceSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" /> Replace Document
              </h3>
              <button
                type="button"
                onClick={() => setReplaceDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Replacing <strong>{replaceDoc.originalName}</strong> will archive the previous version and index the updated file.
            </p>

            <input
              type="file"
              name="replaceFile"
              required
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplaceDoc(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition"
              >
                Replace File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* DELETE CONFIRM MODAL */}
      {/* ==================================================== */}
      <ConfirmModal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Uploaded Document?"
        message="This document and its stored files will be permanently removed. Extracted sections will no longer be available for AI generation."
        confirmText="Delete Document"
        type="danger"
      />

      {/* ==================================================== */}
      {/* DIARY CONFIRM COMPLETION MODAL */}
      {/* ==================================================== */}
      <ConfirmModal
        isOpen={diaryConfirmModalOpen}
        onClose={() => setDiaryConfirmModalOpen(false)}
        onConfirm={handleConfirmDiaryCreation}
        title="Confirm Daily Teaching Diary Entry"
        message="A Daily Teaching Diary entry will be drafted. To mark it 'Completed', check the box below to verify that this lesson was actually delivered in class."
        confirmText={diaryConfirmedTaught ? 'Save as Completed' : 'Save as Draft'}
        type="primary"
      >
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={diaryConfirmedTaught}
              onChange={(e) => setDiaryConfirmedTaught(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>I confirm that this lesson content was actually taught in class.</span>
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default DocumentIntelligencePage;
