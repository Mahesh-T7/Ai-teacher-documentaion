import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  BookMarked,
  FolderArchive,
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  School,
  Sparkles,
  BookOpen,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dashboardApi } from '../../api/dashboardApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';

export const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading && !stats) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Loading your teaching dashboard..." />
      </div>
    );
  }

  const metrics = stats?.metrics || {
    totalTeachingRecords: 0,
    recordsThisMonth: 0,
    classesCovered: 0,
    pendingDrafts: 0,
  };

  const recentRecords = stats?.recentTeachingRecords || [];
  const upcomingSlots = stats?.upcomingTimetable?.slots || [];
  const targetDay = stats?.upcomingTimetable?.day || 'Today';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP SECTION: Welcome, Profile, Date, and Primary CTA */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
            <School className="w-3.5 h-3.5" />
            <span>{user?.schoolName || 'Documentation Portal'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.fullName || 'Teacher'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-500 pt-1">
            <span className="font-medium text-slate-700">
              {user?.designation || 'Faculty Member'}
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{currentDateFormatted}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/create-record')}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm shadow-blue-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Daily Record</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS: 4 Essential KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teaching Records */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Total Teaching Records
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {metrics.totalTeachingRecords ?? metrics.totalClassesConducted ?? 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Logged academic sessions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-6 h-6" />
          </div>
        </div>

        {/* Records This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Records This Month
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {metrics.recordsThisMonth ?? 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Classes Covered */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Classes Covered
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {metrics.classesCovered ?? user?.classesHandled?.length ?? 1}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Active class cohorts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Drafts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Pending Drafts
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {metrics.pendingDrafts ?? metrics.pendingDocumentation ?? 0}
            </h3>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Awaiting confirmation</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/create-record')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-900 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-blue-950">Create Teaching Record</p>
              <p className="text-[11px] text-blue-700">Guided 3-step workflow</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/marks-entry')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-slate-800 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-amber-950">Marks Entry (AI/NSQF)</p>
              <p className="text-[11px] text-amber-700">Excel format entry &amp; calculations</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/normal-marks-entry')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-slate-800 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-indigo-950">Normal Marks Entry</p>
              <p className="text-[11px] text-indigo-700">FA1, FA2, SA1 &amp; FA3, FA4, SA2</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-900">Upload Teaching Material</p>
              <p className="text-[11px] text-slate-500">PDF, PPT, Word & Photos</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/teaching-history')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-900">View Teaching History</p>
              <p className="text-[11px] text-slate-500">Search & filter past logs</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-left transition cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs text-slate-900">Generate Report</p>
              <p className="text-[11px] text-slate-500">Official A4 PDF download</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. MAIN SECTION: Recent Teaching Records & Upcoming Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Teaching Records (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Teaching Records</h2>
                <p className="text-xs text-slate-500">Latest classroom sessions logged</p>
              </div>
              <button
                onClick={() => navigate('/teaching-history')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentRecords.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <BookMarked className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No teaching records found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Start documenting your classroom teaching with the guided 3-step form.
                </p>
                <button
                  onClick={() => navigate('/create-record')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Daily Record</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {recentRecords.map((record, index) => {
                  const recordDate = new Date(record.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const isCompleted = record.status === 'Completed';

                  return (
                    <div
                      key={record._id || record.id || index}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-slate-900">
                            {record.classHandled || record.className}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-600 font-medium">
                            {record.subject}
                          </span>
                          {record.period && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Period {record.period}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium truncate">
                          {record.topic || record.topicCovered || 'Classroom Instruction'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{recordDate}</p>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          {record.status || 'Draft'}
                        </span>
                        <button
                          onClick={() => navigate('/teaching-history')}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View in History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Teaching Activities / Timetable (1 Column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Today's Schedule</h2>
                <p className="text-xs text-slate-500">Upcoming classes for {targetDay}</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {upcomingSlots.length === 0 ? (
              <div className="text-center py-12 px-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No classes scheduled</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Your teaching schedule for {targetDay} is clear.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {upcomingSlots.map((slot, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">
                        Period {slot.period || sIdx + 1}
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">
                        {slot.startTime || '09:00'} - {slot.endTime || '09:45'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">
                      {slot.classHandled || slot.className}
                    </p>
                    <p className="text-[11px] text-slate-500">{slot.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/create-record')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Today's Class</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
