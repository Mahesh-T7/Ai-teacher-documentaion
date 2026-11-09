import React, { useState, useRef } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  FileText,
  HelpCircle,
  AlertCircle,
  Eye,
  Send,
  Printer,
  Download,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
} from 'lucide-react';
import { lessonPlanApi } from '../../api/lessonPlanApi';
import { photoApi } from '../../api/photoApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LessonPlanPreviewModal } from '../../components/lessonPlan/LessonPlanPreviewModal';

export const LessonPlanForm = ({ plan = null, onSaved, onCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'objectives' | 'explanation' | 'assessment'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approverRemarks, setApproverRemarks] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: plan?.title || '',
    academicYear: plan?.academicYear || '2026-2027',
    className: plan?.className || 'Class 10',
    section: plan?.section || 'A',
    classHandled: plan?.classHandled || 'Class 10-A',
    subject: plan?.subject || (user?.subjectsTaught?.[0] || 'Physics'),
    unit: plan?.unit || '',
    chapter: plan?.chapter || '',
    topic: plan?.topic || '',
    durationMinutes: plan?.durationMinutes || 45,
    learningObjectives: plan?.learningObjectives || '',
    previousKnowledge: plan?.previousKnowledge || '',
    introduction: plan?.introduction || '',
    detailedExplanation: plan?.detailedExplanation || '',
    definitions: plan?.definitions || '',
    teachingMethodology: plan?.teachingMethodology || 'Inquiry-based Learning',
    teachingAids: plan?.teachingAids || '',
    classroomActivities: plan?.classroomActivities || '',
    realLifeExamples: plan?.realLifeExamples || '',
    assessmentQuestions: plan?.assessmentQuestions || '',
    expectedLearningOutcomes: plan?.expectedLearningOutcomes || '',
    homework: plan?.homework || '',
    teacherRemarks: plan?.teacherRemarks || '',
    photos: plan?.photos || plan?.classroomPhotographs || [],
    status: plan?.status || 'Draft',
  });

  const photoInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handlePhotoUpload = async (eOrFiles) => {
    let files = [];
    if (Array.isArray(eOrFiles)) {
      files = eOrFiles;
    } else if (eOrFiles?.target?.files) {
      files = Array.from(eOrFiles.target.files);
    }
    if (!files || files.length === 0) return;

    const validImageFiles = files.filter(
      (f) => f.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|heic|heif)$/i.test(f.name)
    );

    if (validImageFiles.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP, GIF, BMP).', 'error');
      return;
    }

    const localPreviews = validImageFiles.map((file, idx) => ({
      id: `lp_temp_${Date.now()}_${idx}`,
      url: URL.createObjectURL(file),
      originalFileName: file.name,
      caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      isUploading: true,
      file,
    }));

    setFormData((prev) => ({
      ...prev,
      photos: [...(prev.photos || []), ...localPreviews],
    }));

    const form = new FormData();
    validImageFiles.forEach((file) => form.append('photos', file));
    form.append('className', formData.className || 'Class 10');
    form.append('section', formData.section || 'A');
    form.append('subject', formData.subject || 'General Science');

    try {
      setUploadingPhotos(true);
      const res = await photoApi.uploadPhotos(form);
      const uploadedList = res.data || res.photos || (Array.isArray(res) ? res : []);

      if (res.success && uploadedList.length > 0) {
        setFormData((prev) => {
          const preserved = (prev.photos || []).filter((p) => !localPreviews.some((lp) => lp.id === p.id));
          return { ...prev, photos: [...preserved, ...uploadedList] };
        });
        showToast(`Attached ${uploadedList.length} photo(s).`, 'success');
      } else {
        setFormData((prev) => ({
          ...prev,
          photos: (prev.photos || []).map((p) =>
            localPreviews.some((lp) => lp.id === p.id) ? { ...p, isUploading: false } : p
          ),
        }));
      }
    } catch (err) {
      console.warn('[Lesson Plan Photo Upload Fallback]', err.message);
      try {
        const fallbacks = await Promise.all(
          validImageFiles.map(
            (file) =>
              new Promise((resolve) => {
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
              })
          )
        );
        const validFallbacks = fallbacks.filter(Boolean);
        setFormData((prev) => {
          const preserved = (prev.photos || []).filter((p) => !localPreviews.some((lp) => lp.id === p.id));
          return { ...prev, photos: [...preserved, ...validFallbacks] };
        });
        showToast('Attached photos locally to lesson plan.', 'info');
      } catch (fErr) {
        setFormData((prev) => ({
          ...prev,
          photos: (prev.photos || []).map((p) =>
            localPreviews.some((lp) => lp.id === p.id) ? { ...p, isUploading: false } : p
          ),
        }));
      }
    } finally {
      setUploadingPhotos(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (idx) => {
    setFormData((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdatePhotoCaption = (idx, newCaption) => {
    setFormData((prev) => {
      const updated = [...(prev.photos || [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], caption: newCaption };
      }
      return { ...prev, photos: updated };
    });
  };

  const handleSave = async (targetStatus = formData.status) => {
    setError('');

    if (!formData.title.trim() || !formData.className.trim() || !formData.subject.trim()) {
      setError('Please provide lesson title, class name, and subject in the overview section.');
      setActiveTab('overview');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: targetStatus,
      };

      let result;
      if (plan) {
        const id = plan._id || plan.id;
        result = await lessonPlanApi.updateLessonPlan(id, payload);
      } else {
        result = await lessonPlanApi.createLessonPlan(payload);
      }

      showToast(`Lesson plan saved as ${targetStatus}!`, 'success');
      if (onSaved) onSaved(result.data);
    } catch (err) {
      setError(err.message || 'Failed to save lesson plan');
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      const id = plan._id || plan.id;
      const res = await lessonPlanApi.updateApproval(id, 'Approved', approverRemarks);
      showToast('Lesson plan approved successfully!', 'success');
      setApprovalModalOpen(false);
      if (onSaved) onSaved(res.data);
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {plan ? 'Edit Curriculum Lesson Plan' : 'Create 5E Curriculum Lesson Plan'}
              </h2>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                  formData.status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : formData.status === 'Submitted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {formData.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Standardized pedagogical lesson plan separate from daily teaching logs.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Preview professional A4 printable document"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview Lesson Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            title="Open print dialog with A4 portrait layout"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Lesson Plan</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('Draft')}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {formData.status === 'Draft' && (
            <button
              type="button"
              onClick={() => handleSave('Submitted')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Approval</span>
            </button>
          )}

          {formData.status !== 'Approved' && (
            <button
              type="button"
              onClick={() => setApprovalModalOpen(true)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Plan</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Plan Overview & Unit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('objectives')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'objectives' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>2. Objectives & Methodology</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explanation')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'explanation' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>3. Detailed Explanation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assessment')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'assessment' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>4. Activities & Assessment</span>
        </button>
      </div>

      {/* TAB 1: Plan Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lesson Plan Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Electromagnetic Induction & Faraday's Laws of Induced EMF"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              required
            />
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
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. Unit 4 - Magnetism & Electricity"
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
                placeholder="e.g. Chapter 12 - Magnetic Effects"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Faraday’s coil experiment and Lenz’s rule"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Objectives & Methodology */}
      {activeTab === 'objectives' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Learning Objectives (Specific & Measurable)
            </label>
            <textarea
              rows={2}
              value={formData.learningObjectives}
              onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
              placeholder="e.g. 1. Students understand relative motion between magnet and coil induces current. 2. Derive induced electromotive force proportional to rate of change of magnetic flux."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Previous Knowledge Required
              </label>
              <textarea
                rows={2}
                value={formData.previousKnowledge}
                onChange={(e) => setFormData({ ...formData, previousKnowledge: e.target.value })}
                placeholder="e.g. Knowledge of magnetic field lines, properties of solenoids, and galvanometer usage."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lesson Introduction / Hook
              </label>
              <textarea
                rows={2}
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                placeholder="e.g. Bring a hand-crank generator and light up an LED. Ask how electric power is generated in mega dams."
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
                placeholder="e.g. 5E Instructional Model (Engage, Explore, Explain, Elaborate, Evaluate)"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teaching Aids (TLM)
              </label>
              <input
                type="text"
                value={formData.teachingAids}
                onChange={(e) => setFormData({ ...formData, teachingAids: e.target.value })}
                placeholder="e.g. Solenoid coil, high-intensity Neodymium magnet, center-zero galvanometer, smartboard diagram"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Definitions & Theoretical Axioms
            </label>
            <textarea
              rows={2}
              value={formData.definitions}
              onChange={(e) => setFormData({ ...formData, definitions: e.target.value })}
              placeholder="e.g. Electromagnetic Induction: The phenomenon of generating electric current in a circuit by changing magnetic flux linked with it."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>
      )}

      {/* TAB 3: Detailed Explanation */}
      {activeTab === 'explanation' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Detailed Pedagogical Content & Concept Derivations
            </h3>
            <p className="text-[11px] text-slate-500">
              Formulate step-by-step teacher explanations, formulas, definitions, and board illustrations.
            </p>
          </div>

          <RichTextEditor
            value={formData.detailedExplanation}
            onChange={(content) => setFormData({ ...formData, detailedExplanation: content })}
            minHeight="280px"
          />
        </div>
      )}

      {/* TAB 4: Activities, Evaluation & Homework */}
      {activeTab === 'assessment' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Classroom Activities Planned
              </label>
              <textarea
                rows={2}
                value={formData.classroomActivities}
                onChange={(e) => setFormData({ ...formData, classroomActivities: e.target.value })}
                placeholder="e.g. Student groups vary magnet insertion speed and record peak galvanometer readings."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Real-Life Applications & Examples
              </label>
              <textarea
                rows={2}
                value={formData.realLifeExamples}
                onChange={(e) => setFormData({ ...formData, realLifeExamples: e.target.value })}
                placeholder="e.g. Induction cooktops, electric guitars, credit card magnetic strips, regenerative train braking."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assessment Questions (Formative)
              </label>
              <textarea
                rows={3}
                value={formData.assessmentQuestions}
                onChange={(e) => setFormData({ ...formData, assessmentQuestions: e.target.value })}
                placeholder="e.g. 1. If coil is moved towards stationary magnet, will deflection occur? 2. State the law predicting induced current direction."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expected Learning Outcomes
              </label>
              <textarea
                rows={3}
                value={formData.expectedLearningOutcomes}
                onChange={(e) => setFormData({ ...formData, expectedLearningOutcomes: e.target.value })}
                placeholder="e.g. Students can accurately explain how electric generators transform mechanical kinetic energy into electrical energy."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Homework / Extended Learning
              </label>
              <input
                type="text"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                placeholder="e.g. Textbook Page 145 Questions 1 to 6; prepare 1-page chart on AC vs DC generator."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teacher Notes / Post-Lesson Remarks
              </label>
              <input
                type="text"
                value={formData.teacherRemarks}
                onChange={(e) => setFormData({ ...formData, teacherRemarks: e.target.value })}
                placeholder="e.g. Plan suitable for a 45-minute double period or single block."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
              />
            </div>
          </div>

          {/* Photographic Evidence & Classroom Documentation */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Classroom Photographs & Evidence ({(formData.photos || []).length})</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Attach photos of experiments, blackboard work, or student classroom activities to include in printable dossier.
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

            {(formData.photos || []).length === 0 ? (
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
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Click to select photos or drag & drop images here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  JPG, PNG, WebP up to 25MB each
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {(formData.photos || []).map((photo, pIdx) => {
                    const photoUrl = photo.url || `/uploads/${photo.storageKey}`;
                    return (
                      <div
                        key={photo._id || photo.id || pIdx}
                        className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col shadow-xs"
                      >
                        <div className="relative w-full h-24 bg-slate-100 overflow-hidden flex items-center justify-center">
                          <img
                            src={photoUrl}
                            alt={photo.caption || 'Photo'}
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
                          <div className="absolute top-1 right-1 bg-slate-900/80 p-1 rounded-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pIdx)}
                              className="p-0.5 text-white hover:text-rose-400 transition"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-1.5 bg-white border-t border-slate-100">
                          <input
                            type="text"
                            value={photo.caption || ''}
                            onChange={(e) => handleUpdatePhotoCaption(pIdx, e.target.value)}
                            placeholder="Add caption..."
                            className="w-full px-2 py-0.5 text-[10px] rounded border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add More</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Button Bar */}
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
            onClick={() => handleSave('Draft')}
            disabled={submitting}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={() => handleSave('Submitted')}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Submit Lesson Plan</span>
          </button>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Approve Lesson Plan</h3>
                <p className="text-xs text-slate-500">
                  Mark this curriculum lesson plan as officially Approved.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Approval Remarks / Reviewer Notes
              </label>
              <textarea
                rows={3}
                value={approverRemarks}
                onChange={(e) => setApproverRemarks(e.target.value)}
                placeholder="e.g. Excellent pedagogical alignment with national science curriculum standards."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official A4 Print & PDF Preview Modal */}
      <LessonPlanPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        plan={{
          ...formData,
          schoolName: user?.schoolName,
          teacherName: user?.fullName || user?.name,
          teacherDesignation: user?.designation,
        }}
        onEdit={() => setPreviewOpen(false)}
      />
    </div>
  );
};
