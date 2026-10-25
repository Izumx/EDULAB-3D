// Biology lab: cut-away animal and plant cells, the DNA double helix and mitosis (hand + mouse control).
import React, { Suspense, lazy, useCallback, useRef, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import { LabCanvas } from '../../ui/three';
import { useHandStatus } from '../../hand/handStore';
import {
    ANIMAL_LIST, CELL_INFO, DNA_INFO, DNA_LIST, DNA_PARTS, ONLY_ANIMAL, ONLY_PLANT, ORGANELLES, PLANT_LIST, REPLICATION_INFO,
} from './content';
import { MitosisBar, PhaseCard, PhaseList } from './MitosisPanels';
import { PHASE_COUNT } from './mitosis';
import './biology.css';

const CellScene = lazy(() => import('./CellScene'));
const DnaScene = lazy(() => import('./DnaScene'));
const MitosisScene = lazy(() => import('./MitosisScene'));

const VIEWS = [
    { id: 'animal', label: 'Животная клетка' },
    { id: 'plant', label: 'Растительная клетка' },
    { id: 'dna', label: 'ДНК' },
    { id: 'mitosis', label: 'Деление клетки' },
];

const HOLD = 0.85; // where a phase button stops: the parts of that phase are in place

const EMPTY = new Set();
const CAMERA = { position: [0, 1, 12], fov: 45, near: 0.1, far: 100 };

// Clipping planes of single materials only work when the renderer allows local clipping
const onCreated = ({ gl }) => {
    gl.localClippingEnabled = true;
};

function listFor(view) {
    if (view === 'dna') return { ids: DNA_LIST, data: DNA_PARTS, title: 'Части модели' };
    return { ids: view === 'plant' ? PLANT_LIST : ANIMAL_LIST, data: ORGANELLES, title: 'Органоиды' };
}

function PartList({ view, selected, onSelect }) {
    const { ids, data, title } = listFor(view);
    const only = view === 'plant' ? ONLY_PLANT : view === 'animal' ? ONLY_ANIMAL : EMPTY;
    return (
        <div className="panel bio-list-panel">
            <div className="panel-title">{title}</div>
            <div className="bio-list">
                {ids.map(id => (
                    <button key={id} className={`btn bio-item${selected === id ? ' active' : ''}${only.has(id) ? ' only' : ''}`} onClick={() => onSelect(id)}
                        style={{ '--dot': data[id].color }} aria-pressed={selected === id}>
                        <span className="bio-dot" aria-hidden="true" />
                        <span className="bio-item-name">{data[id].name.replace(/ \(.\)$/, '')}</span>
                    </button>
                ))}
            </div>
            {only.size > 0 && (
                <div className="bio-legend"><span className="bio-legend-box" /> пунктир — {view === 'plant' ? 'есть только у растений' : 'есть только у животных'}</div>
            )}
        </div>
    );
}

function PartCard({ part, onClose }) {
    return (
        <div className="panel bio-card" key={part.name}>
            <div className="bio-card-head">
                <span className="bio-card-dot" style={{ background: part.color, boxShadow: `0 0 14px ${part.color}` }} />
                <div>
                    <h2>{part.name}</h2>
                    <div className="bio-card-kind">{part.kind}</div>
                </div>
                <button className="btn btn-icon bio-card-close" onClick={onClose} aria-label="Закрыть">✕</button>
            </div>
            <div className="bio-card-label">Функция</div>
            <p>{part.func}</p>
            <div className="bio-fact">
                <div className="bio-card-label">Интересный факт</div>
                <p>{part.fact}</p>
            </div>
        </div>
    );
}

function IntroCard({ view, unzip, handPresent }) {
    const info = view === 'dna' ? (unzip ? REPLICATION_INFO : DNA_INFO) : CELL_INFO[view];
    const items = view === 'dna' ? info.facts : info.diff;
    return (
        <div className="panel bio-card">
            <h2>{info.name}</h2>
            <p className="bio-intro">{info.text}</p>
            <div className="bio-card-label">{view === 'dna' ? 'Что важно знать' : 'Отличия'}</div>
            <ul className="bio-diff">
                {items.map(t => <li key={t}>{t}</li>)}
            </ul>
            <p className="bio-hint">
                {handPresent
                    ? '✊ Сожмите кулак в пустом месте и двигайте рукой — модель вращается. Задержите курсор на части — она выберется.'
                    : '🖱 Тяните мышью — вращение, колесо — масштаб. Нажмите на часть модели или выберите её в списке.'}
            </p>
        </div>
    );
}

export default function BiologyLab({ onBack }) {
    const [view, setView] = useState('animal');
    const [selected, setSelected] = useState(null);
    const [labels, setLabels] = useState(true);
    const [unzip, setUnzip] = useState(false);
    const [nonce, setNonce] = useState(0);
    const [mitoT, setMitoT] = useState(HOLD);
    const [playing, setPlaying] = useState(false);
    const [goto, setGoto] = useState({ t: HOLD });
    const zoom = useRef(1);
    const { present } = useHandStatus();

    const phase = Math.min(PHASE_COUNT - 1, Math.floor(mitoT));
    const gotoPhase = i => {
        setPlaying(false);
        setGoto({ t: Math.max(0, Math.min(PHASE_COUNT - 1, i)) + HOLD });
    };
    const scrub = value => {
        setPlaying(false);
        setGoto({ t: value });
    };
    const togglePlay = () => {
        // from the end of telophase, start again
        if (!playing && mitoT > PHASE_COUNT - 0.2) setGoto({ t: 0 });
        setPlaying(p => !p);
    };

    // Selecting the same part again clears the selection
    const select = useCallback(id => setSelected(cur => (cur === id ? null : id)), []);

    const changeView = id => {
        setView(id);
        setLabels(id !== 'plant'); // the plant cell has many parts, so its names start hidden
        setSelected(null);
        setUnzip(false);
        setPlaying(false);
        zoom.current = 1;
    };

    const overview = () => {
        setSelected(null);
        setNonce(n => n + 1);
        zoom.current = 1;
    };

    const zoomBy = k => {
        zoom.current = Math.max(0.55, Math.min(1.5, zoom.current * k));
    };

    const dna = view === 'dna';
    const mitosis = view === 'mitosis';
    const part = selected ? (dna ? DNA_PARTS : ORGANELLES)[selected] : null;

    const tabs = (
        <div className="bio-seg" role="group" aria-label="Модель">
            {VIEWS.map(v => (
                <button key={v.id} className={`btn${view === v.id ? ' active' : ''}`} onClick={() => changeView(v.id)}>{v.label}</button>
            ))}
        </div>
    );

    return (
        <LabShell title="Биология" subtitle={dna ? 'Молекула ДНК' : mitosis ? 'Митоз' : 'Строение клетки'} icon="🧬" accent="var(--bio)" onBack={onBack} actions={tabs}>
            <LabCanvas camera={CAMERA} onCreated={onCreated}>
                <Suspense fallback={null}>
                    {mitosis
                        ? <MitosisScene key="mitosis" playing={playing} goto={goto} onProgress={setMitoT} showLabels={labels} zoom={zoom} phase={phase} />
                        : dna
                        ? <DnaScene key="dna" selected={selected} onSelect={select} unzip={unzip} zoom={zoom} showLabels={labels} />
                        : <CellScene key={view} type={view} selected={selected} onSelect={select} showLabels={labels} zoom={zoom} viewNonce={nonce} />}
                </Suspense>
            </LabCanvas>

            <aside className="lab-left bio-left">
                {mitosis
                    ? <PhaseList phase={phase} onPick={gotoPhase} />
                    : <PartList view={view} selected={selected} onSelect={select} />}
            </aside>

            <aside className="lab-right bio-right">
                {mitosis
                    ? <PhaseCard phase={phase} />
                    : part
                    ? <PartCard part={part} onClose={() => setSelected(null)} />
                    : <IntroCard view={view} unzip={unzip} handPresent={present} />}
            </aside>

            {mitosis ? (
                <nav className="lab-bottom bio-bar" aria-label="Ход деления">
                    <MitosisBar t={mitoT} playing={playing} onPlay={togglePlay} onStep={d => gotoPhase(phase + d)}
                        onScrub={scrub} labels={labels} onLabels={() => setLabels(v => !v)} />
                </nav>
            ) : (
            <nav className="lab-bottom bio-bar" aria-label="Управление">
                <button className="btn btn-icon bio-zoom" onClick={() => zoomBy(1.18)} aria-label="Отдалить">−</button>
                <button className={`btn${!selected ? ' active' : ''}`} onClick={overview}>Обзор</button>
                <button className="btn btn-icon bio-zoom" onClick={() => zoomBy(0.85)} aria-label="Приблизить">+</button>
                <button className={`btn${labels ? ' active' : ''}`} aria-pressed={labels} onClick={() => setLabels(v => !v)}>Подписи</button>
                {dna && (
                    <button className={`btn${unzip ? ' active' : ' btn-primary'}`} onClick={() => setUnzip(v => !v)}>
                        {unzip ? 'Закрутить обратно' : 'Раскрутить'}
                    </button>
                )}
            </nav>
            )}
        </LabShell>
    );
}
