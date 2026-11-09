import React from 'react';
import { Camera } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const PhotoDocsPlaceholder = () => (
  <PlaceholderModule
    title="Photo Documentation & Evidence Gallery"
    subtitle="Geotagged classroom evidence, blackboard notes, student science projects, and school events."
    icon={Camera}
    phaseTag="Phase 3 Media & Storage"
    description="Capture and archive visual proof of active learning, science experiments, student club exhibitions, and remedial interventions. Store high-resolution photos with date-stamping and classroom tagging for NAAC and school board inspection dossiers."
    features={[
      { title: 'Date-Stamped Classroom Capture', detail: 'Upload mobile photos of blackboard work, demonstrations, and student group work.' },
      { title: 'Project Exhibition Galleries', detail: 'Dedicated galleries for science fairs, math models, and art integrated projects.' },
      { title: 'Inspection Evidence Bundling', detail: 'Attach photos directly to lesson plans and practical activity logs.' },
      { title: 'Cloud Compression & Secure Storage', detail: 'Automatic image optimization ensuring low storage consumption.' },
    ]}
  />
);
