// Geography lab: a globe with coordinates and a find-the-point game, and seasons with day length.
import React, { useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import GlobeMode from './GlobeMode';
import SeasonsMode from './SeasonsMode';
import './geo.css';

const MODES = [
    { id: 'globe', label: 'Глобус', subtitle: 'Координаты и карта' },
    { id: 'seasons', label: 'Времена года', subtitle: 'День и ночь, длина дня' },
];

export default function GeoLab({ onBack }) {
    const [mode, setMode] = useState('globe');
    const current = MODES.find(m => m.id === mode);
    const tabs = (
        <div className="geo-seg" role="group" aria-label="Режим">
            {MODES.map(m => (
                <button key={m.id} className={`btn${mode === m.id ? ' active' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
        </div>
    );
    return (
        <LabShell title="География" subtitle={current.subtitle} icon="🌍" accent="var(--geo)" onBack={onBack} actions={tabs}>
            {mode === 'globe' ? <GlobeMode /> : <SeasonsMode />}
        </LabShell>
    );
}
