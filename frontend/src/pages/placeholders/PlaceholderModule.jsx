import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, CheckCircle2, Calendar } from 'lucide-react';

export const PlaceholderModule = ({
  title,
  subtitle,
  icon: Icon,
  phaseTag = 'Phase 2 Milestone',
  description,
  features = [],
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-xs">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h1>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                  {phaseTag}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Description */}
        <div className="mt-6 text-sm text-slate-600 leading-relaxed">
          <p>{description}</p>
        </div>
      </div>

      {/* Planned Feature Blueprint Grid */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Planned Architecture & Capabilities Blueprint
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-start gap-3"
            >
              <div className="p-1 rounded-full bg-blue-100 text-blue-700 mt-0.5 flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">{feature.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  {feature.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-500">
              Module roadmap scheduled for subsequent development phases after Phase 1 foundation sign-off.
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
          >
            View Active Metrics
          </button>
        </div>
      </div>
    </div>
  );
};
