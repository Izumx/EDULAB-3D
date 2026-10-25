import React from 'react';
import { LabShell } from '../../ui/LabShell';

export default function ChemistryLab({ onBack }) {
    return <LabShell title="Химия" icon="🧪" accent="var(--chem)" subtitle="В разработке" onBack={onBack} />;
}
