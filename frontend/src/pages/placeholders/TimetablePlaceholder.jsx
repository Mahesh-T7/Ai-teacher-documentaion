import React from 'react';
import { CalendarDays } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const TimetablePlaceholder = () => (
  <PlaceholderModule
    title="Timetable & Period Allocations"
    subtitle="Master weekly schedule manager, room assignments, and substitution tracking."
    icon={CalendarDays}
    phaseTag="Phase 2 Schedule Core"
    description="Manage your weekly period grid across classes and subjects. Track substitute teaching allocations, room changes, zero-hour study periods, and receive automated notifications before upcoming periods."
    features={[
      { title: 'Weekly Grid View', detail: 'Visual Monday-Saturday interactive grid showing period times, subject codes, and room numbers.' },
      { title: 'Substitution Management', detail: 'Log and track deputed classes taken on behalf of colleagues with signature validation.' },
      { title: 'Bell Schedule Integration', detail: 'Configurable school bell timing, zero periods, and prayer/assembly intervals.' },
      { title: 'Printable Schedule Sheets', detail: 'Generate PDF timetable posters ready for classroom door and teacher desk display.' },
    ]}
  />
);
