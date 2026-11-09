import React from 'react';
import { FolderArchive } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const DocumentCentrePlaceholder = () => (
  <PlaceholderModule
    title="Document Centre & Institutional Files"
    subtitle="Central digital repository for circulars, syllabi documents, government orders, and school policies."
    icon={FolderArchive}
    phaseTag="Phase 3 Document Vault"
    description="Store and reference all educational policies, board circulars, question papers from previous years, and curriculum framework documents in one searchable, encrypted cloud vault."
    features={[
      { title: 'School Circulars & Orders', detail: 'Instant access to department directives, holiday lists, and inspection notices.' },
      { title: 'Question Bank Vault', detail: 'Central repository of past board examination papers and model answers.' },
      { title: 'Curriculum & Framework Docs', detail: 'National Education Policy (NEP) guidelines, syllabus copies, and blueprints.' },
      { title: 'Secure Tagging & Search', detail: 'Filter documents by subject, academic year, circular number, and publisher.' },
    ]}
  />
);
