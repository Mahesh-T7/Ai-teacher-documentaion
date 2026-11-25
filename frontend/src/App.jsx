import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Core Streamlined SaaS Modules
import { Dashboard } from './pages/dashboard/Dashboard';
import { CreateDailyRecordPage } from './pages/dailyRecord/CreateDailyRecordPage';
import { TeachingHistoryPage } from './pages/history/TeachingHistoryPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { MarksEntrySpreadsheetPage } from './pages/exams/MarksEntrySpreadsheetPage';
import { MarksEntryPage } from './pages/marksEntry/MarksEntryPage';
import { NormalMarksEntryPage } from './pages/marksEntry/NormalMarksEntryPage';

// Additional & Legacy Modules (Maintained for full backwards compatibility)
import { TeacherProfile } from './pages/profile/TeacherProfile';
import { TimetablePage } from './pages/timetable/TimetablePage';
import { LessonPlanPage } from './pages/lessonPlans/LessonPlanPage';
import { AiAssistantPage } from './pages/ai/AiAssistantPage';
import { DocumentIntelligencePage } from './pages/documentIntelligence/DocumentIntelligencePage';
import { PhotoDocsPage } from './pages/photos/PhotoDocsPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { PracticalsPage } from './pages/practicals/PracticalsPage';
import { AssessmentPage } from './pages/assessment/AssessmentPage';
import { InspectionPage } from './pages/inspection/InspectionPage';
import { BackupRestorePage } from './pages/backup/BackupRestorePage';
import { NotFound } from './pages/NotFound';

export const App = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Academic Management Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Core Simplified Sections */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="create-record" element={<CreateDailyRecordPage />} />
        <Route path="teaching-history" element={<TeachingHistoryPage />} />
        <Route path="exams" element={<Navigate to="/marks-entry" replace />} />
        <Route path="exams/entry/:id" element={<MarksEntrySpreadsheetPage />} />
        <Route path="marks-entry" element={<MarksEntryPage />} />
        <Route path="marks-entry/:id" element={<MarksEntryPage />} />
        <Route path="normal-marks-entry" element={<NormalMarksEntryPage />} />
        <Route path="normal-marks-entry/:id" element={<NormalMarksEntryPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Backwards-Compatible Navigation Aliases & Routes */}
        <Route path="profile" element={<SettingsPage />} />
        <Route path="daily-diary" element={<TeachingHistoryPage />} />
        <Route path="photo-docs" element={<DocumentsPage />} />
        <Route path="document-intelligence" element={<DocumentsPage />} />
        <Route path="document-centre" element={<DocumentsPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="lesson-plans" element={<LessonPlanPage />} />
        <Route path="ai-assistant" element={<AiAssistantPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="practicals" element={<PracticalsPage />} />
        <Route path="assessment" element={<AssessmentPage />} />
        <Route path="backup-restore" element={<BackupRestorePage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
