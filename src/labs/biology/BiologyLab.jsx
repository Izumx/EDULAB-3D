import React from 'react';
import { LabShell } from '../../ui/LabShell';

export default function BiologyLab({ onBack }) {
    return <LabShell title="Биология" icon="🧬" accent="var(--bio)" subtitle="В разработке" onBack={onBack} />;
}
