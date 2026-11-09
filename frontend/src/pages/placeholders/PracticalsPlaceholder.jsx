import React from 'react';
import { FlaskConical } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const PracticalsPlaceholder = () => (
  <PlaceholderModule
    title="Practical Activities & Laboratory Log"
    subtitle="Lab experiments record, apparatus usage, safety protocols, and student observation records."
    icon={FlaskConical}
    phaseTag="Phase 2 Laboratory Module"
    description="Dedicated documentation for STEM, Science, and Computer practical sessions. Log apparatus used, chemicals consumed, experiments performed, safety compliance, and individual student evaluation marks."
    features={[
      { title: 'Standard Lab Experiment Catalog', detail: 'Pre-populated physics, chemistry, biology, and computer lab experiments.' },
      { title: 'Chemical & Apparatus Usage Log', detail: 'Track reagent consumption and equipment status for lab audits.' },
      { title: 'Safety Protocol Sign-off', detail: 'Document safety briefing and PPE adherence before practical sessions.' },
      { title: 'Student Practical Evaluation', detail: 'Grade student observation notebooks, viva-voce, and experimental skills.' },
    ]}
  />
);
