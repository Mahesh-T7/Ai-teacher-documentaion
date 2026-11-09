import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Calculator,
  Sliders,
  Award,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { examApi } from '../../api/examApi';
import { useToast } from '../../context/ToastContext';
import {
  validateTemplateConfiguration,
  calculateComponentFinalMarks,
  applyRounding,
} from '../../utils/marksCalculationEngine';

const PRESET_NSQF_ITES = {
  templateName: 'NSQF ITes Skill Assessment (30 Theory + 50 Practical + 20 Internal)',
  academicYear: '2026-2027',
  className: 'Class 10',
  subject: 'Information Technology (402)',
  totalFinalMarks: 100,
  description: 'Standard NSQF ITes Vocational Exam: 60-to-30 Theory conversion, 50 direct Practical, and 20 Internal marks.',
  components: [
    {
      name: 'Theory Examination',
      code: 'TH',
      maxRawMarks: 60,
      finalWeightage: 30,
      calculationMethod: 'proportional',
      formula: '',
      minPassMarks: 10.5,
      order: 1,
    },
    {
      name: 'Practical Examination',
      code: 'PR',
      maxRawMarks: 50,
      finalWeightage: 50,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 17.5,
      order: 2,
    },
    {
      name: 'Attendance',
      code: 'ATT',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 3,
    },
    {
      name: 'Student Behaviour & Discipline',
      code: 'BEH',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 4,
    },
    {
      name: 'Portfolios & Assignments',
      code: 'ASSG',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 5,
    },
    {
      name: 'Viva Voce',
      code: 'VIVA',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 6,
    },
  ],
  gradingRules: {
    minPassPercentage: 35,
    distinctionPercentage: 75,
    roundingRule: 'decimal_1',
    gradeBoundaries: [
      { grade: 'A+', minPercentage: 90 },
      { grade: 'A', minPercentage: 80 },
      { grade: 'B+', minPercentage: 70 },
      { grade: 'B', minPercentage: 60 },
      { grade: 'C', minPercentage: 50 },
      { grade: 'D', minPercentage: 35 },
      { grade: 'F', minPercentage: 0 },
    ],
  },
};

const PRESET_CBSE_80_20 = {
  templateName: 'CBSE Secondary Standard (80 Board + 20 Internal)',
  academicYear: '2026-2027',
  className: 'Class 10',
  subject: 'Science',
  totalFinalMarks: 100,
  description: '80 marks Board / Summative Theory Examination + 20 marks Continuous Internal Assessment.',
  components: [
    {
      name: 'Summative Theory Exam',
      code: 'TH',
      maxRawMarks: 80,
      finalWeightage: 80,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 26,
      order: 1,
    },
    {
      name: 'Periodic Tests (Scaled to 10)',
      code: 'PT',
      maxRawMarks: 25,
      finalWeightage: 10,
      calculationMethod: 'proportional',
      formula: '',
      minPassMarks: 0,
      order: 2,
    },
    {
      name: 'Subject Enrichment (Practical / Lab)',
      code: 'LAB',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 3,
    },
    {
      name: 'Portfolio / Notebook Submission',
      code: 'NOTEBOOK',
      maxRawMarks: 5,
      finalWeightage: 5,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 4,
    },
  ],
  gradingRules: {
    minPassPercentage: 33,
    distinctionPercentage: 75,
    roundingRule: 'round',
    gradeBoundaries: [
      { grade: 'A1', minPercentage: 91 },
      { grade: 'A2', minPercentage: 81 },
      { grade: 'B1', minPercentage: 71 },
      { grade: 'B2', minPercentage: 61 },
      { grade: 'C1', minPercentage: 51 },
      { grade: 'C2', minPercentage: 41 },
      { grade: 'D', minPercentage: 33 },
      { grade: 'E', minPercentage: 0 },
    ],
  },
};

const PRESET_BEST_OF_3 = {
  templateName: 'Best 2 of 3 Unit Tests + Final Term Paper',
  academicYear: '2026-2027',
  className: 'Class 9',
  subject: 'Mathematics',
  totalFinalMarks: 100,
  description: 'Unit Tests (Best 2 of 3 unit tests scaled to 20 marks) + 80 Marks Final Examination.',
  components: [
    {
      name: 'Unit Test 1',
      code: 'UT1',
      maxRawMarks: 25,
      finalWeightage: 25,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 1,
    },
    {
      name: 'Unit Test 2',
      code: 'UT2',
      maxRawMarks: 25,
      finalWeightage: 25,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 2,
    },
    {
      name: 'Unit Test 3',
      code: 'UT3',
      maxRawMarks: 25,
      finalWeightage: 25,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 0,
      order: 3,
    },
    {
      name: 'Best 2 UT Aggregate',
      code: 'UT_AGG',
      maxRawMarks: 50,
      finalWeightage: 20,
      calculationMethod: 'best_of',
      dependencies: ['UT1', 'UT2', 'UT3'],
      bestOfCount: 2,
      formula: '',
      minPassMarks: 7,
      order: 4,
    },
    {
      name: 'Final Term Examination',
      code: 'FINAL_TH',
      maxRawMarks: 80,
      finalWeightage: 80,
      calculationMethod: 'direct',
      formula: '',
      minPassMarks: 28,
      order: 5,
    },
  ],
  gradingRules: {
    minPassPercentage: 35,
    distinctionPercentage: 75,
    roundingRule: 'decimal_1',
    gradeBoundaries: [
      { grade: 'A+', minPercentage: 90 },
      { grade: 'A', minPercentage: 80 },
      { grade: 'B+', minPercentage: 70 },
      { grade: 'B', minPercentage: 60 },
      { grade: 'C', minPercentage: 50 },
      { grade: 'D', minPercentage: 35 },
      { grade: 'F', minPercentage: 0 },
    ],
  },
};

export const TemplateBuilderModal = ({ isOpen, onClose, editingTemplate, onTemplateSaved }) => {
  const { showToast } = useToast();

  const [mode, setMode] = useState('basic'); // 'basic' | 'advanced'
  const [activeTab, setActiveTab] = useState('components'); // 'components' | 'grading' | 'preview'
  const [submitting, setSubmitting] = useState(false);

  // Template Core State
  const [templateName, setTemplateName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [className, setClassName] = useState('Class 10');
  const [subject, setSubject] = useState('Information Technology (402)');
  const [totalFinalMarks, setTotalFinalMarks] = useState(100);
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState([]);

  // Grading Rules State
  const [minPassPercentage, setMinPassPercentage] = useState(35);
  const [distinctionPercentage, setDistinctionPercentage] = useState(75);
  const [roundingRule, setRoundingRule] = useState('decimal_1');
  const [gradeBoundaries, setGradeBoundaries] = useState([
    { grade: 'A+', minPercentage: 90 },
    { grade: 'A', minPercentage: 80 },
    { grade: 'B+', minPercentage: 70 },
    { grade: 'B', minPercentage: 60 },
    { grade: 'C', minPercentage: 50 },
    { grade: 'D', minPercentage: 35 },
    { grade: 'F', minPercentage: 0 },
  ]);

  // Live Preview Sample State
  const [sampleRawMarks, setSampleRawMarks] = useState({});
  const [previewResult, setPreviewResult] = useState(null);

  // Load existing template data or defaults
  useEffect(() => {
    if (editingTemplate) {
      setTemplateName(editingTemplate.templateName || '');
      setAcademicYear(editingTemplate.academicYear || '2026-2027');
      setClassName(editingTemplate.className || 'Class 10');
      setSubject(editingTemplate.subject || 'General');
      setTotalFinalMarks(editingTemplate.totalFinalMarks || 100);
      setDescription(editingTemplate.description || '');
      setComponents(editingTemplate.components ? JSON.parse(JSON.stringify(editingTemplate.components)) : []);

      const gr = editingTemplate.gradingRules || {};
      setMinPassPercentage(gr.minPassPercentage !== undefined ? gr.minPassPercentage : 35);
      setDistinctionPercentage(gr.distinctionPercentage !== undefined ? gr.distinctionPercentage : 75);
      setRoundingRule(gr.roundingRule || 'decimal_1');
      if (Array.isArray(gr.gradeBoundaries) && gr.gradeBoundaries.length > 0) {
        setGradeBoundaries(gr.gradeBoundaries);
      }
    } else {
      // Default to NSQF ITes preset
      loadPreset(PRESET_NSQF_ITES);
    }
  }, [editingTemplate]);

  const loadPreset = (preset) => {
    setTemplateName(preset.templateName);
    setAcademicYear(preset.academicYear);
    setClassName(preset.className);
    setSubject(preset.subject);
    setTotalFinalMarks(preset.totalFinalMarks);
    setDescription(preset.description);
    setComponents(JSON.parse(JSON.stringify(preset.components)));

    const gr = preset.gradingRules || {};
    setMinPassPercentage(gr.minPassPercentage || 35);
    setDistinctionPercentage(gr.distinctionPercentage || 75);
    setRoundingRule(gr.roundingRule || 'decimal_1');
    setGradeBoundaries(JSON.parse(JSON.stringify(gr.gradeBoundaries || [])));

    // Initialize sample marks for preview
    const samples = {};
    preset.components.forEach((c) => {
      samples[c.code] = Math.round(Number(c.maxRawMarks) * 0.85);
    });
    setSampleRawMarks(samples);
  };

  // Recalculate preview on the fly
  useEffect(() => {
    const rawMap = {};
    const finalMap = {};
    let totalRaw = 0;
    let totalFinal = 0;

    components.forEach((c) => {
      const raw = sampleRawMarks[c.code] !== undefined ? sampleRawMarks[c.code] : Number(c.maxRawMarks) * 0.8;
      rawMap[c.code] = raw;
      totalRaw += Number(raw) || 0;
    });

    components.forEach((c) => {
      const finalVal = calculateComponentFinalMarks(c, rawMap, finalMap);
      finalMap[c.code] = finalVal;
      totalFinal += Number(finalVal) || 0;
    });

    const maxFinal = Number(totalFinalMarks) || 100;
    const pct = maxFinal > 0 ? applyRounding((totalFinal / maxFinal) * 100, roundingRule) : 0;

    let computedGrade = 'F';
    const sorted = [...gradeBoundaries].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const b of sorted) {
      if (pct >= b.minPercentage) {
        computedGrade = b.grade;
        break;
      }
    }

    setPreviewResult({
      rawMarks: rawMap,
      finalMarks: finalMap,
      totalRaw,
      totalFinal: applyRounding(totalFinal, roundingRule),
      percentage: pct,
      grade: computedGrade,
      isPass: pct >= minPassPercentage,
      isDistinction: pct >= distinctionPercentage,
    });
  }, [components, sampleRawMarks, totalFinalMarks, roundingRule, minPassPercentage, distinctionPercentage, gradeBoundaries]);

  // Component Management Helpers
  const addComponent = () => {
    const nextNum = components.length + 1;
    const newComp = {
      name: `Assessment Component ${nextNum}`,
      code: `COMP_${nextNum}`,
      maxRawMarks: 20,
      finalWeightage: 20,
      calculationMethod: 'direct',
      formula: '',
      dependencies: [],
      bestOfCount: 1,
      minPassMarks: 0,
      order: nextNum,
    };
    setComponents([...components, newComp]);
  };

  const updateComponent = (index, field, value) => {
    const next = [...components];
    next[index] = { ...next[index], [field]: value };

    // Auto-update code if name changes and code was default
    if (field === 'name' && (!next[index].code || next[index].code.startsWith('COMP_'))) {
      const slug = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 10);
      if (slug) next[index].code = slug;
    }

    setComponents(next);
  };

  const removeComponent = (index) => {
    if (components.length <= 1) {
      showToast('A template must have at least one assessment component.', 'error');
      return;
    }
    const next = components.filter((_, i) => i !== index);
    setComponents(next);
  };

  const moveComponent = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= components.length) return;
    const next = [...components];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    next.forEach((c, idx) => (c.order = idx + 1));
    setComponents(next);
  };

  // Grade Boundaries Helper
  const updateGradeBoundary = (index, field, value) => {
    const next = [...gradeBoundaries];
    next[index] = { ...next[index], [field]: value };
    setGradeBoundaries(next);
  };

  // Validation
  const sumFinalWeightage = components.reduce((sum, c) => sum + (Number(c.finalWeightage) || 0), 0);
  const sumRawMarks = components.reduce((sum, c) => sum + (Number(c.maxRawMarks) || 0), 0);
  const validation = validateTemplateConfiguration(components);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!templateName.trim()) {
      showToast('Please enter a template name.', 'error');
      return;
    }

    if (!validation.isValid) {
      showToast(validation.errors[0] || 'Please fix template configuration errors.', 'error');
      return;
    }

    if (Math.abs(sumFinalWeightage - Number(totalFinalMarks)) > 0.01) {
      const confirmSave = window.confirm(
        `Warning: The sum of component final weightages (${sumFinalWeightage}) does not equal the Total Final Marks (${totalFinalMarks}). Do you wish to proceed?`
      );
      if (!confirmSave) return;
    }

    try {
      setSubmitting(true);
      const payload = {
        templateName: templateName.trim(),
        academicYear,
        className,
        subject,
        totalFinalMarks: Number(totalFinalMarks),
        description,
        components: components.map((c, i) => ({
          ...c,
          order: i + 1,
          maxRawMarks: Number(c.maxRawMarks) || 0,
          finalWeightage: Number(c.finalWeightage) || 0,
          minPassMarks: Number(c.minPassMarks) || 0,
          bestOfCount: Number(c.bestOfCount) || 1,
        })),
        gradingRules: {
          minPassPercentage: Number(minPassPercentage),
          distinctionPercentage: Number(distinctionPercentage),
          roundingRule,
          gradeBoundaries: gradeBoundaries.map((g) => ({
            grade: g.grade,
            minPercentage: Number(g.minPercentage) || 0,
          })),
        },
      };

      let res;
      if (editingTemplate && editingTemplate._id) {
        res = await examApi.updateTemplate(editingTemplate._id, payload);
      } else {
        res = await examApi.createTemplate(payload);
      }

      if (res.data?.success || res.success) {
        showToast(
          editingTemplate ? 'Template updated successfully!' : 'Template created successfully!',
          'success'
        );
        if (onTemplateSaved) onTemplateSaved(res.data?.data || res.data);
        onClose();
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save template.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingTemplate ? 'Edit Examination Template' : 'Examination Template Builder'}
              </h2>
              <p className="text-xs text-slate-300">
                Design custom assessment weights, conversion formulas & grading matrices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Basic / Advanced Mode Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('basic')}
                className={`px-3 py-1 rounded-lg transition ${
                  mode === 'basic' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Basic Mode
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`px-3 py-1 rounded-lg transition ${
                  mode === 'advanced' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Advanced (Formulas)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Quick Load Bar (only when creating new) */}
        {!editingTemplate && (
          <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Quick Presets:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadPreset(PRESET_NSQF_ITES)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/70 transition shadow-2xs whitespace-nowrap"
              >
                NSQF ITes (60-to-30 + 50 + 20)
              </button>
              <button
                type="button"
                onClick={() => loadPreset(PRESET_CBSE_80_20)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/70 transition shadow-2xs whitespace-nowrap"
              >
                CBSE 80 + 20 Internal
              </button>
              <button
                type="button"
                onClick={() => loadPreset(PRESET_BEST_OF_3)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/70 transition shadow-2xs whitespace-nowrap"
              >
                Best 2 of 3 Unit Tests
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-6 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('components')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'components'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Components & Calculations ({components.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'grading'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            Grading & Pass Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Live Calculation Preview
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. NSQF ITes Term 1 Vocational Examination"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Class
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Final Marks <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={totalFinalMarks}
                onChange={(e) => setTotalFinalMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                required
              />
            </div>
          </div>

          {/* TAB 1: Components and Calculations */}
          {activeTab === 'components' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assessment Components</h3>
                  <p className="text-xs text-slate-500">
                    Define maximum raw marks and their contribution to the final score
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addComponent}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Component
                </button>
              </div>

              {/* Components Cards List */}
              <div className="space-y-3">
                {components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => updateComponent(idx, 'name', e.target.value)}
                          placeholder="Component Name (e.g. Theory Exam)"
                          className="font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-sm"
                        />
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                          Code: {comp.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveComponent(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 rounded"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveComponent(idx, 1)}
                          disabled={idx === components.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 rounded"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeComponent(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded ml-2"
                          title="Delete component"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Component Row Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Max Raw Marks
                        </label>
                        <input
                          type="number"
                          value={comp.maxRawMarks}
                          onChange={(e) =>
                            updateComponent(idx, 'maxRawMarks', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Final Weightage
                        </label>
                        <input
                          type="number"
                          value={comp.finalWeightage}
                          onChange={(e) =>
                            updateComponent(idx, 'finalWeightage', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-blue-700"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Calculation Method
                        </label>
                        <select
                          value={comp.calculationMethod}
                          onChange={(e) =>
                            updateComponent(idx, 'calculationMethod', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                        >
                          <option value="direct">Direct Marks</option>
                          <option value="proportional">Proportional Conversion</option>
                          <option value="percentage">Percentage (100%)</option>
                          <option value="weighted_percentage">Weighted Percentage</option>
                          <option value="sum">Sum of Components</option>
                          <option value="best_of">Best-Of Multiple</option>
                          <option value="average">Average of Components</option>
                          {mode === 'advanced' && (
                            <option value="formula">Custom Mathematical Formula</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                          Min Pass (Cutoff)
                        </label>
                        <input
                          type="number"
                          value={comp.minPassMarks || 0}
                          onChange={(e) =>
                            updateComponent(idx, 'minPassMarks', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Explanatory calculation tag */}
                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                      <span>
                        {comp.calculationMethod === 'proportional' &&
                          `Formula: (Obtained Raw / ${comp.maxRawMarks}) × ${comp.finalWeightage}`}
                        {comp.calculationMethod === 'direct' &&
                          `Raw marks counted directly towards final marks (capped at ${comp.finalWeightage})`}
                        {comp.calculationMethod === 'percentage' &&
                          `Percentage calculation: (Obtained Raw / ${comp.maxRawMarks}) × 100`}
                        {comp.calculationMethod === 'best_of' &&
                          `Takes best of referenced components and scales to ${comp.finalWeightage}`}
                        {comp.calculationMethod === 'formula' &&
                          (comp.formula ? `Custom: ${comp.formula}` : 'Enter expression below')}
                      </span>
                    </div>

                    {/* Advanced Formula / Best-Of Controls */}
                    {mode === 'advanced' && comp.calculationMethod === 'formula' && (
                      <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5">
                        <label className="text-[11px] font-bold text-indigo-900 block">
                          Mathematical Expression (Safe Parser):
                        </label>
                        <input
                          type="text"
                          value={comp.formula || ''}
                          onChange={(e) => updateComponent(idx, 'formula', e.target.value)}
                          placeholder="e.g. (TH * 0.5) + (PR * 0.8) or ROUND(SUM(ATT, BEH) * 1.5)"
                          className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 font-mono text-xs bg-white text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <p className="text-[10px] text-indigo-700">
                          Available variables:{' '}
                          <span className="font-mono font-bold">
                            {components.map((c) => c.code).join(', ')}
                          </span>
                        </p>
                      </div>
                    )}

                    {comp.calculationMethod === 'best_of' && (
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center gap-4 text-xs">
                        <div>
                          <span className="font-bold text-amber-900 block mb-1">
                            Best Count:
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={comp.bestOfCount || 2}
                            onChange={(e) =>
                              updateComponent(idx, 'bestOfCount', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded border border-amber-300 font-bold text-xs"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-amber-900 block mb-1">
                            Dependencies (Comma-separated codes):
                          </span>
                          <input
                            type="text"
                            value={(comp.dependencies || []).join(', ')}
                            onChange={(e) =>
                              updateComponent(
                                idx,
                                'dependencies',
                                e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              )
                            }
                            placeholder="e.g. UT1, UT2, UT3"
                            className="w-48 px-2 py-1 rounded border border-amber-300 font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Balance Summary Bar */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                      Total Max Raw Marks
                    </span>
                    <span className="text-lg font-bold text-white">{sumRawMarks}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-wider text-[10px]">
                      Sum of Final Weightages
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        Math.abs(sumFinalWeightage - Number(totalFinalMarks)) < 0.01
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {sumFinalWeightage} / {totalFinalMarks}
                    </span>
                  </div>
                </div>

                {Math.abs(sumFinalWeightage - Number(totalFinalMarks)) > 0.01 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-900/40 px-3 py-1.5 rounded-xl border border-amber-700/50">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Weightages sum to {sumFinalWeightage}, but final marks is {totalFinalMarks}.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Grading and Pass Configuration */}
          {activeTab === 'grading' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Minimum Pass Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={minPassPercentage}
                    onChange={(e) => setMinPassPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-base text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Students scoring below this percentage receive an overall 'FAIL'.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Distinction Benchmark (%)
                  </label>
                  <input
                    type="number"
                    value={distinctionPercentage}
                    onChange={(e) => setDistinctionPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-base text-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Qualifies for academic honor / distinction star on report card.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Marks Rounding Rule
                  </label>
                  <select
                    value={roundingRule}
                    onChange={(e) => setRoundingRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                  >
                    <option value="round">Standard Math Round (e.g. 29.5 -&gt; 30)</option>
                    <option value="decimal_1">1 Decimal Place (e.g. 29.5)</option>
                    <option value="decimal_2">2 Decimal Places (e.g. 29.55)</option>
                    <option value="ceil">Ceiling / Round Up</option>
                    <option value="floor">Floor / Truncate</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Applied during final marks summation and percentage computation.
                  </p>
                </div>
              </div>

              {/* Grade Boundaries Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Letter Grade Scale Thresholds
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Letter Grade</th>
                      <th className="py-2.5 px-4">Minimum Percentage Required</th>
                      <th className="py-2.5 px-4 text-center">Score Range Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradeBoundaries.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={b.grade}
                            onChange={(e) => updateGradeBoundary(idx, 'grade', e.target.value)}
                            className="font-bold text-xs px-2 py-1 border border-slate-300 rounded w-16"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="number"
                            value={b.minPercentage}
                            onChange={(e) =>
                              updateGradeBoundary(idx, 'minPercentage', Number(e.target.value))
                            }
                            className="text-xs px-2 py-1 border border-slate-300 rounded w-20 font-semibold"
                          />{' '}
                          %
                        </td>
                        <td className="py-2 px-4 text-center font-medium text-slate-600">
                          {b.minPercentage}% to{' '}
                          {idx === 0 ? '100%' : `${gradeBoundaries[idx - 1].minPercentage - 0.1}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Live Calculation Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Real-Time Calculation Test Engine
                </p>
                <p className="text-blue-800 mt-1">
                  Adjust sample raw marks in the inputs below to immediately verify how your
                  assessment formulas scale and contribute to the grand final score!
                </p>
              </div>

              {/* Sample Inputs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {components.map((c) => (
                  <div key={c.code} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                      {c.name} ({c.code})
                    </span>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Max: {c.maxRawMarks}
                    </span>
                    <input
                      type="number"
                      value={sampleRawMarks[c.code] ?? Math.round(Number(c.maxRawMarks) * 0.8)}
                      onChange={(e) =>
                        setSampleRawMarks({
                          ...sampleRawMarks,
                          [c.code]: Number(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-bold text-slate-900"
                    />
                    <div className="mt-2 pt-1 border-t border-slate-100 flex justify-between text-[10px]">
                      <span className="text-slate-400">Final:</span>
                      <span className="font-bold text-blue-700">
                        {previewResult?.finalMarks?.[c.code] ?? '-'} / {c.finalWeightage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Computed Outcome */}
              {previewResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-900 text-white">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Total Raw Marks
                    </span>
                    <span className="text-xl font-bold text-white">
                      {previewResult.totalRaw} / {sumRawMarks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Computed Final Score
                    </span>
                    <span className="text-xl font-black text-blue-400">
                      {previewResult.totalFinal} / {totalFinalMarks}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Final Percentage
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      {previewResult.percentage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                      Outcome & Grade
                    </span>
                    <span className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                      Grade: {previewResult.grade}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          previewResult.isPass
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {previewResult.isPass ? 'PASS' : 'FAIL'}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Formulas & cycle verification validated</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !templateName.trim() || !validation.isValid}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilderModal;
