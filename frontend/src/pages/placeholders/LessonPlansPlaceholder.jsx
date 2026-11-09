import React from 'react';
import { BookOpen } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const LessonPlansPlaceholder = () => (
  <PlaceholderModule
    title="Lesson Plans Manager"
    subtitle="Standardized instructional designs, learning objectives, TLM lists, and principal approval workflows."
    icon={BookOpen}
    phaseTag="Phase 2 Academic Core"
    description="Create, organize, and store official lesson plans for each class and subject. Align every lesson to prescribed learning standards, specify Teaching-Learning Material (TLM), and submit for Headmaster or Inspector digital signatures."
    features={[
      { title: 'Standardized Plan Templates', detail: 'Includes CBSE, ICSE, State Board, and Cambridge-aligned structure layouts.' },
      { title: 'Teaching Learning Material (TLM)', detail: 'Specify lab apparatus, charts, models, smartboard slides, and digital tools.' },
      { title: 'Headmaster Approval Workflow', detail: 'Digital submission and countersignature track with reviewer revision notes.' },
      { title: 'Yearly Plan Repository', detail: 'Archive and clone successful lesson plans across subsequent academic terms.' },
    ]}
  />
);
