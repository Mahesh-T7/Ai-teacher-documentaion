import React from 'react';
import { BookMarked } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const DailyDiaryPlaceholder = () => (
  <PlaceholderModule
    title="Daily Teaching Diary"
    subtitle="Official day-wise teaching records, classroom remarks, student participation, and homework logs."
    icon={BookMarked}
    phaseTag="Phase 2 Documentation Core"
    description="The foundational legal record of a teacher's daily activity. Record topics covered period by period, homework assigned, absentees, special activities, and teacher self-reflections required during educational audits."
    features={[
      { title: 'Period-by-Period Logging', detail: 'Quick entry for each period of the day with class, subject, topic, and outcomes.' },
      { title: 'Homework & Assignment Tracker', detail: 'Maintain clear homework tasks given to students for inspection validation.' },
      { title: 'Reflective Notes & Remediation', detail: 'Document classroom challenges, concepts that require revision, and notes for the next class.' },
      { title: 'One-Click Diary PDF Export', detail: 'Compliant monthly register export for inspection officer signatures.' },
    ]}
  />
);
