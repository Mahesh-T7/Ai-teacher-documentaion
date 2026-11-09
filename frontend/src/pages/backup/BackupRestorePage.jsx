import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  History,
  FileJson,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileCheck2,
  Layers,
  ArrowRight,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';
import { backupApi } from '../../api/backupApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const BackupRestorePage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'restore' | 'history'
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [restoreStrategy, setRestoreStrategy] = useState('merge'); // 'merge' | 'overwrite'
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [parsedBackupData, setParsedBackupData] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const res = await backupApi.getBackupLogs();
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch backup audit logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await backupApi.exportBackup();
      if (res.success && res.backup) {
        setLastExport(res.backup);

        // Download json file
        const blob = new Blob([res.backup.jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.backup.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        showToast(`Full backup exported successfully (${res.backup.manifest.totalRecords} records)`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to export backup', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Please select a valid JSON backup file', 'warning');
      return;
    }

    setSelectedFile(file);
    setPreviewData(null);
    setConfirmed(false);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setAnalyzing(true);
        const content = event.target?.result;
        const parsed = JSON.parse(content);
        setParsedBackupData(parsed);

        const previewRes = await backupApi.previewRestore(parsed);
        if (previewRes.success) {
          setPreviewData(previewRes.preview);
          if (previewRes.preview.conflictsSummary?.hasConflicts) {
            setRestoreStrategy('merge');
          }
          showToast('Backup file analyzed successfully. Review preview below.', 'info');
        }
      } catch (err) {
        showToast(err.response?.data?.message || 'Invalid or corrupted backup JSON file', 'error');
        setSelectedFile(null);
        setParsedBackupData(null);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackupData || !confirmed) {
      showToast('Please review preview and confirm before restoring', 'warning');
      return;
    }

    try {
      setRestoring(true);
      const res = await backupApi.executeRestore({
        backupData: parsedBackupData,
        strategy: restoreStrategy,
        confirmed: true,
      });

      if (res.success) {
        showToast(`Restored ${res.result?.recordsRestored || 0} records successfully!`, 'success');
        setPreviewData(null);
        setSelectedFile(null);
        setParsedBackupData(null);
        setConfirmed(false);
        setActiveTab('history');
        fetchLogs();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Backup & Restore Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              Institutional Safeguard
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Complete data sovereignty: One-click JSON backup export, dry-run restore validation, and audit logging.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <>
              <LoadingSpinner size="sm" />
              Packaging Records...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Full Backup (JSON)
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-t-xl">
        <button
          onClick={() => setActiveTab('export')}
          className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'export'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="w-4 h-4" />
          Export Backup
        </button>

        <button
          onClick={() => setActiveTab('restore')}
          className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'restore'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Restore & Sync
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Trail Logs
          {logs.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full text-gray-700 font-medium">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Export Backup */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Complete Institutional Record Packaging
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Your backup archive contains structured records across all 9 academic modules, encrypted credentials excluded.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { title: 'Timetable', desc: 'Schedules & Rooms', icon: Clock },
                { title: 'Daily Diary', desc: 'Actual Classroom Logs', icon: FileCheck2 },
                { title: 'Lesson Plans', desc: 'Objectives & Aids', icon: Layers },
                { title: 'Attendance', desc: 'Roster & Percentages', icon: CheckCircle2 },
                { title: 'Practicals', desc: 'Lab Sessions & Tools', icon: Database },
                { title: 'Assessments', desc: 'Exams & Quiz Marks', icon: ShieldCheck },
                { title: 'Syllabus', desc: 'Curriculum Progress', icon: FileJson },
                { title: 'Photos Meta', desc: 'Evidence Index', icon: FileCheck2 },
                { title: 'Reports Meta', desc: 'Historical Reports', icon: History },
                { title: 'Teacher Profile', desc: 'School & Subjects', icon: ShieldCheck },
              ].map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div key={idx} className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold text-gray-900">{mod.title}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-2">{mod.desc}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Cryptographic Integrity & Portability
                </div>
                <p className="text-xs text-indigo-700 mt-1">
                  Each backup file is sealed with a SHA-256 checksum and follows an open JSON schema for long-term archival.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap transition-colors"
              >
                {exporting ? 'Generating...' : 'Export Backup Now'}
              </button>
            </div>
          </div>

          {lastExport && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-gray-900">Latest Export Generated</h4>
                </div>
                <Badge variant="emerald">Verified</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Filename:</span>
                  <div className="font-mono text-gray-800 mt-0.5">{lastExport.filename}</div>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">Total Records:</span>
                  <div className="font-bold text-gray-800 mt-0.5">{lastExport.manifest.totalRecords} records</div>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase text-[10px]">SHA-256 Checksum:</span>
                  <div className="font-mono text-gray-700 mt-0.5 truncate" title={lastExport.checksum}>
                    {lastExport.checksum}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Restore Data */}
      {activeTab === 'restore' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              Restore Documentation From Backup
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload a valid portal JSON backup file. The system will perform a dry-run analysis before applying any changes.
            </p>

            {/* File Upload Zone */}
            <div className="mt-6 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-gray-50/50">
              <FileJson className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-900">Select Backup File</div>
              <p className="text-xs text-gray-500 mt-1 mb-4">Supported format: .json backup files</p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="mt-3 text-xs text-indigo-600 font-medium">
                  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </div>
              )}
            </div>

            {analyzing && (
              <div className="mt-6 flex justify-center p-6">
                <LoadingSpinner size="md" message="Performing dry-run analysis and conflict detection..." />
              </div>
            )}

            {/* Dry Run Preview Section */}
            {previewData && !analyzing && (
              <div className="mt-6 space-y-6 animate-fadeIn">
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-gray-900">Dry-Run Inspection & Integrity Analysis</h4>
                    </div>
                    <Badge variant={previewData.targetTeacherMatch ? 'emerald' : 'warning'}>
                      {previewData.targetTeacherMatch ? 'Target Matched' : 'External Backup'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div className="text-gray-400 uppercase text-[10px]">Source Teacher</div>
                      <div className="font-bold text-gray-800 mt-0.5">{previewData.sourceTeacher}</div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div className="text-gray-400 uppercase text-[10px]">Exported On</div>
                      <div className="font-bold text-gray-800 mt-0.5">
                        {new Date(previewData.exportDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div className="text-gray-400 uppercase text-[10px]">Incoming Records</div>
                      <div className="font-bold text-indigo-600 mt-0.5">
                        {Object.values(previewData.incomingCounts).reduce((a, b) => a + b, 0)} records
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                      <div className="text-gray-400 uppercase text-[10px]">Conflicts Detected</div>
                      <div className={`font-bold mt-0.5 ${previewData.conflictsSummary.hasConflicts ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {previewData.conflictsSummary.timetableConflicts + previewData.conflictsSummary.diaryConflicts} conflicts
                      </div>
                    </div>
                  </div>

                  {/* Conflict Notice if any */}
                  {previewData.conflictsSummary.hasConflicts && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold">Overlapping Records Found:</div>
                        <p className="mt-0.5 text-[11px]">
                          {previewData.conflictsSummary.timetableConflicts > 0 &&
                            `${previewData.conflictsSummary.timetableConflicts} timetable periods overlap. `}
                          {previewData.conflictsSummary.diaryConflicts > 0 &&
                            `${previewData.conflictsSummary.diaryConflicts} daily diary date/period entries overlap.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Choose Restore Strategy */}
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Choose Restore Strategy
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          restoreStrategy === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/40'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="strategy"
                            value="merge"
                            checked={restoreStrategy === 'merge'}
                            onChange={() => setRestoreStrategy('merge')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-gray-900">Non-Destructive Merge (Recommended)</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 pl-6">
                          Inserts new records and skips exact duplicates. Existing untouched records remain completely safe.
                        </p>
                      </label>

                      <label
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          restoreStrategy === 'overwrite'
                            ? 'border-amber-600 bg-amber-50/40'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="strategy"
                            value="overwrite"
                            checked={restoreStrategy === 'overwrite'}
                            onChange={() => setRestoreStrategy('overwrite')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-bold text-gray-900">Synchronized Clean Import</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2 pl-6">
                          Syncs all collections to match the incoming archive. Use when restoring to a fresh academic setup.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Teacher Confirmation & Execution */}
                  <div className="mt-6 border-t border-gray-100 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span>
                        I understand this action will import records into my account and cannot be auto-reverted.
                      </span>
                    </label>

                    <button
                      onClick={handleExecuteRestore}
                      disabled={!confirmed || restoring}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {restoring ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Restoring Records...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Execute Restore
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail Logs */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Backup & Restore Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Permanent chronological record of all exports, pre-restore dry-runs, and executed restores.
              </p>
            </div>

            <button
              onClick={fetchLogs}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loadingLogs ? (
            <div className="bg-white p-12 rounded-xl border border-gray-100 flex justify-center">
              <LoadingSpinner size="lg" message="Loading backup audit logs..." />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Audit Records Yet"
              description="Export your first backup to establish a recorded baseline."
              actionLabel="Export Now"
              onAction={() => setActiveTab('export')}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Filename / Notes</th>
                      <th className="py-3 px-4">Strategy</th>
                      <th className="py-3 px-4">Records</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log._id || log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-800 uppercase text-[11px]">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={log.status === 'success' ? 'emerald' : 'danger'}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={log.notes || log.filename}>
                          {log.notes || log.filename || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 capitalize">
                          {log.restoreStrategy || 'none'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {log.recordsRestored || log.manifest?.totalRecords || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
