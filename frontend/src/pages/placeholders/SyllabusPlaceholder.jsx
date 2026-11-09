import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const SyllabusPlaceholder = () => (
  <PlaceholderModule
    title="Syllabus Progress Tracker"
    subtitle="Term-wise chapter completion, target vs actual pacing, and annual curriculum planning."
    icon={BarChart3}
    phaseTag="Phase 2 Curriculum Tracker"
    description="Keep curriculum delivery strictly on schedule across all terms. Compare your planned teaching timeline against actual completed periods, track chapter completion percentages, and ensure full coverage before board and term examinations."
    features={[
      { title: 'Chapter Pacing Tracker', detail: 'Check off topics as you teach and see immediate progress percentage updates.' },
      { title: 'Pacing Deviation Warnings', detail: 'Identifies if a class is falling behind the annual school academic calendar.' },
      { title: 'Revision & Exam Preparation Blocks', detail: 'Reserve dedicated periods for revision, mock tests, and doubt clearing.' },
      { title: 'Head of Department Progress Sync', detail: 'Aggregate syllabus completion across all sections of the same grade level.' },
    ]}
  />
);
