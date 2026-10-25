// Cosmos lab: an interactive solar system for classroom lessons (hand + mouse control).
import React, { useCallback, useRef, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import { LabCanvas } from '../../ui/three';
import { useHandStatus } from '../../hand/handStore';
import SolarScene from './SolarScene';
import { InfoCard, IntroCard, RealScaleCard } from './InfoCard';
import { BAR_BODIES, BODY_BY_ID, SPEEDS } from './bodies';
import { textureUrl } from './textures';
import './cosmos.css';

const CAMERA = { position: [0, 30, 80], fov: 50, near: 0.05, far: 5000 };

export default function CosmosLab({ onBack }) {
    const [selectedId, setSelectedId] = useState(null);
    const [flyKey, setFlyKey] = useState(0);
    const [speedIdx, setSpeedIdx] = useState(2);
    const [realScale, setRealScale] = useState(false);
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
            <button className={`btn${!realScale ? ' active' : ''}`} onClick={() => setRealScale(false)}>Наглядный масштаб</button>
            <button className={`btn${realScale ? ' active' : ''}`} onClick={() => setRealScale(true)}>Реальный масштаб</button>
        </div>
    );

    return (
        <LabShell title="Космос" subtitle="Солнечная система" icon="🪐" accent="var(--cosmos)" onBack={onBack}
            actions={scaleToggle}>
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
        </LabShell>
    );
}
