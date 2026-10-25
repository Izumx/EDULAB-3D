// Panels of the mitosis view: phase list (left), phase card (right) and the playback bar (bottom).
import React from 'react';
import { MITOSIS_INFO, PHASES, PHASE_COUNT } from './mitosis';

export function PhaseList({ phase, onPick }) {
    return (
        <div className="panel bio-list-panel">
            <div className="panel-title">Фазы митоза</div>
            <div className="bio-phases">
                {PHASES.map((p, i) => (
                    <button key={p.id} className={`btn bio-phase${i === phase ? ' active' : ''}${i < phase ? ' done' : ''}`}
                        onClick={() => onPick(i)} aria-pressed={i === phase}>
                        <span className="bio-phase-num">{i === 0 ? '0' : i}</span>
                        <span className="bio-phase-text">
                            <b>{p.name}</b>
                            <small>{p.sub}</small>
                        </span>
                    </button>
                ))}
            </div>
            <div className="bio-legend bio-mitosis-legend">
                <span><i style={{ background: '#f43f5e' }} /> от матери</span>
                <span><i style={{ background: '#3b82f6' }} /> от отца</span>
            </div>
        </div>
    );
}

export function PhaseCard({ phase }) {
    const p = PHASES[phase];
    return (
        <div className="panel bio-card" key={p.id}>
            <div className="bio-card-head">
                <span className="bio-phase-badge">{phase === 0 ? '0' : phase}</span>
                <div>
                    <h2>{p.name}</h2>
                    <div className="bio-card-kind">{phase === 0 ? 'перед митозом' : `${phase}-я фаза митоза`}</div>
                </div>
            </div>
            <p>{p.text}</p>
            <div className="bio-set">
                <span className="bio-card-label">Набор хромосом</span>
                <b>{p.set}</b>
            </div>
            <div className="bio-fact">
                <div className="bio-card-label">{phase === PHASE_COUNT - 1 ? 'Итог митоза' : 'Модель'}</div>
                <p>{phase === PHASE_COUNT - 1 ? MITOSIS_INFO.text : MITOSIS_INFO.model}</p>
            </div>
        </div>
    );
}

export function MitosisBar({ t, playing, onPlay, onStep, onScrub, labels, onLabels }) {
    const fill = `${(t / PHASE_COUNT) * 100}%`;
    return (
        <>
            <button className="btn btn-icon" onClick={() => onStep(-1)} aria-label="Предыдущая фаза">⏮</button>
            <button className="btn btn-primary bio-play" onClick={onPlay}>{playing ? '⏸ Пауза' : '▶ Смотреть'}</button>
            <button className="btn btn-icon" onClick={() => onStep(1)} aria-label="Следующая фаза">⏭</button>
            <input className="bio-time" type="range" min="0" max={PHASE_COUNT - 0.01} step="0.01" value={t}
                style={{ '--fill': fill }} onChange={e => onScrub(parseFloat(e.target.value))} aria-label="Ход деления" />
            <button className={`btn${labels ? ' active' : ''}`} aria-pressed={labels} onClick={onLabels}>Подписи</button>
        </>
    );
}
