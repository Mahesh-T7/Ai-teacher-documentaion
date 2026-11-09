import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  BookOpen,
  Lightbulb,
  HelpCircle,
  FlaskConical,
  Eye,
  Edit3,
  RemoveFormatting,
} from 'lucide-react';

export const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Document detailed classroom teaching, explanations, derivations, questions asked, and student activities...',
  minHeight = '240px',
}) => {
  const editorRef = useRef(null);
  const [isPreview, setIsPreview] = useState(false);

  // Sync internal editor content when value changes externally (e.g. on load)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCmd = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertBlock = (templateHtml) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, templateHtml);
      handleInput();
    }
  };

  const insertDefinition = () => {
    const html = `<div style="padding:10px 14px; margin:10px 0; background:#f0fdf4; border-left:4px solid #16a34a; border-radius:6px; font-size:13px; color:#14532d;"><strong>📖 Definition / Key Concept:</strong><br>State definition or formal rule here...</div><p><br></p>`;
    insertBlock(html);
  };

  const insertExample = () => {
    const html = `<div style="padding:10px 14px; margin:10px 0; background:#eff6ff; border-left:4px solid #2563eb; border-radius:6px; font-size:13px; color:#1e3a8a;"><strong>💡 Real-life Example & Application:</strong><br>How this concept appears in daily life or industrial applications...</div><p><br></p>`;
    insertBlock(html);
  };

  const insertQuestion = () => {
    const html = `<div style="padding:10px 14px; margin:10px 0; background:#fefce8; border-left:4px solid #ca8a04; border-radius:6px; font-size:13px; color:#713f12;"><strong>❓ Question Discussed in Class:</strong><br>Q: What happens when...?<br><em>Student response & discussion summary...</em></div><p><br></p>`;
    insertBlock(html);
  };

  const insertActivity = () => {
    const html = `<div style="padding:10px 14px; margin:10px 0; background:#faf5ff; border-left:4px solid #9333ea; border-radius:6px; font-size:13px; color:#581c87;"><strong>🧪 Classroom Activity / Demonstration:</strong><br>Teacher demonstrated X using Y; students recorded observation Z...</div><p><br></p>`;
    insertBlock(html);
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text formatting */}
          <button
            type="button"
            onClick={() => executeCmd('bold')}
            title="Bold (Ctrl+B)"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('italic')}
            title="Italic (Ctrl+I)"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('underline')}
            title="Underline"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            <Underline className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Headings */}
          <button
            type="button"
            onClick={() => executeCmd('formatBlock', '<h2>')}
            title="Main Heading"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition flex items-center gap-0.5"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('formatBlock', '<h3>')}
            title="Subheading"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition flex items-center gap-0.5"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCmd('insertUnorderedList')}
            title="Bullet List"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('insertOrderedList')}
            title="Numbered List"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Structured Educational Blocks */}
          <button
            type="button"
            onClick={insertDefinition}
            title="Insert Formal Definition"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
          >
            <BookOpen className="w-3 h-3" />
            <span>Definition</span>
          </button>

          <button
            type="button"
            onClick={insertExample}
            title="Insert Real-Life Example"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition"
          >
            <Lightbulb className="w-3 h-3" />
            <span>Example</span>
          </button>

          <button
            type="button"
            onClick={insertQuestion}
            title="Insert Question Discussed"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Question</span>
          </button>

          <button
            type="button"
            onClick={insertActivity}
            title="Insert Classroom Activity"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition"
          >
            <FlaskConical className="w-3 h-3" />
            <span>Activity</span>
          </button>

          <button
            type="button"
            onClick={() => executeCmd('removeFormat')}
            title="Clear Formatting"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview / Edit Toggle */}
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
        >
          {isPreview ? (
            <>
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Content</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Content Area */}
      {isPreview ? (
        <div
          className="p-4 text-sm text-slate-800 leading-relaxed overflow-y-auto prose max-w-none"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{
            __html: value || `<p class="text-slate-400 italic">No content documented yet.</p>`,
          }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          style={{ minHeight }}
          className="p-4 text-sm text-slate-800 leading-relaxed outline-hidden overflow-y-auto focus:outline-hidden empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        />
      )}
    </div>
  );
};
