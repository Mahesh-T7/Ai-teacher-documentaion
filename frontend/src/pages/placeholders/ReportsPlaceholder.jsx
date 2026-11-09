import React from 'react';
import { FileDown } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const ReportsPlaceholder = () => (
  <PlaceholderModule
    title="Reports & Inspection Dossiers"
    subtitle="Audit-compliant comprehensive exports, teacher performance dossiers, and regulatory portfolios."
    icon={FileDown}
    phaseTag="Phase 3 Reporting Engine"
    description="Designed for formal educational inspections, board appraisals, and academic audits. Generate verifiable, comprehensive PDF portfolios containing authenticated teaching diaries, syllabus completion certificates, and lab logs."
    features={[
      { title: 'Official Inspection Dossier', detail: 'Complete bound-style PDF bundle with index, verified diaries, and countersignatures.' },
      { title: 'Syllabus Completion Certificate', detail: 'Formal compliance declaration required by examination boards at term conclusion.' },
      { title: 'Lab Practical Log Book', detail: 'Audit-ready printout of all science and computer experiments conducted.' },
      { title: 'Teacher Appraisal Portfolio', detail: 'Annual documentation bundle for performance reviews and career advancement.' },
    ]}
  />
);
