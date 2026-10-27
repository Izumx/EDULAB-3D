// Panels of the «Тела» mode: solid list with size sliders (left), facts and formulas (right), fold controls (bottom).
import React from 'react';
import { Package, PackageOpen } from 'lucide-react';
import { SOLIDS, describeFaces, fmt } from './solids';

export function SolidList({ solid, onPick, params, onParam }) {
    return (
        <div className="panel math-list-panel">
            <div className="panel-title">Тело</div>
            <div className="math-solids">
                {SOLIDS.map(s => (
                    <button key={s.id} className={`btn math-solid${s.id === solid.id ? ' active' : ''}`} onClick={() => onPick(s.id)}
                        aria-label={s.name}>{s.short}</button>
                ))}
            </div>
            <div className="panel-title math-size-title">Размеры</div>
            {solid.params.map(p => (
                <label key={p.id} className="math-slider">
                    <span className="math-slider-head"><span>{p.label}</span><b>{fmt(params[p.id], 1)}</b></span>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.id]}
                        style={{ '--fill': `${((params[p.id] - p.min) / (p.max - p.min)) * 100}%` }}
                        onChange={e => onParam(p.id, parseFloat(e.target.value))} />
                </label>
            ))}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="math-stat">
            <b>{value}</b>
            <span>{label}</span>
        </div>
    );
}

export function SolidCard({ solid, params, poly }) {
    const v = solid.V(params);
    const s = solid.S(params);
    return (
        <div className="panel math-card" key={solid.id}>
            <h2>{solid.name}</h2>
            <div className="math-kind">{solid.group}</div>
            {poly ? (
                <>
                    <div className="math-stats">
                        <Stat label="вершин" value={poly.stats.V} />
                        <Stat label="рёбер" value={poly.stats.E} />
                        <Stat label="граней" value={poly.stats.F} />
                    </div>
                    <div className="math-euler">
                        <span className="muted">Формула Эйлера: </span>
                        В − Р + Г = {poly.stats.V} − {poly.stats.E} + {poly.stats.F} = <b>{poly.stats.V - poly.stats.E + poly.stats.F}</b>
                    </div>
                    <div className="math-faces muted">Грани: {describeFaces(poly.verts, poly.faces)}</div>
                </>
            ) : (
                <div className="math-faces muted">{solid.counts.join(' · ')}</div>
            )}
            <div className="math-formula">
                <div className="math-formula-title">Объём</div>
                <div className="math-formula-main">{solid.formV}</div>
                <div className="math-formula-calc">= {solid.calcV(params)} = <b>{fmt(v)}</b> ед.³</div>
            </div>
            <div className="math-formula">
                <div className="math-formula-title">Площадь поверхности</div>
                <div className="math-formula-main">{solid.formS}</div>
                <div className="math-formula-calc">= {solid.calcS(params)} = <b>{fmt(s)}</b> ед.²</div>
            </div>
            <p className="math-note">{solid.note}</p>
        </div>
    );
}

export function SolidBar({ poly, fold, onFold, onScrub, edges, onEdges, numbers, onNumbers, onZoom }) {
    return (
        <>
            <button className="btn btn-icon math-zoom" onClick={() => onZoom(1.18)} aria-label="Отдалить">−</button>
            <button className="btn btn-icon math-zoom" onClick={() => onZoom(0.85)} aria-label="Приблизить">+</button>
            {poly ? (
                <>
                    <button className="btn btn-primary math-fold" onClick={() => onFold(fold > 0.5 ? 0 : 1)}>
                        {fold > 0.5 ? <><PackageOpen /> Развернуть</> : <><Package /> Свернуть</>}
                    </button>
                    <input className="math-range" type="range" min="0" max="1" step="0.01" value={1 - fold} aria-label="Развёртка"
                        style={{ '--fill': `${(1 - fold) * 100}%` }} onChange={e => onScrub(1 - parseFloat(e.target.value))} />
                </>
            ) : (
                <span className="chip math-chip">У тел вращения нет развёртки из плоских граней</span>
            )}
            <button className={`btn${edges ? ' active' : ''}`} aria-pressed={edges} onClick={onEdges}>{poly ? 'Рёбра' : 'Сетка'}</button>
            {poly && <button className={`btn${numbers ? ' active' : ''}`} aria-pressed={numbers} onClick={onNumbers}>Номера</button>}
        </>
    );
}
