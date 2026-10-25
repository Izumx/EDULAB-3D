// Cosmos lab: an interactive solar system for classroom lessons (hand + mouse control).
import React, { useCallback, useRef, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import { LabCanvas } from '../../ui/three';
import { useHandStatus } from '../../hand/handStore';
import SolarScene from './SolarScene';
import MoonScene, { MoonIcon, MoonView } from './MoonScene';
import { MOON_FACTS, MOON_PHASES, SYNODIC, angleOfDay, formatDay, litFraction, phaseDay, phaseIndex } from './moon';
import { InfoCard, IntroCard, RealScaleCard } from './InfoCard';
import { BAR_BODIES, BODY_BY_ID, SPEEDS } from './bodies';
import { textureUrl } from './textures';
import './cosmos.css';

const CAMERA = { position: [0, 30, 80], fov: 50, near: 0.05, far: 5000 };

export default function CosmosLab({ onBack }) {
    const [selectedId, setSelectedId] = useState(null);
    const [flyKey, setFlyKey] = useState(0);
    const [speedIdx, setSpeedIdx] = useState(2);
    const [mode, setMode] = useState('visual'); // 'visual' | 'real' | 'moon'
    const realScale = mode === 'real';
    const [moonDay, setMoonDay] = useState(phaseDay(2));
    const [moonGoto, setMoonGoto] = useState({ day: phaseDay(2) });
    const [moonPlaying, setMoonPlaying] = useState(false);
    const moonRef = useRef({ angle: angleOfDay(phaseDay(2)) });
    const moonPhase = phaseIndex(angleOfDay(moonDay));
    const gotoMoonPhase = useCallback(i => {
        setMoonPlaying(false);
        setMoonGoto({ day: phaseDay(i) });
    }, []);
    const { present } = useHandStatus();
    const rig = useRef({ zoomSeq: 0, zoomDir: 0 });
    const hud = useRef({ date: null });

    const select = useCallback(id => {
        setSelectedId(id);
        setFlyKey(n => n + 1);
    }, []);

    const zoom = dir => {
        rig.current.zoomDir = dir;
        rig.current.zoomSeq++;
    };

    const selected = selectedId ? BODY_BY_ID[selectedId] : null;
    const speed = SPEEDS[speedIdx];

    const scaleToggle = (
        <div className="cosmos-seg" role="group" aria-label="Масштаб">
            <button className={`btn${mode === 'visual' ? ' active' : ''}`} onClick={() => setMode('visual')}>Наглядный масштаб</button>
            <button className={`btn${mode === 'real' ? ' active' : ''}`} onClick={() => setMode('real')}>Реальный масштаб</button>
            <button className={`btn${mode === 'moon' ? ' active' : ''}`} onClick={() => setMode('moon')}>Фазы Луны</button>
        </div>
    );

    return (
        <LabShell title="Космос" subtitle={mode === 'moon' ? 'Фазы Луны' : 'Солнечная система'} icon="🪐" accent="var(--cosmos)" onBack={onBack}
            actions={scaleToggle}>
            {mode === 'moon' ? (
                <>
            <LabCanvas camera={CAMERA} lights={false}>
                <MoonScene playing={moonPlaying} goto={moonGoto} onProgress={setMoonDay} onPick={gotoMoonPhase}
                    moonRef={moonRef} phase={moonPhase} showLabels />
            </LabCanvas>

            <aside className="lab-left cosmos-left">
                <div className="panel">
                    <div className="panel-title">Лунный месяц</div>
                    <button className="btn btn-primary moon-play" onClick={() => setMoonPlaying(p => !p)}>
                        {moonPlaying ? '⏸ Пауза' : '▶ Запустить'}
                    </button>
                    <label className="moon-day">
                        <span className="muted">День месяца</span>
                        <b>{formatDay(moonDay)} <small>из {formatDay(SYNODIC)}</small></b>
                        <input className="moon-range" type="range" min="0" max={SYNODIC - 0.01} step="0.05" value={moonDay}
                            style={{ '--fill': `${(moonDay / SYNODIC) * 100}%` }}
                            onChange={e => { setMoonPlaying(false); setMoonGoto({ day: parseFloat(e.target.value) }); }} />
                    </label>
                    <div className="moon-lit">
                        <span className="muted">Освещено диска</span>
                        <b>{Math.round(litFraction(angleOfDay(moonDay)) * 100)} %</b>
                    </div>
                    <p className="cosmos-note">Вид сверху, со стороны Северного полюса. Размеры и расстояния не в масштабе.</p>
                </div>
            </aside>

            <aside className="lab-right cosmos-right">
                <div className="panel cosmos-card moon-card" key={moonPhase}>
                    <h2>{MOON_PHASES[moonPhase].name}</h2>
                    <div className="moon-view-title">Так Луна видна с Земли</div>
                    <MoonView moonRef={moonRef} />
                    <p className="moon-text">{MOON_PHASES[moonPhase].text}</p>
                    <p className="cosmos-fact"><span aria-hidden="true">💡 </span>{MOON_FACTS[moonPhase % MOON_FACTS.length]}</p>
                </div>
            </aside>

            <nav className="lab-bottom cosmos-bar" aria-label="Фазы Луны">
                {MOON_PHASES.map((p, i) => (
                    <button key={p.name} className={`cosmos-planet moon-phase-btn${moonPhase === i ? ' active' : ''}`} onClick={() => gotoMoonPhase(i)}>
                        <MoonIcon index={i} size={44} />
                        <span className="cosmos-planet-name">{p.short}</span>
                    </button>
                ))}
            </nav>
                </>
            ) : (
                <>
            <LabCanvas camera={CAMERA} lights={false}>
                <SolarScene selectedId={selectedId} flyKey={flyKey} speedDays={speed.days} realScale={realScale}
                    onSelect={select} rig={rig} hud={hud} />
            </LabCanvas>

            <aside className="lab-left cosmos-left">
                <div className="panel">
                    <div className="panel-title">Движение планет</div>
                    <div className="cosmos-speed">
                        {SPEEDS.map((s, i) => (
                            <button key={s.id} className={`btn${i === speedIdx ? ' active' : ''}`} onClick={() => setSpeedIdx(i)}
                                aria-label={s.id === 'pause' ? 'Пауза' : `Скорость ${s.label}`}>
                                {s.icon ?? s.label}
                            </button>
                        ))}
                    </div>
                    <div className="cosmos-speed-info">
                        {speed.days ? `1 секунда = ${speed.days} земных суток` : 'Движение остановлено'}
                    </div>
                    <div className="cosmos-date">
                        <span className="muted">Дата:</span> <span ref={el => { hud.current.date = el; }} />
                    </div>
                </div>
                <div className="panel">
                    <div className="panel-title">Камера</div>
                    <div className="cosmos-cam">
                        <button className="btn btn-icon cosmos-zoom" onClick={() => zoom(-1)} aria-label="Отдалить">−</button>
                        <button className={`btn${!selectedId ? ' active' : ''}`} onClick={() => select(null)}>Обзор</button>
                        <button className="btn btn-icon cosmos-zoom" onClick={() => zoom(1)} aria-label="Приблизить">+</button>
                    </div>
                </div>
                <div className="cosmos-credit">Текстуры: Solar System Scope, CC BY 4.0</div>
            </aside>

            <aside className="lab-right cosmos-right">
                {selected
                    ? <InfoCard key={selected.id} body={selected} onClose={() => select(null)} onSelect={select} />
                    : realScale ? <RealScaleCard /> : <IntroCard handPresent={present} />}
            </aside>

            <nav className="lab-bottom cosmos-bar" aria-label="Планеты">
                {BAR_BODIES.map(b => (
                    <button key={b.id} className={`cosmos-planet${selectedId === b.id ? ' active' : ''}`}
                        onClick={() => select(b.id)} style={{ '--body-color': b.color }}>
                        <span className="cosmos-planet-ball" style={{ backgroundImage: `url(${textureUrl(b.texture)})` }} />
                        <span className="cosmos-planet-name">{b.name}</span>
                    </button>
                ))}
            </nav>
                </>
            )}
        </LabShell>
    );
}
