import React from 'react';
import { DatabaseBackup } from 'lucide-react';
import { PlaceholderModule } from './PlaceholderModule';

export const BackupRestorePlaceholder = () => (
  <PlaceholderModule
    title="Backup, Recovery & Data Migration"
    subtitle="Encrypted database snapshots, offline data archiving, and institutional transfer packages."
    icon={DatabaseBackup}
    phaseTag="Phase 3 Infrastructure"
    description="Ensure your vital multi-year academic documentation is never lost. Export encrypted JSON/CSV archives of all teaching records, schedule automated MongoDB Atlas cloud snapshots, and seamlessly transfer data between academic institutions."
    features={[
      { title: 'Full Data Archive Export', detail: 'Export complete teacher documentation history in portable, open formats (JSON / CSV).' },
      { title: 'MongoDB Atlas Automated Snapshots', detail: 'Automated daily cloud backups with point-in-time recovery capabilities.' },
      { title: 'School Transfer Package', detail: 'Generate signed data portability package when relocating to another school.' },
      { title: 'Restoration Sandbox', detail: 'Test archive imports in isolated staging before updating active production records.' },
    ]}
  />
);
