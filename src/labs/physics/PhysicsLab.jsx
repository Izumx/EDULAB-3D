// Physics lab: gravity and motion. Grab, drop and throw bodies in a room; switch planets; repeat Galileo's experiment.
import React, { useCallback, useEffect, useState } from 'react';
import { LabShell } from '../../ui/LabShell';
import { PhysicsStage } from './PhysicsScene';
import { PRESETS, OBJECTS, BODY_INDEX, GALILEO_HEIGHT, EARTH_G } from './data';
import { resetWorld, setParams, selectBody, startGalileo } from './engine';
import './physics.css';

const G_MAX = 30;

// Russian number format: comma as the decimal separator
function fmt(x, d = 2) {
    const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
    return v.toFixed(d).replace('.', ',');
}

function ratioText(g) {
    if (g < 0.05) return 'g = 0: тела не падают — невесомость.';
    const r = g / EARTH_G;
    if (Math.abs(r - 1) < 0.03) return 'Почти как на Земле.';
    return r > 1
        ? `Это в ${fmt(r, 1)} раза больше, чем на Земле: тела падают быстрее, брошенный мяч летит ниже и ближе.`
        : `Это в ${fmt(1 / r, 1)} раза меньше, чем на Земле: тела падают медленнее, брошенный мяч летит выше и дальше.`;
}

function GravityPanel({ presetId, g, drag, onPreset, onG, onDrag }) {
    const fill = `${(g / G_MAX) * 100}%`;
    return (
        <div className="panel">
            <div className="panel-title">Сила тяжести</div>
            <div className="phys-presets">
                {PRESETS.map((p) => (
                    <button
                        key={p.id}
                        className={`btn phys-preset${presetId === p.id ? ' active' : ''}`}
                        onClick={() => onPreset(p)}
                    >
                        <span className="phys-preset-icon" aria-hidden="true">{p.icon}</span>
                        <span className="phys-preset-name">{p.name}</span>
                        <span className="phys-preset-g">{fmt(p.g, 1)} м/с²</span>
                    </button>
                ))}
            </div>
            <label className="phys-g-row">
                <span className="phys-g-head">
                    <span className="phys-g-label">Ускорение</span>
                    <span className="phys-g-value">g = {fmt(g, 1)} <small>м/с²</small></span>
                </span>
                <input
                    className="phys-range"
                    type="range" min="0" max={G_MAX} step="0.1"
                    value={g}
                    style={{ '--fill': fill }}
                    onChange={(e) => onG(parseFloat(e.target.value))}
                />
            </label>
            <button className={`btn phys-toggle${drag ? ' on' : ''}`} aria-pressed={drag} onClick={onDrag}>
                <span>💨 Сопротивление воздуха</span>
                <span className="phys-switch" aria-hidden="true"><span /></span>
            </button>
        </div>
    );
}

function InfoPanel({ preset, g }) {
    return (
        <div className="panel phys-info">
            <h3>{preset ? `${preset.icon} ${preset.name}` : '🎚️ Своё значение g'}</h3>
            <p>{preset ? preset.text : ratioText(g)}</p>
        </div>
    );
}

function Metric({ label, value, unit }) {
    return (
        <div className="phys-metric">
            <span className="phys-metric-label">{label}</span>
            <span className="phys-metric-value">{value}<small> {unit}</small></span>
        </div>
    );
}

function MeasureBar({ readout, selected }) {
    const def = OBJECTS[selected];
    const sel = readout?.sel;
    const shot = readout?.shot;
    return (
        <div className="panel phys-measure">
            <div className="phys-measure-row">
                <div className="phys-object">
                    <span className="phys-object-name">{def.name}</span>
                    <span className="chip">m = {def.massLabel}</span>
                </div>
                <Metric label="Скорость" value={fmt(sel?.v ?? 0, 1)} unit="м/с" />
                <Metric label="Высота" value={fmt(sel?.h ?? 0)} unit="м" />
            </div>
            <div className="phys-shot">
                <div className="phys-shot-title">
                    {shot ? `Последний бросок: ${OBJECTS[shot.body].name.toLowerCase()}` : 'Бросьте предмет — появятся данные полёта'}
                </div>
                {shot && (
                    <div className="phys-shot-grid">
                        <div><span>Время</span><b>{fmt(shot.flight)} с{shot.active ? '…' : ''}</b></div>
                        <div><span>Высота</span><b>{fmt(shot.maxH)} м</b></div>
                        <div><span>Дальность</span><b>{fmt(shot.range)} м</b></div>
                    </div>
                )}
            </div>
            <div className="phys-legend">
                <span><i className="phys-dot" /> 0,1 с</span>
                <span><i className="phys-arrow" /> скорость</span>
                <span>✊ Возьмите предмет рукой или мышью — и бросьте</span>
                <span>Размеры предметов увеличены; массы и воздух — настоящие</span>
            </div>
        </div>
    );
}

function TimeBar({ label, t, max, color, falling }) {
    const done = t >= 0;
    const w = done && max > 0 ? Math.max(4, (t / max) * 100) : 0;
    return (
        <div className="phys-bar">
            <div className="phys-bar-head">
                <span>{label}</span>
                <b>{done ? `${fmt(t)} с` : falling ? 'падает…' : 'не упало'}</b>
            </div>
            <div className="phys-bar-track"><div style={{ width: `${w}%`, background: color }} /></div>
        </div>
    );
}

function galileoSummary(gal, g, rho, drag) {
    const gUsed = gal && gal.phase !== 'hold' ? gal.g : g;
    const theory = gUsed > 0.01 ? Math.sqrt((2 * GALILEO_HEIGHT) / gUsed) : null;
    const done = gal?.phase === 'done';
    const falling = gal?.phase === 'fall' || gal?.phase === 'hold';
    const max = gal ? Math.max(gal.tBall, gal.tFeather) : 0;
    let conclusion = null;
    if (done) {
        if (gal.g < 0.01) conclusion = 'В невесомости тела не падают: g = 0.';
        else if (gal.air) conclusion = 'В воздухе перо падает гораздо медленнее: сила сопротивления воздуха для него сравнима с силой тяжести.';
        else conclusion = 'Без сопротивления воздуха перо и шар падают одновременно: ускорение свободного падения не зависит от массы тела.';
    }
    return { theory, done, falling, max, conclusion, canToggleAir: rho > 0, air: rho > 0 && drag };
}

function GalileoPanel({ gal, g, rho, drag, onStart, onRepeat }) {
    const { done, canToggleAir } = galileoSummary(gal, g, rho, drag);
    return (
        <div className="panel">
            <div className="panel-title">Опыт Галилея</div>
            <p className="phys-text">Перо и шар отпускают одновременно с высоты {GALILEO_HEIGHT} м.</p>
            <button className="btn btn-primary phys-big" onClick={onStart} disabled={gal?.phase === 'hold'}>
                🪶 Перо и шар
            </button>
            <p className="phys-note">
                Сейчас: {!canToggleAir ? 'воздуха нет' : drag ? 'в воздухе' : 'без воздуха (как в вакууме)'}
            </p>
            {done && canToggleAir && gal.g > 0.01 && (
                <button className="btn phys-wide" onClick={onRepeat}>
                    {gal.air ? '🔁 Повторить без воздуха' : '🔁 Повторить в воздухе'}
                </button>
            )}
        </div>
    );
}

// The result of the experiment is shown on the "board" at the bottom, where the whole class can see it
function GalileoResult({ gal, g, rho, drag, onClose }) {
    const { theory, falling, max, conclusion } = galileoSummary(gal, g, rho, drag);
    return (
        <div className="panel phys-result">
            <div className="phys-info-head">
                <h3>🪶 Опыт Галилея: что упадёт первым?</h3>
                <button className="btn btn-small" onClick={onClose}>Скрыть</button>
            </div>
            <div className="phys-bars">
                <TimeBar label="🎳 Шар (7 кг)" t={gal.tBall} max={max} color="var(--phys)" falling={falling} />
                <TimeBar label="🪶 Перо (0,5 г)" t={gal.tFeather} max={max} color="#7dd3fc" falling={falling} />
            </div>
            {theory && <p className="phys-foot">Расчёт без воздуха: t = √(2h/g) = {fmt(theory)} с</p>}
            {conclusion && <p className="phys-conclusion">{conclusion}</p>}
        </div>
    );
}

export default function PhysicsLab({ onBack }) {
    const [presetId, setPresetId] = useState('earth');
    const [g, setG] = useState(9.8);
    const [rho, setRho] = useState(1.2);
    const [drag, setDrag] = useState(true);
    const [slow, setSlow] = useState(false);
    const [selected, setSelected] = useState(BODY_INDEX.basketball);
    const [readout, setReadout] = useState(null);
    const [galHidden, setGalHidden] = useState(false);

    const preset = PRESETS.find((p) => p.id === presetId) ?? null;

    useEffect(() => { resetWorld(); }, []);
    useEffect(() => { setParams({ g, rho, drag, timeScale: slow ? 0.25 : 1 }); }, [g, rho, drag, slow]);
    useEffect(() => { selectBody(selected); }, [selected]);

    const onSelect = useCallback((i) => setSelected(i), []);

    const choosePreset = (p) => {
        setPresetId(p.id);
        setG(p.g);
        setRho(p.rho);
    };

    const changeG = (v) => {
        setG(v);
        setPresetId(PRESETS.find((p) => Math.abs(p.g - v) < 0.05)?.id ?? 'custom');
    };

    const runGalileo = () => {
        setGalHidden(false);
        startGalileo();
        setSelected(BODY_INDEX.bowling);
    };

    const repeatGalileo = () => {
        const next = !readout?.gal?.air;
        setDrag(next);
        setParams({ drag: next });
        runGalileo();
    };

    const reset = () => {
        resetWorld();
        setSelected(BODY_INDEX.basketball);
    };

    return (
        <LabShell
            title="Физика"
            subtitle="Сила тяжести и движение тел"
            icon="🍎"
            accent="var(--phys)"
            onBack={onBack}
            actions={(
                <>
                    <button className={`btn${slow ? ' active' : ''}`} onClick={() => setSlow((s) => !s)}>
                        🐢 Замедление ×0,25
                    </button>
                    <button className="btn" onClick={reset}>↺ Заново</button>
                </>
            )}
        >
            <PhysicsStage tint={preset?.tint ?? '#c8d6ff'} g={g} selected={selected} onSelect={onSelect} onReadout={setReadout} />

            <aside className="lab-left phys-side">
                <GravityPanel
                    presetId={presetId} g={g} drag={drag}
                    onPreset={choosePreset} onG={changeG} onDrag={() => setDrag((d) => !d)}
                />
            </aside>

            <aside className="lab-right phys-side">
                <InfoPanel preset={preset} g={g} />
                <GalileoPanel gal={readout?.gal} g={g} rho={rho} drag={drag} onStart={runGalileo} onRepeat={repeatGalileo} />
            </aside>

            <div className="lab-bottom phys-bottom">
                {readout?.gal && !galHidden
                    ? <GalileoResult gal={readout.gal} g={g} rho={rho} drag={drag} onClose={() => setGalHidden(true)} />
                    : <MeasureBar readout={readout} selected={selected} />}
            </div>
        </LabShell>
    );
}
