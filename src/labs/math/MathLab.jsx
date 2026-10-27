// Math lab: solids with formulas and nets, and building a figure from its three views.
import React, { useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import SolidsMode from './SolidsMode';
import { initialLabMode, rememberLabMode } from '../../ui/labMode';
import ViewsMode from './ViewsMode';
import './math.css';

const MODES = [
    { id: 'solids', label: 'Тела и развёртки', subtitle: 'Геометрия тел' },
    { id: 'views', label: 'Виды (чертёж)', subtitle: 'Три вида фигуры' },
];

export default function MathLab({ onBack }) {
    const [mode, setModeState] = useState(() => initialLabMode('solids', MODES.map(m => m.id)));
    const setMode = m => {
        setModeState(m);
        rememberLabMode(m);
    };
    const current = MODES.find(m => m.id === mode);
    const tabs = (
        <div className="math-seg" role="group" aria-label="Режим">
            {MODES.map(m => (
                <button key={m.id} className={`btn${mode === m.id ? ' active' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
        </div>
    );
    return (
        <LabShell title="Математика" subtitle={current.subtitle} subject="math" onBack={onBack} actions={tabs}>
            {mode === 'solids' && <SolidsMode />}
            {mode === 'views' && <ViewsMode />}
        </LabShell>
    );
}
