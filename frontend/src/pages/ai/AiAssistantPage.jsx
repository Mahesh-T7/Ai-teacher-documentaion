import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  FileText,
  ListOrdered,
  HelpCircle,
  FileQuestion,
  FlaskConical,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Save,
  Trash2,
  ExternalLink,
  Layers,
  Languages,
  Clock,
  ArrowRight,
  Info,
  ChevronRight,
  Presentation,
} from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { Badge } from '../../components/common/Badge';

const AI_TOOLS = [
  { id: 'lesson_plan', name: 'Lesson Plan Generator', icon: BookOpen, desc: 'Complete 5E pedagogy lesson plan with objectives and activities.' },
  { id: 'teaching_content', name: 'Detailed Teaching Content', icon: FileText, desc: 'In-depth explanation, step-by-step examples, and real-life connections.' },
  { id: 'notes', name: 'AI Revision Notes', icon: Layers, desc: 'Clean student-friendly notes with definitions, key points, and formulas.' },
  { id: 'mcq', name: 'MCQ & Quiz Generator', icon: ListOrdered, desc: 'Multiple choice questions with answer keys and rationale.' },
  { id: 'question_paper', name: 'Question Paper Maker', icon: FileQuestion, desc: 'Balanced question paper with 1-mark, short, and long-answer questions.' },
  { id: 'worksheet', name: 'Classroom Worksheet', icon: HelpCircle, desc: 'Engaging printable worksheets with blanks, true/false, and match exercises.' },
  { id: 'activity', name: 'Classroom Activity Generator', icon: FlaskConical, desc: 'Group discussions, think-pair-share, and experiential tasks.' },
  { id: 'revision', name: 'Quick Revision Flashcards', icon: RefreshCw, desc: 'Key summaries, common misconceptions, and rapid recap prompts.' },
  { id: 'explanation', name: 'Conceptual Explanation', icon: Sliders, desc: 'Simple metaphors and analogies to clarify difficult topics.' },
  { id: 'ppt_outline', name: 'PPT Slide Outline', icon: Presentation, desc: 'Slide-by-slide structure with speaking notes and bullet outlines.' },
];

export const AiAssistantPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'drafts'
  const [selectedTool, setSelectedTool] = useState(AI_TOOLS[0]);
  const [syllabusUnits, setSyllabusUnits] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [approvedPlanInfo, setApprovedPlanInfo] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    className: 'Class 9',
    section: 'A',
    subject: 'Artificial Intelligence',
    unit: 'Unit 4: Introduction to Generative AI',
    chapter: 'Chapter 5: Generative vs Discriminative AI',
    topic: 'Prompt Engineering and LLMs',
    subtopic: 'Zero-shot vs Few-shot Prompting',
    duration: 45,
    language: 'English',
    learningLevel: 'Intermediate',
    depth: 'Intermediate',
    numQuestions: 5,
    additionalInstructions: '',
  });

  // Fetch Syllabus & Drafts
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await aiApi.getSyllabus();
        if (res.success && res.units) {
          setSyllabusUnits(res.units);
        }
      } catch (err) {
        console.warn('Could not load syllabus presets:', err.message);
      }
    };
    initData();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoadingDrafts(true);
      const res = await aiApi.getDrafts();
      if (res.success) {
        setDrafts(res.drafts || res.data || []);
      }
    } catch (err) {
      showToast('Failed to load saved drafts', 'error');
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'drafts') {
      fetchDrafts();
    }
  }, [activeTab]);

  const handleUnitSelect = (e) => {
    const unitTitle = e.target.value;
    const foundUnit = syllabusUnits.find((u) => `${u.unit}: ${u.title}` === unitTitle || u.title === unitTitle);
    if (foundUnit && foundUnit.chapters?.length > 0) {
      const firstChap = foundUnit.chapters[0];
      setFormData((prev) => ({
        ...prev,
        unit: `${foundUnit.unit}: ${foundUnit.title}`,
        chapter: `${firstChap.chapter}: ${firstChap.name}`,
        topic: firstChap.topics?.[0] || prev.topic,
      }));
    } else {
      setFormData((prev) => ({ ...prev, unit: unitTitle }));
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!formData.topic.trim()) {
      showToast('Please specify a topic or concept name.', 'warning');
      return;
    }

    try {
      setGenerating(true);
      setApprovedPlanInfo(null);
      const res = await aiApi.generate({
        toolType: selectedTool.id,
        ...formData,
      });

      if (res.success && res.draft) {
        setCurrentDraft(res.draft);
        setEditedContent(res.draft.content || (typeof res.draft.generatedContent === 'string' ? res.draft.generatedContent : JSON.stringify(res.draft.generatedContent, null, 2)));
        showToast(`AI ${selectedTool.name} generated successfully!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Generation failed. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentDraft) return;
    try {
      const res = await aiApi.updateDraft(currentDraft._id || currentDraft.id, {
        content: editedContent,
      });
      if (res.success) {
        showToast('Draft changes saved successfully.', 'success');
        setCurrentDraft(res.draft || res.data);
      }
    } catch (err) {
      showToast('Failed to save draft changes', 'error');
    }
  };

  const handleApprove = async () => {
    if (!currentDraft) return;
    try {
      const res = await aiApi.approveDraft(currentDraft._id || currentDraft.id);
      if (res.success) {
        showToast('Approved! Created formal curriculum Lesson Plan.', 'success');
        setCurrentDraft(res.draft || res.data);
        if (res.lessonPlan) {
          setApprovedPlanInfo(res.lessonPlan);
        }
      }
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleLoadDraft = (d) => {
    const tool = AI_TOOLS.find((t) => t.id === d.toolType) || AI_TOOLS[0];
    setSelectedTool(tool);
    setCurrentDraft(d);
    setEditedContent(d.content || (typeof d.generatedContent === 'string' ? d.generatedContent : JSON.stringify(d.generatedContent, null, 2)));
    if (d.inputs) {
      setFormData((prev) => ({ ...prev, ...d.inputs }));
    }
    setActiveTab('generator');
    showToast(`Loaded draft: ${d.inputs?.topic || d.toolType}`, 'info');
  };

  const handleDeleteDraft = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this AI draft permanently?')) return;
    try {
      await aiApi.deleteDraft(id);
      showToast('Draft removed', 'success');
      setDrafts((prev) => prev.filter((d) => (d._id || d.id) !== id));
      if (currentDraft && (currentDraft._id === id || currentDraft.id === id)) {
        setCurrentDraft(null);
        setEditedContent('');
      }
    } catch (err) {
      showToast('Failed to delete draft', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-purple-800 via-indigo-700 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-200/20 text-purple-100 border border-purple-300/30">
              Phase 3 Pedagogical Assistant
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-300 font-medium">
              <Languages className="w-3.5 h-3.5" /> English & ಕನ್ನಡ
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            AI Teaching Assistant
          </h1>
          <p className="text-sm text-purple-100 mt-1 max-w-2xl">
            Generates curriculum-aligned lesson plans, comprehensive explanations, worksheets, and quizzes.
            Saves hours of prep time while keeping teachers fully in control.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-xl self-start md:self-auto border border-white/20">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'generator' ? 'bg-white text-indigo-900 shadow' : 'text-white hover:bg-white/10'
            }`}
          >
            Create Content
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'drafts' ? 'bg-white text-indigo-900 shadow' : 'text-white hover:bg-white/10'
            }`}
          >
            Saved Drafts
          </button>
        </div>
      </div>

      {/* Verification Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-amber-900 text-xs shadow-sm">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Curriculum Verification Notice:</span> AI-generated teaching resources serve
          as structured starting drafts. Educators remain responsible for syllabus verification, textbook alignment, and
          classroom delivery before final documentation. AI outputs are never automatically marked as completed in teaching diaries.
        </div>
      </div>

      {activeTab === 'drafts' ? (
        /* SAVED DRAFTS VIEW */
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Saved AI Pedagogical Drafts</h2>
            <button
              onClick={fetchDrafts}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loadingDrafts ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No saved AI drafts found. Generate a lesson plan or worksheet to save your first draft.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((d) => {
                const toolMeta = AI_TOOLS.find((t) => t.id === d.toolType) || AI_TOOLS[0];
                const Icon = toolMeta.icon;
                return (
                  <div
                    key={d._id || d.id}
                    onClick={() => handleLoadDraft(d)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                          <Icon className="w-3 h-3" /> {toolMeta.name}
                        </span>
                        <Badge
                          variant={d.status === 'Approved' ? 'success' : 'default'}
                          size="sm"
                        >
                          {d.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">
                        {d.inputs?.topic || d.inputs?.title || 'Draft Content'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {d.inputs?.className || 'Class'} • {d.inputs?.subject || 'Subject'} • {d.language || 'English'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-400">
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => handleDeleteDraft(d._id || d.id, e)}
                        className="p-1 hover:text-rose-600 rounded"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* GENERATOR WORKSPACE */
        <div className="space-y-6">
          {/* 10 Tool Selector Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Select Pedagogical AI Generator
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {AI_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTool.id === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setSelectedTool(tool)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span className="leading-tight">{tool.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form Column (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  {React.createElement(selectedTool.icon, { className: 'w-4 h-4 text-indigo-600' })}
                  <h3 className="text-sm font-bold text-slate-800">{selectedTool.name} Settings</h3>
                </div>
                <span className="text-xs font-medium text-slate-400">{selectedTool.id}</span>
              </div>

              <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
                {/* Class & Section */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">Class</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      placeholder="e.g. Class 9"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Section</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Artificial Intelligence"
                  />
                </div>

                {/* CBSE Class 9 AI Preset Units */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Curriculum Unit Preset</label>
                  <select
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                    onChange={handleUnitSelect}
                    value={formData.unit}
                  >
                    <option value="">Custom Unit (Enter manually below)</option>
                    {syllabusUnits.map((u, i) => (
                      <option key={i} value={`${u.unit}: ${u.title}`}>
                        {u.unit}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter & Topic */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Chapter</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      placeholder="e.g. Chapter 5: GenAI"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Teaching Topic *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g. Prompt Engineering"
                    />
                  </div>
                </div>

                {/* Language & Depth */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Language</label>
                    <select
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                      <option value="Kannada + English">Kannada + English (Bilingual)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Explanation Depth</label>
                    <select
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                      value={formData.depth}
                      onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                    >
                      <option value="Basic">Basic (Foundational)</option>
                      <option value="Intermediate">Intermediate (Standard)</option>
                      <option value="Advanced">Advanced (Enrichment)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Instructions */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Additional Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs"
                    value={formData.additionalInstructions}
                    onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
                    placeholder="e.g., Focus on real-life healthcare examples, include a 5-min interactive quiz..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow-sm hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 text-xs"
                >
                  {generating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generating with AI Engine...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Generate {selectedTool.name}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Output Editor Column (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                {/* Editor Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {currentDraft ? currentDraft.inputs?.topic || 'Generated Asset' : 'AI Output Preview & Editor'}
                    </span>
                    {currentDraft && (
                      <Badge variant={currentDraft.status === 'Approved' ? 'success' : 'default'} size="sm">
                        {currentDraft.status}
                      </Badge>
                    )}
                  </div>

                  {currentDraft && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-500" /> Save Draft
                      </button>

                      {currentDraft.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={handleApprove}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve to Lesson Plan
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {approvedPlanInfo && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                    <span>
                      🎉 <strong>Curriculum Lesson Plan Created!</strong> Title: "{approvedPlanInfo.title}"
                    </span>
                    <a
                      href="/lesson-plans"
                      className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      View in Lesson Plans <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Editor Content Area */}
                {generating ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                    <LoadingSpinner size="lg" />
                    <p className="font-medium text-slate-700">Synthesizing pedagogical framework...</p>
                    <p className="text-slate-400 max-w-xs text-center">
                      Aligning learning objectives, activities, and questions with selected depth and language.
                    </p>
                  </div>
                ) : !currentDraft ? (
                  <div className="py-20 text-center text-slate-400 text-xs space-y-2">
                    <Sparkles className="w-10 h-10 mx-auto text-indigo-300" />
                    <p className="font-medium text-slate-600">No content generated yet.</p>
                    <p>Select a tool, configure topic details on the left, and click "Generate".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <RichTextEditor
                      value={editedContent}
                      onChange={setEditedContent}
                      placeholder="Edit or refine the AI generated content here..."
                      minHeight="380px"
                    />
                  </div>
                )}
              </div>

              {currentDraft && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Language: {currentDraft.language || 'English'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistantPage;
