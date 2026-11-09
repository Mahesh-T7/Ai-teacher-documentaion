import React from 'react';
import { Award } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const AssessmentPlaceholder = () => (
  <PlaceholderModule
    title="Assessment & Grading Suite"
    subtitle="Formative and summative marksheets, learning outcomes mapping, and gradebook analytics."
    icon={Award}
    phaseTag="Phase 2 Evaluation Engine"
    description="Record unit tests, quarterly exams, practical marks, and internal assessment grades. Analyze student performance distributions, identify weak topics across class sections, and generate report card comments."
    features={[
      { title: 'Mark Entry Gradebook', detail: 'Spreadsheet-like rapid mark entry with keyboard navigation and auto-sum.' },
      { title: 'Learning Outcome Analysis', detail: 'Correlate test questions with specific competencies to identify learning gaps.' },
      { title: 'Grade Distribution Analytics', detail: 'Visual histograms and bell curves of class performance across test series.' },
      { title: 'Individual Progress Cards', detail: 'Student-specific progress report with strengths and improvement areas.' },
    ]}
  />
);
