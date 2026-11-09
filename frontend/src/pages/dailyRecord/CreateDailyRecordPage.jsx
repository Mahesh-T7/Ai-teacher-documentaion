import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Save,
  Download,
  Printer,
  Edit2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { diaryApi } from '../../api/diaryApi';
import { aiApi } from '../../api/aiApi';
import { photoApi } from '../../api/photoApi';
import { documentIntelligenceApi } from '../../api/documentIntelligenceApi';
import { reportApi } from '../../api/reportApi';
import { lessonPlanApi } from '../../api/lessonPlanApi';
import { LessonPlanPreviewModal } from '../../components/lessonPlan/LessonPlanPreviewModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const STANDARD_CLASSES = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

const STANDARD_SUBJECTS = [
  'General Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Artificial Intelligence',
  'English',
  'Social Science',
  'Kannada',
  'Hindi',
];

const PERIOD_OPTIONS = [
  { value: 1, label: 'Period 1 (09:00 - 09:45)' },
  { value: 2, label: 'Period 2 (09:45 - 10:30)' },
  { value: 3, label: 'Period 3 (10:45 - 11:30)' },
  { value: 4, label: 'Period 4 (11:30 - 12:15)' },
  { value: 5, label: 'Period 5 (01:00 - 01:45)' },
  { value: 6, label: 'Period 6 (01:45 - 02:30)' },
  { value: 7, label: 'Period 7 (02:40 - 03:25)' },
  { value: 8, label: 'Period 8 (03:25 - 04:10)' },
];

export const CreateDailyRecordPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Stepper state: 1: Basic Info, 2: Teaching Content, 3: Review & Save
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // STEP 1: Basic Information
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const lastClass = localStorage.getItem('teacher_last_class') || user?.classesHandled?.[0] || 'Class 10';
  const lastSubject = localStorage.getItem('teacher_last_subject') || user?.subjectsTaught?.[0] || 'General Science';

  const [date, setDate] = useState(todayStr);
  const [className, setClassName] = useState(lastClass);
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState(lastSubject);
  const [period, setPeriod] = useState(1);

  // STEP 2: Teaching Content
  const [activeInputMode, setActiveInputMode] = useState('both'); // 'upload' | 'manual' | 'both'
  const [uploadedFiles, setUploadedFiles] = useState([]); // Array of uploaded document records
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // STEP 3: The 9 AI Pedagogical Fields
  const [docFields, setDocFields] = useState({
    topic: '',
    learningObjectives: '',
    teachingMethodology: '',
    classroomActivities: '',
    teachingAids: '',
    learningOutcomes: '',
    studentParticipation: '',
    assessment: '',
    homework: '',
  });

  // Attached Photographs in Step 3
  const [attachedPhotos, setAttachedPhotos] = useState([]); // Array of photo objects
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [teacherRemarks, setTeacherRemarks] = useState('');

  // PDF Preview Modal State
  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Warn before leaving unsaved form
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load existing record if editing
  useEffect(() => {
    if (editId) {
      const loadRecord = async () => {
        try {
          setLoadingInitial(true);
          const res = await diaryApi.getDiaryEntryById(editId);
          if (res.success && res.data) {
            const entry = res.data;
            setDate(new Date(entry.date).toISOString().split('T')[0]);
            setClassName(entry.className || 'Class 10');
            setSection(entry.section || 'A');
            setSubject(entry.subject || 'General Science');
            setPeriod(entry.period || 1);
            setDocFields({
              topic: entry.topic || '',
              learningObjectives: entry.learningObjectives || '',
              teachingMethodology: entry.teachingMethodology || '',
              classroomActivities: entry.classroomActivities || entry.activitiesConducted || '',
              teachingAids: entry.teachingAids || '',
              learningOutcomes: entry.learningOutcomes || '',
              studentParticipation: entry.studentParticipation || '',
              assessment: entry.assessment || '',
              homework: entry.homeworkAssigned || '',
            });
            setTeacherRemarks(entry.teacherRemarks || '');
            setCurrentStep(3); // Jump straight to review for editing

            // Load associated photographs
            try {
              const photoRes = await photoApi.getPhotos({ teachingEntryId: editId });
              const existingPhotos = photoRes.data || photoRes.photos || [];
              if (existingPhotos.length > 0) {
                setAttachedPhotos(existingPhotos);
              } else if (Array.isArray(entry.classroomPhotographs) && entry.classroomPhotographs.length > 0) {
                setAttachedPhotos(
                  entry.classroomPhotographs.map((url, idx) => ({
                    id: `entry_photo_${idx}`,
                    url,
                    storageKey: url.replace('/uploads/', ''),
                    caption: `Classroom Evidence ${idx + 1}`,
                  }))
                );
              }
            } catch (pErr) {
              if (Array.isArray(entry.classroomPhotographs) && entry.classroomPhotographs.length > 0) {
                setAttachedPhotos(
                  entry.classroomPhotographs.map((url, idx) => ({
                    id: `entry_photo_${idx}`,
                    url,
                    storageKey: url.replace('/uploads/', ''),
                    caption: `Classroom Evidence ${idx + 1}`,
                  }))
                );
              }
            }
          }
        } catch (err) {
          showToast(err.message || 'Failed to load record for editing', 'error');
        } finally {
          setLoadingInitial(false);
        }
      };
      loadRecord();
    }
  }, [editId, showToast]);

  // Available classes & subjects merged with teacher profile
  const classOptions = Array.from(
    new Set([...(user?.classesHandled || []), ...STANDARD_CLASSES])
  );
  const subjectOptions = Array.from(
    new Set([...(user?.subjectsTaught || []), ...STANDARD_SUBJECTS])
  );

  // Handle Step 1 Validation & Proceed
  const handleStep1Proceed = () => {
    if (!date) {
      showToast('Please select a teaching date.', 'error');
      return;
    }
    if (!className) {
      showToast('Please select a class.', 'error');
      return;
    }
    if (!subject) {
      showToast('Please select a subject.', 'error');
      return;
    }

    // Remember selections
    localStorage.setItem('teacher_last_class', className);
    localStorage.setItem('teacher_last_subject', subject);

    setIsDirty(true);
    setCurrentStep(2);
  };

  // Handle Material Upload in Step 2 (PDF, PPT, Word, Images)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('className', className);
    formData.append('subject', subject);
    formData.append('date', date);

    try {
      setIsUploading(true);
      setUploadProgress(10);
      const res = await documentIntelligenceApi.uploadDocuments(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success && res.data) {
        setUploadedFiles((prev) => [...prev, ...res.data]);
        showToast(`Uploaded ${res.data.length} material(s) successfully.`, 'success');
        setIsDirty(true);
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload teaching material', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle AI Documentation Generation
  const handleGenerateAI = async () => {
    if (!manualDescription.trim() && uploadedFiles.length === 0) {
      showToast(
        'Please enter what you taught today or upload teaching materials first.',
        'error'
      );
      return;
    }

    try {
      setGeneratingAI(true);
      const documentIds = uploadedFiles.map((f) => f._id || f.id).filter(Boolean);

      const res = await aiApi.generateDocumentation({
        manualDescription,
        additionalNotes,
        className,
        subject,
        period,
        date,
        documentIds,
      });

      if (res.success && res.data) {
        setDocFields({
          topic: res.data.topic || '',
          learningObjectives: res.data.learningObjectives || '',
          teachingMethodology: res.data.teachingMethodology || 'Interactive Lecture & 5E Model',
          classroomActivities: res.data.classroomActivities || '',
          teachingAids: res.data.teachingAids || 'Blackboard, Slides & Worksheets',
          learningOutcomes: res.data.learningOutcomes || '',
          studentParticipation: res.data.studentParticipation || '',
          assessment: res.data.assessment || '',
          homework: res.data.homework || '',
        });
        showToast('Teaching documentation generated with AI!', 'success');
        setIsDirty(true);
        setCurrentStep(3); // Advance to Review and Save
      }
    } catch (err) {
      showToast(err.message || 'AI generation failed. You can also fill the fields manually.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Handle Photograph Attachment in Step 3
  const handlePhotoUpload = async (eOrFiles) => {
    let files = [];
    if (Array.isArray(eOrFiles)) {
      files = eOrFiles;
    } else if (eOrFiles?.target?.files) {
      files = Array.from(eOrFiles.target.files);
    }
    if (!files || files.length === 0) return;

    // Filter valid image files
    const validImageFiles = files.filter(
      (f) => f.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(f.name)
    );

    if (validImageFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP, GIF, BMP).', 'error');
      return;
    }

    // Instant local previews for zero perceived latency
    const localPreviews = validImageFiles.map((file, idx) => ({
      id: `local_temp_${Date.now()}_${idx}`,
      url: URL.createObjectURL(file),
      originalFileName: file.name,
      caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      isUploading: true,
      file,
    }));

    setAttachedPhotos((prev) => [...prev, ...localPreviews]);
    setIsDirty(true);

    const formData = new FormData();
    validImageFiles.forEach((file) => formData.append('photos', file));
    formData.append('className', className || 'Class 10');
    formData.append('section', section || 'A');
    formData.append('subject', subject || 'General Science');
    formData.append('date', date);

    try {
      setUploadingPhotos(true);
      const res = await photoApi.uploadPhotos(formData);
      const uploadedList = res.data || res.photos || (Array.isArray(res) ? res : []);

      if (res.success && uploadedList.length > 0) {
        // Swap temp preview entries with server-persisted photo records
        setAttachedPhotos((prev) => {
          const preserved = prev.filter((p) => !localPreviews.some((lp) => lp.id === p.id));
          return [...preserved, ...uploadedList];
        });
        showToast(`Attached ${uploadedList.length} photo(s) successfully!`, 'success');
      } else {
        // Server responded without full payload; mark previews as ready
        setAttachedPhotos((prev) =>
          prev.map((p) => (localPreviews.some((lp) => lp.id === p.id) ? { ...p, isUploading: false } : p))
        );
        showToast(`Attached ${validImageFiles.length} photo(s).`, 'success');
      }
    } catch (err) {
      console.warn('[Photo Upload Server Warning]', err.message);
      // Seamless offline/local fallback: encode as DataURL so photos persist in current session
      try {
        const base64Fallbacks = await Promise.all(
          validImageFiles.map((file) => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: `local_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  url: reader.result,
                  originalFileName: file.name,
                  caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                  isUploading: false,
                });
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
            });
          })
        );
        const validFallbacks = base64Fallbacks.filter(Boolean);
        setAttachedPhotos((prev) => {
          const preserved = prev.filter((p) => !localPreviews.some((lp) => lp.id === p.id));
          return [...preserved, ...validFallbacks];
        });
        showToast('Attached photos to session. They are ready for preview and PDF export.', 'info');
      } catch (fallbackErr) {
        setAttachedPhotos((prev) =>
          prev.map((p) => (localPreviews.some((lp) => lp.id === p.id) ? { ...p, isUploading: false } : p))
        );
      }
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleUpdatePhotoCaption = (index, newCaption) => {
    setAttachedPhotos((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], caption: newCaption };
      }
      return updated;
    });
    setIsDirty(true);
  };

  const handleRemovePhoto = (indexToRemove) => {
    setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setIsDirty(true);
  };

  const handleMovePhoto = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= attachedPhotos.length) return;
    const reordered = [...attachedPhotos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setAttachedPhotos(reordered);
    setIsDirty(true);
  };

  // Save Record (Draft or Completed)
  const handleSaveRecord = async (isCompleted) => {
    if (!docFields.topic.trim()) {
      showToast('Please provide a Topic Covered before saving.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date,
        className,
        section,
        subject,
        period: Number(period) || 1,
        topic: docFields.topic.trim(),
        learningObjectives: docFields.learningObjectives,
        teachingMethodology: docFields.teachingMethodology,
        activitiesConducted: docFields.classroomActivities,
        classroomActivities: docFields.classroomActivities,
        teachingAids: docFields.teachingAids,
        learningOutcomes: docFields.learningOutcomes,
        studentParticipation: docFields.studentParticipation,
        assessment: docFields.assessment,
        homeworkAssigned: docFields.homework,
        teacherRemarks,
        classroomPhotographs: attachedPhotos.map((p) => p.url || `/uploads/${p.storageKey}`).filter(Boolean),
        detailedContent: `${docFields.topic}\n\n${docFields.learningObjectives}\n\n${docFields.classroomActivities}`,
        status: isCompleted ? 'Completed' : 'Draft',
        teacherConfirmed: isCompleted,
      };

      let savedRecordId = editId;

      if (editId) {
        await diaryApi.updateDiaryEntry(editId, payload);
        showToast(
          isCompleted ? 'Final record saved successfully!' : 'Draft updated successfully.',
          'success'
        );
      } else {
        const res = await diaryApi.createDiaryEntry(payload);
        savedRecordId = res.data?._id || res.data?.id;
        showToast(
          isCompleted ? 'Final teaching record saved!' : 'Teaching record saved as draft.',
          'success'
        );
      }

      // Link any attached photos to this record
      if (savedRecordId && attachedPhotos.length > 0) {
        for (const photo of attachedPhotos) {
          const photoId = photo._id || photo.id;
          if (photoId) {
            try {
              await photoApi.updatePhoto(photoId, { teachingEntryId: savedRecordId });
            } catch (pErr) {
              console.warn('Could not link photo:', pErr.message);
            }
          }
        }
      }

      setIsDirty(false);
      navigate('/teaching-history');
    } catch (err) {
      showToast(err.message || 'Failed to save teaching record', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Compile current form data into complete Lesson Plan structure
  const getCompiledLessonPlanData = useCallback(() => {
    return {
      _id: editId || 'draft_temp',
      schoolName: user?.schoolName || 'Government / Model Secondary School',
      teacherName: user?.fullName || user?.name || 'Teacher',
      teacherDesignation: user?.designation || 'Subject Teacher',
      academicYear: '2026-2027',
      date,
      className,
      section,
      subject,
      period,
      durationMinutes: 45,
      topic: docFields.topic || 'Classroom Teaching Session',
      subtopic: '',
      unit: 'Core Academic Unit',
      learningObjectives: docFields.learningObjectives,
      previousKnowledge: '',
      teachingMethodology: docFields.teachingMethodology,
      teachingAids: docFields.teachingAids,
      classroomActivities: docFields.classroomActivities,
      learningOutcomes: docFields.learningOutcomes,
      studentParticipation: docFields.studentParticipation,
      assessment: docFields.assessment,
      homework: docFields.homework,
      teacherRemarks: teacherRemarks || '',
      photos: attachedPhotos,
      teachingResources: {
        textbooks: uploadedFiles
          .filter((f) => f.mimeType?.includes('pdf') || f.name?.endsWith('.pdf'))
          .map((f) => f.name)
          .join(', '),
        digitalResources: uploadedFiles
          .filter((f) => f.name?.endsWith('.ppt') || f.name?.endsWith('.pptx'))
          .map((f) => f.name)
          .join(', '),
        teachingAids: docFields.teachingAids,
      },
      status: 'Verified & Reviewed',
    };
  }, [
    editId,
    user,
    date,
    className,
    section,
    subject,
    period,
    docFields,
    teacherRemarks,
    attachedPhotos,
    uploadedFiles,
  ]);

  // Preview A4 Lesson Plan Modal
  const handleOpenPdfPreview = () => {
    setPdfPreviewModalOpen(true);
  };

  // Direct Print Lesson Plan
  const handlePrintLessonPlan = () => {
    setPdfPreviewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  // Direct Download Official PDF
  const handleDownloadLessonPlanPdf = async () => {
    try {
      const planData = getCompiledLessonPlanData();
      const res = await lessonPlanApi.downloadLessonPlanPreviewPdf(planData);
      const blob =
        res instanceof Blob
          ? res
          : res?.data instanceof Blob
          ? res.data
          : new Blob([res?.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeClass = className.replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeSub = subject.replace(/[^a-zA-Z0-9_\-]/g, '');
      const dateFormatted = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
        .format(date ? new Date(date) : new Date())
        .replace(/\//g, '-');
      link.download = `LessonPlan_${safeClass}_${safeSub}_${dateFormatted}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Official Lesson Plan PDF downloaded!', 'success');
    } catch (err) {
      showToast('Failed to download PDF.', 'error');
    }
  };

  // Edit Lesson Plan action
  const handleEditLessonPlan = () => {
    setPdfPreviewModalOpen(false);
    const firstInput = document.querySelector('input[type="text"]');
    if (firstInput) firstInput.focus();
    showToast('Editing mode active. Review and make corrections.', 'info');
  };

  if (loadingInitial) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Loading teaching record details..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Page Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {editId ? 'Edit Teaching Record' : 'Create Daily Teaching Record'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document today's classroom teaching with our guided 3-step workflow.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              Unsaved Changes
            </span>
          )}
        </div>
      </div>

      {/* Progress Stepper: Step 1 → Step 2 → Step 3 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 cursor-pointer ${
              currentStep === 1
                ? 'text-blue-600 font-bold'
                : currentStep > 1
                ? 'text-emerald-600 font-semibold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === 1
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStep > 1
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-xs hidden sm:inline">Basic Information</span>
          </div>

          <div
            className={`flex-1 h-0.5 mx-3 ${
              currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />

          {/* Step 2 */}
          <div
            onClick={() => {
              if (currentStep > 1 || date) setCurrentStep(2);
            }}
            className={`flex items-center gap-2.5 cursor-pointer ${
              currentStep === 2
                ? 'text-blue-600 font-bold'
                : currentStep > 2
                ? 'text-emerald-600 font-semibold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === 2
                  ? 'bg-blue-600 text-white shadow-xs'
                  : currentStep > 2
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-xs hidden sm:inline">Teaching Content</span>
          </div>

          <div
            className={`flex-1 h-0.5 mx-3 ${
              currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (docFields.topic || manualDescription || uploadedFiles.length > 0) {
                setCurrentStep(3);
              }
            }}
            className={`flex items-center gap-2.5 cursor-pointer ${
              currentStep === 3
                ? 'text-blue-600 font-bold'
                : 'text-slate-400 font-medium'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                currentStep === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </div>
            <span className="text-xs hidden sm:inline">Review & Save</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP 1: BASIC INFORMATION */}
      {/* ============================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">
              Step 1: Basic Class Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the teaching date, class cohort, and subject.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Teaching Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Automatically defaults to today.</p>
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Remembers your last selected class.</p>
            </div>

            {/* Subject Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {subjectOptions.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Remembers your last selected subject.</p>
            </div>

            {/* Period Number (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Period <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(Number(e.target.value));
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Daily timetable slot number.</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleStep1Proceed}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Next: Teaching Content</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: TEACHING CONTENT (Upload Materials OR Enter Details) */}
      {/* ============================================================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Step 2: Teaching Content
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload teaching materials or describe what you taught today.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              <span>{className}</span>
              <span>•</span>
              <span>{subject}</span>
            </div>
          </div>

          {/* OPTION A: UPLOAD MATERIALS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Option A: Upload Teaching Materials</span>
              </label>
              <span className="text-[11px] text-slate-400">PDF, PowerPoint, Word, or Images</span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-blue-50/30 transition cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drop your lesson files here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, PPT, PPTX, DOC, DOCX, and classroom snapshots
              </p>
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-blue-800">
                  <span>Uploading materials...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Uploaded File List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-700">
                  Uploaded Materials ({uploadedFiles.length})
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {uploadedFiles.map((file, idx) => {
                    const ext = (file.extension || file.originalName?.split('.').pop() || '').toLowerCase();
                    const sizeMb = file.fileSize ? (file.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '';

                    return (
                      <div
                        key={file._id || file.id || idx}
                        className="p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold uppercase text-[10px]">
                            {ext || 'DOC'}
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-semibold text-slate-800 truncate">
                              {file.originalName || file.fileName || 'Uploaded Document'}
                            </p>
                            {sizeMb && <p className="text-[11px] text-slate-400">{sizeMb}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Remove file"
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
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              AND / OR
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* OPTION B: ENTER DETAILS MANUALLY */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Option B: Enter Details Manually</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                What did you teach today?
              </label>
              <textarea
                rows={3}
                value={manualDescription}
                onChange={(e) => {
                  setManualDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g., Introduction to Natural Language Processing, its definition, real-world applications in chatbots, and tokenization examples."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={additionalNotes}
                onChange={(e) => {
                  setAdditionalNotes(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g., Class actively engaged during blackboard diagram; homework questions assigned."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Prominent AI Generation CTA */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-sm">Automated Pedagogical Documentation</h3>
            </div>
            <p className="text-xs text-blue-100 max-w-xl">
              AI analyzes your uploaded files or manual lesson notes to automatically extract the topic, learning objectives, methodology, classroom activities, outcomes, and assessment questions.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                disabled={generatingAI}
                onClick={handleGenerateAI}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 active:bg-blue-100 text-blue-700 font-bold text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {generatingAI ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing & Generating Documentation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Generate Documentation with AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-semibold text-blue-200 hover:text-white underline underline-offset-4 cursor-pointer text-center sm:text-right"
              >
                Skip AI and fill fields manually →
              </button>
            </div>
          </div>

          {/* Stepper navigation */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: REVIEW, EDIT AND SAVE */}
      {/* ============================================================== */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Step 3: Review and Finalize Record
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and edit the 9 pedagogical documentation fields, attach photographs, and save.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenPdfPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                title="Preview complete A4 printable lesson plan"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Preview Lesson Plan</span>
              </button>

              <button
                type="button"
                onClick={handlePrintLessonPlan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                title="Print lesson plan directly in A4 format"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Lesson Plan</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLessonPlanPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                title="Download official PDF document"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* The 9 Pedagogical Fields */}
          <div className="space-y-4">
            {/* 1. Topic Covered */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                1. Topic Covered <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={docFields.topic}
                onChange={(e) => {
                  setDocFields({ ...docFields, topic: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="e.g. Introduction to Natural Language Processing"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* 2. Learning Objectives */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                2. Learning Objectives
              </label>
              <textarea
                rows={3}
                value={docFields.learningObjectives}
                onChange={(e) => {
                  setDocFields({ ...docFields, learningObjectives: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="Numbered learning targets achieved by students..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* 3. Teaching Methodology & 5. Teaching Aids Used (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Teaching Methodology
                </label>
                <input
                  type="text"
                  value={docFields.teachingMethodology}
                  onChange={(e) => {
                    setDocFields({ ...docFields, teachingMethodology: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="e.g. 5E Inquiry Model, Blackboard Derivation"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  5. Teaching Aids Used
                </label>
                <input
                  type="text"
                  value={docFields.teachingAids}
                  onChange={(e) => {
                    setDocFields({ ...docFields, teachingAids: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Blackboard, Chart diagrams, Digital Slides"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* 4. Classroom Activities */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                4. Classroom Activities Conducted
              </label>
              <textarea
                rows={2}
                value={docFields.classroomActivities}
                onChange={(e) => {
                  setDocFields({ ...docFields, classroomActivities: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="Activities, think-pair-share, group problem solving conducted during class..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* 6. Learning Outcomes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                6. Learning Outcomes
              </label>
              <textarea
                rows={2}
                value={docFields.learningOutcomes}
                onChange={(e) => {
                  setDocFields({ ...docFields, learningOutcomes: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="Specific conceptual knowledge and competencies demonstrated by students..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* 7. Student Participation & 8. Assessment Conducted (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  7. Student Participation
                </label>
                <textarea
                  rows={2}
                  value={docFields.studentParticipation}
                  onChange={(e) => {
                    setDocFields({ ...docFields, studentParticipation: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="Student questions, discussions, and engagement levels..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  8. Assessment / Evaluation Conducted
                </label>
                <textarea
                  rows={2}
                  value={docFields.assessment}
                  onChange={(e) => {
                    setDocFields({ ...docFields, assessment: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="Oral questions, formative checks, or quiz items..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* 9. Homework / Follow-up Activity */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                9. Homework / Follow-up Activity
              </label>
              <input
                type="text"
                value={docFields.homework}
                onChange={(e) => {
                  setDocFields({ ...docFields, homework: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="e.g. Read chapter 2, answer exercise questions 1-5"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Attached Classroom Photographs Section */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Classroom Photographs & Evidence ({attachedPhotos.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Add photos of blackboard notes, student activities, experiments, or teaching aids.
                </p>
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhotos}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingPhotos ? 'Uploading...' : 'Add Photos'}</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {attachedPhotos.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handlePhotoUpload(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 text-center transition cursor-pointer group"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition mb-2">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Click to select photos or drag and drop images here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Blackboard notes, practical experiments, student activities (JPG, PNG, WebP up to 25MB each)
                </p>
                <button
                  type="button"
                  disabled={uploadingPhotos}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 shadow-xs hover:border-blue-300 text-blue-600 text-xs font-semibold rounded-xl transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhotos ? 'Uploading Photos...' : 'Select Photos to Upload'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {attachedPhotos.map((photo, pIdx) => {
                    const photoUrl = photo.url || `/uploads/${photo.storageKey}`;

                    return (
                      <div
                        key={photo._id || photo.id || pIdx}
                        className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col shadow-xs"
                      >
                        <div className="relative w-full h-28 bg-slate-100 overflow-hidden flex items-center justify-center">
                          <img
                            src={photoUrl}
                            alt={photo.caption || 'Classroom snapshot'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/300x200?text=Photo+Uploaded';
                            }}
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                              <span className="text-[10px] text-white font-semibold">Uploading...</span>
                            </div>
                          )}
                          {/* Controls */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm">
                            {pIdx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePhoto(pIdx, -1);
                                }}
                                className="p-1 text-white hover:text-blue-300 transition"
                                title="Move left"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {pIdx < attachedPhotos.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMovePhoto(pIdx, 1);
                                }}
                                className="p-1 text-white hover:text-blue-300 transition"
                                title="Move right"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(pIdx);
                              }}
                              className="p-1 text-white hover:text-rose-400 transition"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Editable Caption Input */}
                        <div className="p-2 bg-white border-t border-slate-100">
                          <input
                            type="text"
                            value={photo.caption || ''}
                            onChange={(e) => handleUpdatePhotoCaption(pIdx, e.target.value)}
                            placeholder="Add caption..."
                            className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:outline-hidden focus:border-blue-500 transition"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add More Photos Bar */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {attachedPhotos.length} photo{attachedPhotos.length > 1 ? 's' : ''} attached to this session
                  </span>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More Photos</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Additional Teacher Remarks */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Teacher's Personal Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={teacherRemarks}
              onChange={(e) => {
                setTeacherRemarks(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g. Completed unit syllabus on schedule; plan revision next period."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Stepper Navigation & Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Content</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPdfPreviewModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Preview Lesson Plan</span>
              </button>

              <button
                type="button"
                onClick={handlePrintLessonPlan}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Print Lesson Plan</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLessonPlanPdf}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveRecord(false)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveRecord(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Final Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official A4 Print & PDF Preview Modal */}
      <LessonPlanPreviewModal
        isOpen={pdfPreviewModalOpen}
        onClose={() => setPdfPreviewModalOpen(false)}
        plan={getCompiledLessonPlanData()}
        onEdit={handleEditLessonPlan}
      />
    </div>
  );
};

export default CreateDailyRecordPage;
