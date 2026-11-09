import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const SettingsPlaceholder = () => (
  <PlaceholderModule
    title="Portal Settings & Academic Preferences"
    subtitle="Notification preferences, bell timing configuration, language localization, and security settings."
    icon={SettingsIcon}
    phaseTag="Phase 2 Configuration"
    description="Customize the AI Teacher Documentation Portal to match your school’s unique schedule, academic terms, and administrative reporting requirements."
    features={[
      { title: 'Academic Session & Term Dates', detail: 'Configure start and end dates for Term 1, Term 2, vacations, and examination weeks.' },
      { title: 'Period Bell Timing Master', detail: 'Set duration and break intervals for daily class schedules.' },
      { title: 'Notification & Reminder Toggles', detail: 'Configure daily diary reminder times and email notifications for pending logs.' },
      { title: 'Security & Two-Factor Authentication', detail: 'Manage password changes, active session tokens, and device logins.' },
    ]}
  />
);
