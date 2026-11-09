import React from 'react';
import { Users } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const AttendancePlaceholder = () => (
  <PlaceholderModule
    title="Class Attendance & Student Register"
    subtitle="Classroom roster management, daily period roll-call, leave records, and chronic absentee tracking."
    icon={Users}
    phaseTag="Phase 2 Student Records"
    description="Streamlined digital attendance for each assigned class section. Mark roll call in under 30 seconds, calculate monthly attendance percentages, flag at-risk absentees, and generate official attendance sheets."
    features={[
      { title: 'One-Tap Roll Call', detail: 'Quick toggle for Present, Absent, Late, or On-Duty with bulk mark-all present.' },
      { title: 'Chronic Absentee Alerts', detail: 'Automatic warnings when student attendance drops below statutory thresholds (e.g., 75%).' },
      { title: 'Monthly Register Formats', detail: 'Pre-formatted tabular printouts matching standard government education registers.' },
      { title: 'Parent Notification Ready', detail: 'SMS and WhatsApp absent alerts for immediate guardian communication.' },
    ]}
  />
);
