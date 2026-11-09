import React, { useState } from 'react';
import {
  Printer,
  Download,
  Edit2,
  X,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PrintableLessonPlan } from './PrintableLessonPlan';
import { lessonPlanApi } from '../../api/lessonPlanApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LessonPlanPreviewModal = ({
  isOpen,
  onClose,
  plan,
  onEdit,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen || !plan) return null;

  // Meaningful file name generation: LessonPlan_Class9_AI_07-11-2026.pdf
  const generateFileName = () => {
    const safeClass = (plan.className || 'Class9').replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeSub = (plan.subject || 'Subject').replace(/[^a-zA-Z0-9_\-]/g, '');
    const dateFormatted = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
      .format(plan.date ? new Date(plan.date) : new Date())
      .replace(/\//g, '-');
    return `LessonPlan_${safeClass}_${safeSub}_${dateFormatted}.pdf`;
  };

  // 1. DIRECT PRINT ACTION
  const handlePrint = () => {
    window.print();
  };

  // 2. DOWNLOAD PDF ACTION
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const planId = plan._id || plan.id;
      let blob;

      if (planId && !String(planId).startsWith('draft_') && !String(planId).startsWith('temp_')) {
        const res = await lessonPlanApi.downloadLessonPlanPdf(planId);
        blob =
          res instanceof Blob
            ? res
            : res?.data instanceof Blob
            ? res.data
            : new Blob([res?.data || res], { type: 'application/pdf' });
      } else {
        // Unsaved draft / preview: send data to preview-pdf generator
        const res = await lessonPlanApi.downloadLessonPlanPreviewPdf(plan);
        blob =
          res instanceof Blob
            ? res
            : res?.data instanceof Blob
            ? res.data
            : new Blob([res?.data || res], { type: 'application/pdf' });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Official A4 Lesson Plan PDF downloaded!', 'success');
    } catch (err) {
      console.warn('Backend PDF download error, attempting browser print fallback:', err);
      // Fallback: trigger print dialog if network is unavailable
      window.print();
      showToast('PDF print preview generated in browser.', 'info');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden">
        {/* TOP TOOLBAR - Excluded from print */}
        <div className="no-print p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Official Lesson Plan Preview (A4 Portrait)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  Ready to Print
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Department-compliant layout formatted with standardized pedagogical sections & signatures
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Edit Lesson Plan Button */}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                title="Return to editing lesson plan"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Lesson Plan</span>
              </button>
            )}

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Download official PDF document"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{downloadingPdf ? 'Exporting...' : 'Download PDF'}</span>
            </button>

            {/* Print Lesson Plan Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/20 transition cursor-pointer"
              title="Print directly to printer or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Lesson Plan</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DOCUMENT VIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/70">
          <PrintableLessonPlan plan={plan} teacher={user} />
        </div>

        {/* BOTTOM FOOTER BAR - Excluded from print */}
        <div className="no-print p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Formatted strictly for standard A4 Portrait paper with margins & avoid-break rules
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanPreviewModal;
