import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Award, FileSpreadsheet, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';

export const CreateExamModal = ({ isOpen, onClose, onExamCreated, templates = [] }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [className, setClassName] = useState('Class 10');
  const [section, setSection] = useState('A');
  const [subject, setSubject] = useState('Information Technology (402)');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

  // When templates load, preselect the first template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const first = templates[0];
      setSelectedTemplateId(first._id || first.id);
      if (first.className) setClassName(first.className);
      if (first.subject) setSubject(first.subject);
      setExamTitle(`${first.templateName} - ${first.className || 'Class 10'}`);
    }
  }, [templates, selectedTemplateId]);

  const handleTemplateChange = (e) => {
    const tId = e.target.value;
    setSelectedTemplateId(tId);
    const chosen = templates.find((t) => String(t._id || t.id) === String(tId));
    if (chosen) {
      if (chosen.className) setClassName(chosen.className);
      if (chosen.subject) setSubject(chosen.subject);
      setExamTitle(`${chosen.templateName} - ${chosen.className || className}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      showToast('Please select an examination template.', 'error');
      return;
    }
    if (!examTitle.trim()) {
      showToast('Please enter an examination title.', 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        templateId: selectedTemplateId,
        examTitle: examTitle.trim(),
        academicYear,
        className,
        section,
        subject,
        examDate,
      };

      const res = await examApi.createExamRecord(payload);
      if (res.data?.success || res.success) {
        showToast('Examination initialized successfully!', 'success');
        const createdRecord = res.data?.data || res.data;
        if (onExamCreated) onExamCreated(createdRecord);
        onClose();
        navigate(`/exams/entry/${createdRecord._id || createdRecord.id}`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to initialize exam.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Start New Examination</h2>
            <p className="text-xs text-slate-500">
              Initialize student marks register with automatic calculations
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Examination Template <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              required
            >
              <option value="" disabled>
                -- Choose Template --
              </option>
              {templates.map((tpl) => (
                <option key={tpl._id || tpl.id} value={tpl._id || tpl.id}>
                  {tpl.templateName} ({tpl.className} • {tpl.subject} • Max: {tpl.totalFinalMarks})
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> No templates found. Please create a template first.
              </p>
            )}
          </div>

          {/* Exam Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Examination Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="e.g. NSQF ITes Term 1 Final Practical & Theory Exam"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              required
            />
          </div>

          {/* Class, Section & Academic Year */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Subject & Exam Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Examination Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedTemplateId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Initializing...' : 'Open Marks Sheet'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExamModal;
